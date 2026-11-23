-- Run ONCE in the Supabase SQL editor after you have signed up in the app.
-- Replace the email. Never expose this as an app feature.
update public.profiles
set role = 'owner'
where id = (select id from auth.users where email = 'YOUR-EMAIL@example.com');

-- Optional: promote an admin and choose what they may do
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'admin@example.com');
-- insert into public.admin_permissions (admin_id, can_manage_books, can_manage_categories, can_approve_payments)
-- select id, true, false, true from auth.users where email = 'admin@example.com'
-- on conflict (admin_id) do update set can_manage_books = excluded.can_manage_books,
--   can_manage_categories = excluded.can_manage_categories, can_approve_payments = excluded.can_approve_payments;
