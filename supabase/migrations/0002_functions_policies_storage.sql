-- AYANO KOJI - migration 0002
-- Run AFTER 0001_schema.sql. Adds: hardened helpers, granular admin permissions,
-- purchase workflow functions, stricter bookmark/progress policies, activity log
-- triggers, and private Storage buckets with RLS.
-- Safe to re-run (uses create or replace / drop ... if exists / on conflict).

------------------------------------------------------------------------------
-- 1. Helper functions (pinned search_path; security definer bypasses RLS safely)
------------------------------------------------------------------------------
create or replace function public.is_staff() returns boolean
language sql security definer stable set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','admin')) $$;

create or replace function public.is_owner() returns boolean
language sql security definer stable set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner') $$;

-- Owners have every permission; admins only the ones in admin_permissions.
create or replace function public.has_perm(perm text) returns boolean
language sql security definer stable set search_path = public as
$$
  select public.is_owner()
      or exists (
        select 1
        from public.profiles p
        join public.admin_permissions a on a.admin_id = p.id
        where p.id = auth.uid() and p.role = 'admin'
          and case perm
                when 'manage_books'       then a.can_manage_books
                when 'manage_categories'  then a.can_manage_categories
                when 'approve_payments'   then a.can_approve_payments
                else false
              end
      )
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 80))
  on conflict (id) do nothing;
  return new;
end
$$;

-- Backfill profiles for users created before the trigger existed.
insert into public.profiles (id, display_name)
select u.id, left(coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)), 80)
from auth.users u
on conflict (id) do nothing;

------------------------------------------------------------------------------
-- 2. Role protection: only an owner may change roles; never remove the last owner.
--    auth.uid() is null for the SQL editor / service role, so bootstrapping works.
------------------------------------------------------------------------------
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_owner() then
      raise exception 'only an owner can change roles' using errcode = '42501';
    end if;
    if old.role = 'owner' and new.role <> 'owner'
       and (select count(*) from public.profiles where role = 'owner') <= 1 then
      raise exception 'cannot remove the last owner' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

------------------------------------------------------------------------------
-- 3. Granular write policies (replace the broad "staff writes ..." policies)
------------------------------------------------------------------------------
drop policy if exists "staff writes books" on public.books;
drop policy if exists "staff insert books" on public.books;
drop policy if exists "staff update books" on public.books;
drop policy if exists "staff delete books" on public.books;
create policy "staff insert books" on public.books for insert to authenticated with check (public.has_perm('manage_books'));
create policy "staff update books" on public.books for update to authenticated using (public.has_perm('manage_books')) with check (public.has_perm('manage_books'));
create policy "staff delete books" on public.books for delete to authenticated using (public.has_perm('manage_books'));

drop policy if exists "staff writes categories" on public.categories;
drop policy if exists "staff insert categories" on public.categories;
drop policy if exists "staff update categories" on public.categories;
drop policy if exists "staff delete categories" on public.categories;
create policy "staff insert categories" on public.categories for insert to authenticated with check (public.has_perm('manage_categories'));
create policy "staff update categories" on public.categories for update to authenticated using (public.has_perm('manage_categories')) with check (public.has_perm('manage_categories'));
create policy "staff delete categories" on public.categories for delete to authenticated using (public.has_perm('manage_categories'));

drop policy if exists "admin reads own perms" on public.admin_permissions;
create policy "admin reads own perms" on public.admin_permissions for select to authenticated using (admin_id = auth.uid());

drop policy if exists "staff reads library" on public.user_library;
create policy "staff reads library" on public.user_library for select to authenticated using (public.is_staff());

------------------------------------------------------------------------------
-- 4. Bookmarks / reading progress: only for books the user actually owns
------------------------------------------------------------------------------
drop policy if exists "own bookmarks" on public.bookmarks;
drop policy if exists "own bookmarks read" on public.bookmarks;
drop policy if exists "own bookmarks insert" on public.bookmarks;
drop policy if exists "own bookmarks update" on public.bookmarks;
drop policy if exists "own bookmarks delete" on public.bookmarks;
create policy "own bookmarks read" on public.bookmarks for select to authenticated using (user_id = auth.uid());
create policy "own bookmarks insert" on public.bookmarks for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.user_library ul where ul.user_id = auth.uid() and ul.book_id = bookmarks.book_id));
create policy "own bookmarks update" on public.bookmarks for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own bookmarks delete" on public.bookmarks for delete to authenticated using (user_id = auth.uid());

