-- FamilyCare MVP Week2 additions

create table if not exists public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  schedule_id uuid references public.medication_schedules(id) on delete set null,
  status text not null check (status in ('taken', 'skipped')),
  memo text,
  logged_by uuid not null references auth.users(id) on delete restrict,
  logged_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.medication_logs enable row level security;

create index if not exists idx_recipient_members_user_id
  on public.recipient_members(user_id);

create index if not exists idx_medication_schedules_recipient_id
  on public.medication_schedules(recipient_id);

create index if not exists idx_checkins_recipient_id_checked_at
  on public.checkins(recipient_id, checked_at desc);

create index if not exists idx_medication_logs_recipient_id_logged_at
  on public.medication_logs(recipient_id, logged_at desc);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', null),
    'guardian'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

drop policy if exists "medication_logs_select_member" on public.medication_logs;
create policy "medication_logs_select_member"
on public.medication_logs
for select
using (
  exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = medication_logs.recipient_id
      and rm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = medication_logs.recipient_id
      and cr.created_by = auth.uid()
  )
);

drop policy if exists "medication_logs_insert_member" on public.medication_logs;
create policy "medication_logs_insert_member"
on public.medication_logs
for insert
with check (
  logged_by = auth.uid()
  and (
    exists (
      select 1
      from public.recipient_members rm
      where rm.recipient_id = medication_logs.recipient_id
        and rm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.care_recipients cr
      where cr.id = medication_logs.recipient_id
        and cr.created_by = auth.uid()
    )
  )
);
