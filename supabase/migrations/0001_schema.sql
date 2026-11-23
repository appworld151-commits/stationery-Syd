-- AYANO KOJI core schema (Phase 1). Storage policies come in a later migration.
create type app_role as enum ('owner','admin','user');
create type payment_status as enum ('pending','paid','failed','refunded');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  role app_role not null default 'user',
  created_at timestamptz not null default now()
);
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name jsonb not null default '{}'::jsonb
);
create table books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  author text not null,
  description text,
  cover_path text,
  preview_path text,
  file_path text,
  file_type text check (file_type in ('pdf','epub')),
  category_id uuid references categories(id) on delete set null,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'USD',
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index books_published_idx on books (published, published_at desc);
create table purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  status payment_status not null default 'pending',
  provider text not null default 'manual',
  approved_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (user_id, book_id)
);
create table user_library (
  user_id uuid references profiles(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  purchase_id uuid references purchases(id),
  added_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
create table favorites (
  user_id uuid references profiles(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  primary key (user_id, book_id)
);
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  location text not null, note text, created_at timestamptz not null default now()
);
create table reading_progress (
  user_id uuid references profiles(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  location text not null, percent numeric(5,2) check (percent between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
create table admin_permissions (
  admin_id uuid primary key references profiles(id) on delete cascade,
  can_manage_books boolean not null default true,
  can_manage_categories boolean not null default false,
  can_approve_payments boolean not null default false
);
create table activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id) on delete set null,
  action text not null, details jsonb, created_at timestamptz not null default now()
);

create function is_staff() returns boolean language sql security definer stable as
$$ select exists (select 1 from profiles where id = auth.uid() and role in ('owner','admin')) $$;
create function is_owner() returns boolean language sql security definer stable as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'owner') $$;

create function handle_new_user() returns trigger language plpgsql security definer as
$$ begin insert into profiles (id, display_name) values (new.id, new.raw_user_meta_data->>'name'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

alter table profiles enable row level security;
alter table books enable row level security;
alter table categories enable row level security;
alter table purchases enable row level security;
alter table user_library enable row level security;
alter table favorites enable row level security;
alter table bookmarks enable row level security;
alter table reading_progress enable row level security;
alter table admin_permissions enable row level security;
alter table activity_logs enable row level security;

create policy "read own profile or staff" on profiles for select using (id = auth.uid() or is_staff());
create policy "update own profile, role locked" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy "owner manages roles" on profiles for update using (is_owner()) with check (is_owner());
create policy "public reads published books" on books for select using (published or is_staff());
create policy "staff writes books" on books for all using (is_staff()) with check (is_staff());
create policy "anyone reads categories" on categories for select using (true);
create policy "staff writes categories" on categories for all using (is_staff()) with check (is_staff());
create policy "own purchases read" on purchases for select using (user_id = auth.uid() or is_staff());
create policy "own library read" on user_library for select using (user_id = auth.uid());
create policy "own favorites" on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own bookmarks" on bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own progress" on reading_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner manages admin perms" on admin_permissions for all using (is_owner()) with check (is_owner());
create policy "staff reads logs" on activity_logs for select using (is_staff());
-- No client INSERT policy on purchases/user_library: access is granted only by a
-- server-side approval function (Phase 8), never by a frontend claim.
