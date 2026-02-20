-- 이메일/초대링크 기반 가족 초대 기능

create table if not exists public.recipient_invites (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  invited_email text not null,
  relationship text,
  can_edit boolean not null default false,
  invite_token uuid not null unique,
  invited_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default timezone('utc', now()) + interval '7 days',
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_recipient_invites_recipient_id
  on public.recipient_invites(recipient_id);

create index if not exists idx_recipient_invites_invited_email
  on public.recipient_invites(lower(invited_email));

create index if not exists idx_recipient_invites_status
  on public.recipient_invites(status);

drop trigger if exists trg_recipient_invites_updated_at on public.recipient_invites;
create trigger trg_recipient_invites_updated_at
before update on public.recipient_invites
for each row
execute function public.set_updated_at();

alter table public.recipient_invites enable row level security;

drop policy if exists "recipient_invites_select_owner_or_invited" on public.recipient_invites;
create policy "recipient_invites_select_owner_or_invited"
on public.recipient_invites
for select
using (
  exists (
    select 1
    from public.care_recipients cr
    where cr.id = recipient_invites.recipient_id
      and cr.created_by = auth.uid()
  )
  or lower(recipient_invites.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "recipient_invites_insert_owner" on public.recipient_invites;
create policy "recipient_invites_insert_owner"
on public.recipient_invites
for insert
with check (
  invited_by = auth.uid()
  and exists (
    select 1
    from public.care_recipients cr
    where cr.id = recipient_invites.recipient_id
      and cr.created_by = auth.uid()
  )
);

drop policy if exists "recipient_invites_update_owner" on public.recipient_invites;
create policy "recipient_invites_update_owner"
on public.recipient_invites
for update
using (
  exists (
    select 1
    from public.care_recipients cr
    where cr.id = recipient_invites.recipient_id
      and cr.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.care_recipients cr
    where cr.id = recipient_invites.recipient_id
      and cr.created_by = auth.uid()
  )
);

drop policy if exists "recipient_invites_delete_owner" on public.recipient_invites;
create policy "recipient_invites_delete_owner"
on public.recipient_invites
for delete
using (
  exists (
    select 1
    from public.care_recipients cr
    where cr.id = recipient_invites.recipient_id
      and cr.created_by = auth.uid()
  )
);

create or replace function public.accept_recipient_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.recipient_invites%rowtype;
  jwt_email text;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if jwt_email = '' then
    raise exception '이메일 정보가 없어 초대를 수락할 수 없습니다.';
  end if;

  select *
    into invite_row
  from public.recipient_invites
  where recipient_invites.invite_token = accept_recipient_invite.invite_token
    and recipient_invites.status = 'pending'
    and recipient_invites.expires_at > timezone('utc', now())
  for update;

  if not found then
    raise exception '유효한 초대가 없습니다.';
  end if;

  if lower(invite_row.invited_email) <> jwt_email then
    raise exception '초대 이메일과 로그인 계정이 일치하지 않습니다.';
  end if;

  insert into public.recipient_members (recipient_id, user_id, relationship, can_edit)
  values (invite_row.recipient_id, auth.uid(), invite_row.relationship, invite_row.can_edit)
  on conflict (recipient_id, user_id)
  do update set
    relationship = excluded.relationship,
    can_edit = excluded.can_edit;

  update public.recipient_invites
    set status = 'accepted',
        accepted_at = timezone('utc', now()),
        accepted_user_id = auth.uid(),
        updated_at = timezone('utc', now())
  where id = invite_row.id;

  return invite_row.recipient_id;
end;
$$;

grant execute on function public.accept_recipient_invite(uuid) to authenticated;
