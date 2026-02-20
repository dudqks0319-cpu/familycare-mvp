-- Care Planner 도메인 확장 (영유아/어르신 맞춤 기록)

alter table public.care_recipients
  add column if not exists recipient_type text not null default 'child'
    check (recipient_type in ('child', 'elder'));

alter table public.care_recipients
  add column if not exists age_months int
    check (age_months is null or age_months >= 0);

create table if not exists public.care_activity_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  logged_by uuid not null references auth.users(id) on delete restrict,
  category text not null check (
    category in (
      'meal',
      'snack',
      'nap',
      'daycare_dropoff',
      'daycare_pickup',
      'medication',
      'hospital',
      'vaccine_shot',
      'vaccine_booking'
    )
  ),
  title text not null,
  notes text,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_care_activity_logs_recipient_occurred_at
  on public.care_activity_logs (recipient_id, occurred_at desc);

create index if not exists idx_care_activity_logs_category
  on public.care_activity_logs (category);

create table if not exists public.care_appointments (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  kind text not null check (kind in ('hospital', 'vaccine')),
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_care_appointments_updated_at on public.care_appointments;
create trigger trg_care_appointments_updated_at
before update on public.care_appointments
for each row
execute function public.set_updated_at();

create index if not exists idx_care_appointments_recipient_scheduled_at
  on public.care_appointments (recipient_id, scheduled_at asc);

create index if not exists idx_care_appointments_kind
  on public.care_appointments (kind);

create table if not exists public.vaccine_records (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  appointment_id uuid references public.care_appointments(id) on delete set null,
  vaccine_name text not null,
  vaccinated_on date not null,
  note text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_vaccine_records_recipient_vaccinated_on
  on public.vaccine_records (recipient_id, vaccinated_on desc);

create table if not exists public.care_schedule_templates (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  schedule_type text not null check (schedule_type in ('weekday', 'weekend')),
  time_of_day time not null,
  label text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_care_schedule_templates_updated_at on public.care_schedule_templates;
create trigger trg_care_schedule_templates_updated_at
before update on public.care_schedule_templates
for each row
execute function public.set_updated_at();

create unique index if not exists idx_care_schedule_templates_unique_item
  on public.care_schedule_templates (recipient_id, schedule_type, time_of_day, label);

create index if not exists idx_care_schedule_templates_recipient_type_time
  on public.care_schedule_templates (recipient_id, schedule_type, time_of_day asc);

alter table public.care_activity_logs enable row level security;
alter table public.care_appointments enable row level security;
alter table public.vaccine_records enable row level security;
alter table public.care_schedule_templates enable row level security;

-- care_activity_logs policies

drop policy if exists "care_activity_logs_select_member" on public.care_activity_logs;
create policy "care_activity_logs_select_member"
on public.care_activity_logs
for select
using (
  exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = care_activity_logs.recipient_id
      and rm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = care_activity_logs.recipient_id
      and cr.created_by = auth.uid()
  )
);

drop policy if exists "care_activity_logs_insert_member" on public.care_activity_logs;
create policy "care_activity_logs_insert_member"
on public.care_activity_logs
for insert
with check (
  logged_by = auth.uid()
  and (
    exists (
      select 1
      from public.recipient_members rm
      where rm.recipient_id = care_activity_logs.recipient_id
        and rm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.care_recipients cr
      where cr.id = care_activity_logs.recipient_id
        and cr.created_by = auth.uid()
    )
  )
);

drop policy if exists "care_activity_logs_update_editor" on public.care_activity_logs;
create policy "care_activity_logs_update_editor"
on public.care_activity_logs
for update
using (
  logged_by = auth.uid()
  or exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = care_activity_logs.recipient_id
      and rm.user_id = auth.uid()
      and rm.can_edit = true
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = care_activity_logs.recipient_id
      and cr.created_by = auth.uid()
  )
)
with check (
  logged_by = auth.uid()
  or exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = care_activity_logs.recipient_id
      and rm.user_id = auth.uid()
      and rm.can_edit = true
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = care_activity_logs.recipient_id
      and cr.created_by = auth.uid()
  )
);

-- care_appointments policies

