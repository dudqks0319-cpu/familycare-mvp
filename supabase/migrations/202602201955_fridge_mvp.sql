create table if not exists public.fridge_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  ingredient_name text not null,
  category text not null default '기타',
  quantity_text text,
  expires_on date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fridge_items_ingredient_name_not_blank check (char_length(trim(ingredient_name)) > 0)
);

create index if not exists idx_fridge_items_owner_id on public.fridge_items(owner_id);
create index if not exists idx_fridge_items_expires_on on public.fridge_items(expires_on);

alter table public.fridge_items enable row level security;

drop policy if exists fridge_items_select_own on public.fridge_items;
create policy fridge_items_select_own
  on public.fridge_items
  for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists fridge_items_insert_own on public.fridge_items;
create policy fridge_items_insert_own
  on public.fridge_items
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists fridge_items_update_own on public.fridge_items;
create policy fridge_items_update_own
  on public.fridge_items
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists fridge_items_delete_own on public.fridge_items;
create policy fridge_items_delete_own
  on public.fridge_items
  for delete
  to authenticated
  using (auth.uid() = owner_id);

create table if not exists public.fridge_recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  difficulty text not null default 'easy',
  required_ingredients text[] not null default '{}'::text[],
  optional_ingredients text[] not null default '{}'::text[],
  substitute_map jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}'::text[],
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  constraint fridge_recipes_name_not_blank check (char_length(trim(name)) > 0),
  constraint fridge_recipes_difficulty_valid check (difficulty in ('easy', 'normal', 'hard'))
);

create unique index if not exists uq_fridge_recipes_name on public.fridge_recipes(name);

alter table public.fridge_recipes enable row level security;

drop policy if exists fridge_recipes_select_public on public.fridge_recipes;
create policy fridge_recipes_select_public
  on public.fridge_recipes
  for select
  using (is_public = true);

insert into public.fridge_recipes (
  name,
  description,
  difficulty,
  required_ingredients,
  optional_ingredients,
  substitute_map,
  tags,
  is_public
)
values
  (
    '계란볶음밥',
    '냉장고 기본 재료로 10분 안에 만드는 한그릇 요리',
    'easy',
    array['밥', '계란', '대파'],
    array['간장', '참기름'],
    '{"대파": ["양파", "쪽파"], "간장": ["소금"]}'::jsonb,
    array['10분', '한그릇', '초간단'],
    true
  ),
  (
    '참치김치볶음밥',
    '신김치와 참치로 빠르게 만드는 볶음밥',
    'easy',
    array['밥', '김치', '참치캔'],
    array['대파', '고춧가루'],
    '{"참치캔": ["스팸", "닭가슴살"], "김치": ["깍두기"]}'::jsonb,
    array['한식', '잔반활용'],
    true
  ),
  (
    '된장찌개',
    '집에 있는 채소로 맞춤형으로 끓이는 기본 찌개',
    'normal',
    array['된장', '두부', '양파'],
    array['애호박', '감자', '대파'],
    '{"두부": ["순두부"], "애호박": ["가지"]}'::jsonb,
    array['국물', '한식', '저녁'],
    true
  ),
  (
    '카레라이스',
    '남은 채소를 넣어 만들기 좋은 기본 카레',
    'easy',
    array['카레가루', '양파', '감자'],
    array['당근', '돼지고기'],
    '{"돼지고기": ["닭고기", "참치캔"], "감자": ["고구마"]}'::jsonb,
    array['아이메뉴', '한그릇'],
    true
  ),
  (
    '오므라이스',
    '양파와 계란만 있어도 가능한 주말 메뉴',
    'normal',
    array['밥', '계란', '양파'],
    array['케첩', '버터'],
    '{"버터": ["식용유"], "케첩": ["토마토소스"]}'::jsonb,
    array['양식', '주말'],
    true
  ),
  (
    '김치찌개',
    '묵은지와 단백질만 있으면 완성되는 기본 찌개',
    'easy',
    array['김치', '돼지고기', '두부'],
    array['대파', '고춧가루'],
    '{"돼지고기": ["참치캔", "스팸"], "두부": ["순두부"]}'::jsonb,
    array['한식', '국물'],
    true
  ),
  (
    '두부조림',
    '두부와 양념장으로 만드는 기본 밑반찬',
    'easy',
    array['두부', '간장', '고춧가루'],
    array['대파', '다진마늘'],
    '{"고춧가루": ["고추장"], "대파": ["양파"]}'::jsonb,
    array['밑반찬', '한식'],
    true
  ),
  (
    '참치마요덮밥',
    '참치캔과 계란으로 만드는 초간단 덮밥',
    'easy',
    array['밥', '참치캔', '마요네즈'],
    array['계란', '김가루'],
    '{"마요네즈": ["요거트", "생략"], "참치캔": ["스팸"]}'::jsonb,
    array['한그릇', '초간단'],
    true
  )
on conflict (name) do update set
  description = excluded.description,
  difficulty = excluded.difficulty,
  required_ingredients = excluded.required_ingredients,
  optional_ingredients = excluded.optional_ingredients,
  substitute_map = excluded.substitute_map,
  tags = excluded.tags,
  is_public = excluded.is_public;
