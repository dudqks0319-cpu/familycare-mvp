-- FamilyCare MVP Day1 schema
-- 실행 위치: Supabase SQL Editor 또는 supabase migration

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'guardian' check (role in ('guardian', 'caregiver', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table if not exists public.care_recipients (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null,
  birth_date date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_recipients_updated_at
before update on public.care_recipients
for each row
execute function public.set_updated_at();

create table if not exists public.recipient_members (
  recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  relationship text,
  can_edit boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (recipient_id, user_id)
);

create table if not exists public.medication_schedules (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  medication_name text not null,
  dosage text not null,
  times_per_day int not null check (times_per_day > 0),
  instructions text,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_medication_schedules_updated_at
before update on public.medication_schedules
for each row
execute function public.set_updated_at();

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  checked_by uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('ok', 'warning', 'critical')),
  memo text,
  checked_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;
alter table public.care_recipients enable row level security;
alter table public.recipient_members enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.checkins enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "care_recipients_select_member"
on public.care_recipients
for select
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = care_recipients.id
      and rm.user_id = auth.uid()
  )
);

create policy "care_recipients_insert_owner"
on public.care_recipients
for insert
with check (created_by = auth.uid());

create policy "care_recipients_update_editor"
on public.care_recipients
for update
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = care_recipients.id
      and rm.user_id = auth.uid()
      and rm.can_edit = true
  )
)
with check (
  created_by = auth.uid()
  or exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = care_recipients.id
      and rm.user_id = auth.uid()
      and rm.can_edit = true
  )
);

create policy "recipient_members_select_related"
on public.recipient_members
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = recipient_members.recipient_id
      and cr.created_by = auth.uid()
  )
);

create policy "recipient_members_insert_owner"
on public.recipient_members
for insert
with check (
  exists (
    select 1
    from public.care_recipients cr
    where cr.id = recipient_members.recipient_id
      and cr.created_by = auth.uid()
  )
);

create policy "recipient_members_update_owner"
on public.recipient_members
for update
using (
  exists (
    select 1
    from public.care_recipients cr
    where cr.id = recipient_members.recipient_id
      and cr.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.care_recipients cr
    where cr.id = recipient_members.recipient_id
      and cr.created_by = auth.uid()
  )
);

create policy "recipient_members_delete_owner"
on public.recipient_members
for delete
using (
  exists (
    select 1
    from public.care_recipients cr
    where cr.id = recipient_members.recipient_id
      and cr.created_by = auth.uid()
  )
);

create policy "medication_select_member"
on public.medication_schedules
for select
using (
  exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = medication_schedules.recipient_id
      and rm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = medication_schedules.recipient_id
      and cr.created_by = auth.uid()
  )
);

create policy "medication_insert_editor"
on public.medication_schedules
for insert
with check (
  created_by = auth.uid()
  and (
    exists (
      select 1
      from public.recipient_members rm
      where rm.recipient_id = medication_schedules.recipient_id
        and rm.user_id = auth.uid()
        and rm.can_edit = true
    )
    or exists (
      select 1
      from public.care_recipients cr
      where cr.id = medication_schedules.recipient_id
        and cr.created_by = auth.uid()
    )
  )
);

create policy "medication_update_editor"
on public.medication_schedules
for update
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = medication_schedules.recipient_id
      and rm.user_id = auth.uid()
      and rm.can_edit = true
  )
)
with check (
  created_by = auth.uid()
  or exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = medication_schedules.recipient_id
      and rm.user_id = auth.uid()
      and rm.can_edit = true
  )
);

create policy "checkins_select_member"
on public.checkins
for select
using (
  exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = checkins.recipient_id
      and rm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = checkins.recipient_id
      and cr.created_by = auth.uid()
  )
);

create policy "checkins_insert_member"
on public.checkins
for insert
with check (
  checked_by = auth.uid()
  and (
    exists (
      select 1
      from public.recipient_members rm
      where rm.recipient_id = checkins.recipient_id
        and rm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.care_recipients cr
      where cr.id = checkins.recipient_id
        and cr.created_by = auth.uid()
    )
  )
);
