-- Owner만 피보호자 삭제 가능하도록 DELETE 정책 명시

drop policy if exists "care_recipients_delete_owner" on public.care_recipients;

create policy "care_recipients_delete_owner"
on public.care_recipients
for delete
using (created_by = auth.uid());
