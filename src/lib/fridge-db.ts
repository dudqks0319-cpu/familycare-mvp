import "server-only";

import { randomUUID } from "node:crypto";

import type { AuthSession } from "@/lib/auth-session";
import { assertSupabaseConfigured } from "@/lib/supabase-rest";

type SupabaseErrorPayload = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
  error?: string;
  error_description?: string;
};

type RequestMethod = "GET" | "POST" | "PATCH" | "DELETE";

type SupabaseRequestOptions = {
  method?: RequestMethod;
  query?: Record<string, string | undefined>;
  body?: unknown;
  prefer?: string;
};

export type FridgeItem = {
  id: string;
  owner_id: string;
  ingredient_name: string;
  category: string;
  quantity_text: string | null;
  expires_on: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type FridgeRecipe = {
  id: string;
  name: string;
  description: string;
  difficulty: "easy" | "normal" | "hard";
  required_ingredients: string[];
  optional_ingredients: string[];
  substitute_map: Record<string, string[] | string> | null;
  tags: string[];
  is_public: boolean;
  created_at: string;
};

export type RecipeRecommendation = {
  recipe: FridgeRecipe;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchRate: number;
};

export type FridgeDashboardData = {
  items: FridgeItem[];
  recommendations: RecipeRecommendation[];
};

function getSupabaseErrorMessage(payload: SupabaseErrorPayload | null): string {
  if (!payload) {
    return "Supabase 요청 중 오류가 발생했습니다.";
  }

  return (
    payload.message
    ?? payload.error_description
    ?? payload.error
    ?? payload.details
    ?? payload.hint
    ?? "Supabase 요청 중 오류가 발생했습니다."
  );
}

async function supabaseRequest<T>(
  session: AuthSession,
  table: string,
  options: SupabaseRequestOptions = {},
): Promise<T> {
  const { url, anonKey } = assertSupabaseConfigured();
  const requestUrl = new URL(`${url}/rest/v1/${table}`);

  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    if (typeof value === "string" && value.length > 0) {
      requestUrl.searchParams.set(key, value);
    }
  });

  const method = options.method ?? "GET";

  const headers: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${session.accessToken}`,
  };

  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    headers.Prefer = options.prefer ?? "return=representation";
  }

  const response = await fetch(requestUrl, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (response.status === 204) {
    return [] as T;
  }

  const payload = (await response.json().catch(() => null)) as
    | T
    | SupabaseErrorPayload
    | null;

  if (!response.ok) {
    throw new Error(getSupabaseErrorMessage(payload as SupabaseErrorPayload | null));
  }

  return (payload ?? []) as T;
}

function normalizeIngredientName(value: string): string {
  return value.trim().toLowerCase().replaceAll(" ", "");
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function buildRecommendations(items: FridgeItem[], recipes: FridgeRecipe[]): RecipeRecommendation[] {
  const availableSet = new Set(
    items.map((item) => normalizeIngredientName(item.ingredient_name)),
  );

  const recommended = recipes
    .map((recipe) => {
      const required = toStringArray(recipe.required_ingredients);
      const matchedIngredients = required.filter((ingredient) =>
        availableSet.has(normalizeIngredientName(ingredient)),
      );
      const missingIngredients = required.filter(
        (ingredient) => !availableSet.has(normalizeIngredientName(ingredient)),
      );

      const denominator = required.length === 0 ? 1 : required.length;
      const matchRate = matchedIngredients.length / denominator;

      return {
        recipe,
        matchedIngredients,
        missingIngredients,
        matchRate,
      } satisfies RecipeRecommendation;
    })
    .filter((recommendation) => recommendation.matchRate >= 0.5)
    .sort((a, b) => {
      if (a.missingIngredients.length !== b.missingIngredients.length) {
        return a.missingIngredients.length - b.missingIngredients.length;
      }

      if (a.matchRate !== b.matchRate) {
        return b.matchRate - a.matchRate;
      }

      return a.recipe.name.localeCompare(b.recipe.name, "ko");
    });

  if (recommended.length > 0) {
    return recommended.slice(0, 8);
  }

  return recipes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .slice(0, 8)
    .map((recipe) => ({
      recipe,
      matchedIngredients: [],
      missingIngredients: toStringArray(recipe.required_ingredients),
      matchRate: 0,
    } satisfies RecipeRecommendation));
}

export async function getFridgeDashboardData(
  session: AuthSession,
): Promise<FridgeDashboardData> {
  const [items, recipes] = await Promise.all([
    supabaseRequest<FridgeItem[]>(session, "fridge_items", {
      query: {
        select: "*",
        owner_id: `eq.${session.userId}`,
        order: "expires_on.asc.nullslast,created_at.desc",
      },
    }),
    supabaseRequest<FridgeRecipe[]>(session, "fridge_recipes", {
      query: {
        select: "*",
        is_public: "eq.true",
        order: "name.asc",
      },
    }),
  ]);

  return {
    items,
    recommendations: buildRecommendations(items, recipes),
  };
}

export async function createFridgeItem(
  session: AuthSession,
  params: {
    ingredientName: string;
    category: string;
    quantityText: string;
    expiresOn: string;
    note: string;
  },
): Promise<FridgeItem> {
  const ingredientName = params.ingredientName.trim();

  if (ingredientName.length === 0) {
    throw new Error("식재료 이름을 입력해 주세요.");
  }

  const category = params.category.trim() || "기타";
  const expiresOn = params.expiresOn.trim();

  const payload = await supabaseRequest<FridgeItem[]>(session, "fridge_items", {
    method: "POST",
    body: {
      id: randomUUID(),
      owner_id: session.userId,
      ingredient_name: ingredientName,
      category,
      quantity_text: params.quantityText.trim() || null,
      expires_on: expiresOn.length > 0 ? expiresOn : null,
      note: params.note.trim() || null,
    },
    prefer: "return=representation",
  });

  const inserted = payload[0];

  if (!inserted) {
    throw new Error("식재료 저장에 실패했습니다.");
  }

  return inserted;
}

export async function deleteFridgeItem(
  session: AuthSession,
  itemId: string,
): Promise<void> {
  const normalized = itemId.trim();

  if (normalized.length === 0) {
    throw new Error("삭제할 식재료 ID가 비어 있습니다.");
  }

  await supabaseRequest<FridgeItem[]>(session, "fridge_items", {
    method: "DELETE",
    query: {
      id: `eq.${normalized}`,
      owner_id: `eq.${session.userId}`,
    },
    prefer: "return=minimal",
  });
}