drop policy if exists "care_appointments_select_member" on public.care_appointments;
create policy "care_appointments_select_member"
on public.care_appointments
for select
using (
  exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = care_appointments.recipient_id
      and rm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = care_appointments.recipient_id
      and cr.created_by = auth.uid()
  )
);

drop policy if exists "care_appointments_insert_member" on public.care_appointments;
create policy "care_appointments_insert_member"
on public.care_appointments
for insert
with check (
  created_by = auth.uid()
  and (
    exists (
      select 1
      from public.recipient_members rm
      where rm.recipient_id = care_appointments.recipient_id
        and rm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.care_recipients cr
      where cr.id = care_appointments.recipient_id
        and cr.created_by = auth.uid()
    )
  )
);

drop policy if exists "care_appointments_update_editor" on public.care_appointments;
create policy "care_appointments_update_editor"
on public.care_appointments
for update
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = care_appointments.recipient_id
      and rm.user_id = auth.uid()
      and rm.can_edit = true
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = care_appointments.recipient_id
      and cr.created_by = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  or exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = care_appointments.recipient_id
      and rm.user_id = auth.uid()
      and rm.can_edit = true
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = care_appointments.recipient_id
      and cr.created_by = auth.uid()
  )
);

-- vaccine_records policies

drop policy if exists "vaccine_records_select_member" on public.vaccine_records;
create policy "vaccine_records_select_member"
on public.vaccine_records
for select
using (
  exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = vaccine_records.recipient_id
      and rm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = vaccine_records.recipient_id
      and cr.created_by = auth.uid()
  )
);

drop policy if exists "vaccine_records_insert_member" on public.vaccine_records;
create policy "vaccine_records_insert_member"
on public.vaccine_records
for insert
with check (
  created_by = auth.uid()
  and (
    exists (
      select 1
      from public.recipient_members rm
      where rm.recipient_id = vaccine_records.recipient_id
        and rm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.care_recipients cr
      where cr.id = vaccine_records.recipient_id
        and cr.created_by = auth.uid()
    )
  )
);

drop policy if exists "vaccine_records_update_editor" on public.vaccine_records;
create policy "vaccine_records_update_editor"
on public.vaccine_records
for update
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = vaccine_records.recipient_id
      and rm.user_id = auth.uid()
      and rm.can_edit = true
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = vaccine_records.recipient_id
      and cr.created_by = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  or exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = vaccine_records.recipient_id
      and rm.user_id = auth.uid()
      and rm.can_edit = true
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = vaccine_records.recipient_id
      and cr.created_by = auth.uid()
  )
);

-- care_schedule_templates policies

drop policy if exists "care_schedule_templates_select_member" on public.care_schedule_templates;
create policy "care_schedule_templates_select_member"
on public.care_schedule_templates
for select
using (
  exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = care_schedule_templates.recipient_id
      and rm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = care_schedule_templates.recipient_id
      and cr.created_by = auth.uid()
  )
);

drop policy if exists "care_schedule_templates_insert_editor" on public.care_schedule_templates;
create policy "care_schedule_templates_insert_editor"
on public.care_schedule_templates
for insert
with check (
  created_by = auth.uid()
  and (
    exists (
      select 1
      from public.recipient_members rm
      where rm.recipient_id = care_schedule_templates.recipient_id
        and rm.user_id = auth.uid()
        and rm.can_edit = true
    )
    or exists (
      select 1
      from public.care_recipients cr
      where cr.id = care_schedule_templates.recipient_id
        and cr.created_by = auth.uid()
    )
  )
);

drop policy if exists "care_schedule_templates_update_editor" on public.care_schedule_templates;
create policy "care_schedule_templates_update_editor"
on public.care_schedule_templates
for update
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = care_schedule_templates.recipient_id
      and rm.user_id = auth.uid()
      and rm.can_edit = true
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = care_schedule_templates.recipient_id
      and cr.created_by = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  or exists (
    select 1
    from public.recipient_members rm
    where rm.recipient_id = care_schedule_templates.recipient_id
      and rm.user_id = auth.uid()
      and rm.can_edit = true
  )
  or exists (
    select 1
    from public.care_recipients cr
    where cr.id = care_schedule_templates.recipient_id
      and cr.created_by = auth.uid()
  )
);
