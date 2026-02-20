import type { ActivityCategory, CategoryMeta, FeedingType, PlannerTab } from "@/app/planner/types";

export const FEEDING_TYPE_LABEL: Record<FeedingType, string> = {
  breast_left: "모유(왼쪽)",
  breast_right: "모유(오른쪽)",
  formula: "분유",
  baby_food: "이유식",
};

export const STORAGE_KEY = "familycare_planner_v2";
export const LEGACY_STORAGE_KEYS = ["familycare_planner_v1"] as const;

export const CATEGORY_META: Record<ActivityCategory, CategoryMeta> = {
  meal: {
    label: "식사",
    color: "#0284c7",
    badgeClass: "bg-sky-100 text-sky-700",
    recipientTypes: ["child", "elder"],
  },
  snack: {
    label: "간식",
    color: "#f97316",
    badgeClass: "bg-orange-100 text-orange-700",
    recipientTypes: ["child"],
  },
  nap: {
    label: "수면/낮잠",
    color: "#8b5cf6",
    badgeClass: "bg-violet-100 text-violet-700",
    recipientTypes: ["child", "elder"],
  },
  diaper: {
    label: "기저귀",
    color: "#65a30d",
    badgeClass: "bg-lime-100 text-lime-700",
    recipientTypes: ["child"],
  },
  daycare_dropoff: {
    label: "어린이집 등원",
    color: "#10b981",
    badgeClass: "bg-emerald-100 text-emerald-700",
    recipientTypes: ["child"],
  },
  daycare_pickup: {
    label: "어린이집 하원",
    color: "#14b8a6",
    badgeClass: "bg-teal-100 text-teal-700",
    recipientTypes: ["child"],
  },
  medication: {
    label: "약 복용",
    color: "#ec4899",
    badgeClass: "bg-pink-100 text-pink-700",
    recipientTypes: ["child", "elder"],
  },
  temperature: {
    label: "체온",
    color: "#f59e0b",
    badgeClass: "bg-amber-100 text-amber-700",
    recipientTypes: ["child", "elder"],
  },
  hospital: {
    label: "병원 방문",
    color: "#ef4444",
    badgeClass: "bg-rose-100 text-rose-700",
    recipientTypes: ["child", "elder"],
  },
  vaccine_shot: {
    label: "접종 완료",
    color: "#6366f1",
    badgeClass: "bg-indigo-100 text-indigo-700",
    recipientTypes: ["child"],
  },
  vaccine_booking: {
    label: "접종 예약",
    color: "#a855f7",
    badgeClass: "bg-purple-100 text-purple-700",
    recipientTypes: ["child"],
  },
};

export const PLANNER_TABS: Array<{ id: PlannerTab; label: string }> = [
  { id: "today", label: "오늘" },
  { id: "record", label: "기록" },
  { id: "health", label: "건강" },
  { id: "schedule", label: "일정" },
  { id: "report", label: "리포트" },
];

export const VACCINE_HELP: Record<string, string> = {
  BCG: "결핵 예방. 생후 초기 1회 접종 권장",
  "DTaP-IPV": "디프테리아/파상풍/백일해/소아마비 예방",
  MMR: "홍역/유행성이하선염/풍진 예방",
  VAR: "수두 예방 접종",
  HepA: "A형 간염 예방",
  Influenza: "독감 예방. 유행 시기 전 접종 권장",
};

export const EMPTY_CATEGORY_COUNTS: Record<ActivityCategory, number> = {
  meal: 0,
  snack: 0,
  nap: 0,
  diaper: 0,
  daycare_dropoff: 0,
  daycare_pickup: 0,
  medication: 0,
  temperature: 0,
  hospital: 0,
  vaccine_shot: 0,
  vaccine_booking: 0,
};