drop policy if exists "own progress" on public.reading_progress;
drop policy if exists "own progress read" on public.reading_progress;
drop policy if exists "own progress insert" on public.reading_progress;
drop policy if exists "own progress update" on public.reading_progress;
drop policy if exists "own progress delete" on public.reading_progress;
create policy "own progress read" on public.reading_progress for select to authenticated using (user_id = auth.uid());
create policy "own progress insert" on public.reading_progress for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.user_library ul where ul.user_id = auth.uid() and ul.book_id = reading_progress.book_id));
create policy "own progress update" on public.reading_progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own progress delete" on public.reading_progress for delete to authenticated using (user_id = auth.uid());

create or replace function public.touch_updated_at() returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists reading_progress_touch on public.reading_progress;
create trigger reading_progress_touch before update on public.reading_progress
  for each row execute function public.touch_updated_at();

------------------------------------------------------------------------------
-- 5. Purchase workflow (server-side only: clients can never insert purchases
--    or library rows directly, and the price always comes from the books table)
------------------------------------------------------------------------------
-- Returns 'owned' (free / already owned) or 'pending' (paid book awaiting approval).
create or replace function public.request_book(p_book_id uuid) returns text
language plpgsql security definer set search_path = public as
$$
declare
  v_uid uuid := auth.uid();
  v_book public.books%rowtype;
  v_purchase_id uuid;
  v_status public.payment_status;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_book from public.books where id = p_book_id and published;
  if not found then
    raise exception 'book not available' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.user_library where user_id = v_uid and book_id = p_book_id) then
    return 'owned';
  end if;

  if v_book.price_cents = 0 then
    insert into public.purchases as p (user_id, book_id, amount_cents, status, provider)
    values (v_uid, p_book_id, 0, 'paid', 'free')
    on conflict (user_id, book_id) do update
      set status = 'paid', amount_cents = 0, provider = 'free'
      where p.status in ('pending', 'failed')
    returning id into v_purchase_id;

    if v_purchase_id is null then
      -- a purchase row exists but was refunded: never re-grant automatically
      raise exception 'purchase was refunded; contact support' using errcode = '23514';
    end if;

    insert into public.user_library (user_id, book_id, purchase_id)
    values (v_uid, p_book_id, v_purchase_id)
    on conflict (user_id, book_id) do nothing;
    return 'owned';
  end if;

  insert into public.purchases as p (user_id, book_id, amount_cents, status, provider)
  values (v_uid, p_book_id, v_book.price_cents, 'pending', 'manual')
  on conflict (user_id, book_id) do update
    set status = 'pending', amount_cents = excluded.amount_cents
    where p.status = 'failed';

  select status into v_status from public.purchases where user_id = v_uid and book_id = p_book_id;
  if v_status = 'refunded' then
    raise exception 'purchase was refunded; contact support' using errcode = '23514';
  end if;
  return 'pending';
end
$$;

create or replace function public.approve_purchase(p_purchase_id uuid) returns void
language plpgsql security definer set search_path = public as
$$
declare v_p public.purchases%rowtype;
begin
  if not public.has_perm('approve_payments') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_p from public.purchases where id = p_purchase_id for update;
  if not found then
    raise exception 'purchase not found' using errcode = 'P0002';
  end if;
  if v_p.status = 'refunded' then
    raise exception 'purchase was refunded' using errcode = '23514';
  end if;

  update public.purchases set status = 'paid', approved_by = auth.uid() where id = p_purchase_id;
  insert into public.user_library (user_id, book_id, purchase_id)
  values (v_p.user_id, v_p.book_id, v_p.id)
  on conflict (user_id, book_id) do nothing;
  insert into public.activity_logs (actor_id, action, details)
  values (auth.uid(), 'approve_purchase',
          jsonb_build_object('purchase_id', p_purchase_id, 'user_id', v_p.user_id, 'book_id', v_p.book_id));
end
$$;

create or replace function public.reject_purchase(p_purchase_id uuid) returns void
language plpgsql security definer set search_path = public as
$$
begin
  if not public.has_perm('approve_payments') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.purchases set status = 'failed', approved_by = auth.uid()
  where id = p_purchase_id and status = 'pending';
  if not found then
    raise exception 'pending purchase not found' using errcode = 'P0002';
  end if;
  insert into public.activity_logs (actor_id, action, details)
  values (auth.uid(), 'reject_purchase', jsonb_build_object('purchase_id', p_purchase_id));
end
$$;

