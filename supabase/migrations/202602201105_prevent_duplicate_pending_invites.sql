-- 동일 피보호자 + 동일 이메일의 pending 초대 중복 방지

create unique index if not exists idx_recipient_invites_unique_pending
  on public.recipient_invites (recipient_id, lower(invited_email))
  where status = 'pending';