create or replace function public.refund_purchase(p_purchase_id uuid) returns void
language plpgsql security definer set search_path = public as
$$
declare v_p public.purchases%rowtype;
begin
  if not public.has_perm('approve_payments') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_p from public.purchases where id = p_purchase_id for update;
  if not found then
    raise exception 'purchase not found' using errcode = 'P0002';
  end if;
  update public.purchases set status = 'refunded', approved_by = auth.uid() where id = p_purchase_id;
  delete from public.user_library where user_id = v_p.user_id and book_id = v_p.book_id;
  insert into public.activity_logs (actor_id, action, details)
  values (auth.uid(), 'refund_purchase', jsonb_build_object('purchase_id', p_purchase_id));
end
$$;

-- Only signed-in users may call the workflow functions.
revoke all on function public.request_book(uuid)    from public, anon;
revoke all on function public.approve_purchase(uuid) from public, anon;
revoke all on function public.reject_purchase(uuid)  from public, anon;
revoke all on function public.refund_purchase(uuid)  from public, anon;
grant execute on function public.request_book(uuid)    to authenticated;
grant execute on function public.approve_purchase(uuid) to authenticated;
grant execute on function public.reject_purchase(uuid)  to authenticated;
grant execute on function public.refund_purchase(uuid)  to authenticated;

------------------------------------------------------------------------------
-- 6. Activity log for catalogue changes (no client INSERT policy on activity_logs)
------------------------------------------------------------------------------
create or replace function public.log_book_change() returns trigger
language plpgsql security definer set search_path = public as
$$
declare v jsonb;
begin
  if tg_op = 'DELETE' then
    v := jsonb_build_object('book_id', old.id, 'title', old.title);
  else
    v := jsonb_build_object('book_id', new.id, 'title', new.title);
  end if;
  insert into public.activity_logs (actor_id, action, details)
  values (auth.uid(), lower(tg_op) || '_book', v);
  return null;
end
$$;
drop trigger if exists books_log_change on public.books;
create trigger books_log_change after insert or update or delete on public.books
  for each row execute function public.log_book_change();

------------------------------------------------------------------------------
-- 7. Indexes
------------------------------------------------------------------------------
create index if not exists books_category_idx on public.books (category_id);
create index if not exists purchases_user_idx on public.purchases (user_id);
create index if not exists purchases_status_idx on public.purchases (status);
create index if not exists user_library_book_idx on public.user_library (book_id);
create index if not exists bookmarks_user_book_idx on public.bookmarks (user_id, book_id);

------------------------------------------------------------------------------
-- 8. Storage buckets + RLS
--    covers   : public images (cover art)
--    previews : public free samples (pdf/epub)
--    books    : PRIVATE full files; readable only by staff or by users who own the book
--    Path convention: covers/<book-id>.jpg  previews/<book-id>.pdf  books/<book-id>/book.pdf
--    The books.cover_path / preview_path / file_path columns hold exactly that object path.
------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('covers',   'covers',   true,  5242880,  array['image/jpeg','image/png','image/webp']),
  ('previews', 'previews', true,  20971520, array['application/pdf','application/epub+zip']),
  ('books',    'books',    false, 52428800, array['application/pdf','application/epub+zip'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff read book assets"   on storage.objects;
drop policy if exists "staff insert book assets" on storage.objects;
drop policy if exists "staff update book assets" on storage.objects;
drop policy if exists "staff delete book assets" on storage.objects;
drop policy if exists "owners read purchased files" on storage.objects;

create policy "staff read book assets" on storage.objects for select to authenticated
  using (bucket_id in ('covers','previews','books') and public.is_staff());
create policy "staff insert book assets" on storage.objects for insert to authenticated
  with check (bucket_id in ('covers','previews','books') and public.has_perm('manage_books'));
create policy "staff update book assets" on storage.objects for update to authenticated
  using (bucket_id in ('covers','previews','books') and public.has_perm('manage_books'))
  with check (bucket_id in ('covers','previews','books') and public.has_perm('manage_books'));
create policy "staff delete book assets" on storage.objects for delete to authenticated
  using (bucket_id in ('covers','previews','books') and public.has_perm('manage_books'));

create policy "owners read purchased files" on storage.objects for select to authenticated
  using (
    bucket_id = 'books'
    and exists (
      select 1
      from public.books b
      join public.user_library ul on ul.book_id = b.id
      where ul.user_id = auth.uid() and b.file_path = storage.objects.name
    )
  );
