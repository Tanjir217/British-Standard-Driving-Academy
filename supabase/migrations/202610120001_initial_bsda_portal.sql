-- BSDA temporary Supabase portal schema
-- Review before applying to the temporary Supabase project. This migration is not deployed by GitHub.
-- Staff roles are granted only by a trusted administrator using the Supabase dashboard/SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  profile_photo_url text,
  account_status text not null default 'active'
    check (account_status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  wix_plan_id text unique,
  name text not null,
  description text not null default '',
  price_minor integer not null default 0 check (price_minor >= 0),
  currency text not null default 'GBP' check (char_length(currency) = 3),
  lesson_hours integer not null default 0 check (lesson_hours >= 0),
  transmission text not null default 'either'
    check (transmission in ('manual', 'automatic', 'either')),
  features jsonb not null default '[]'::jsonb
    check (jsonb_typeof(features) = 'array'),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_package_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid references public.packages(id) on delete set null,
  source text not null default 'manual'
    check (source in ('manual', 'wix_payment', 'migration')),
  external_order_id text unique,
  total_lessons integer not null default 0 check (total_lessons >= 0),
  lessons_completed integer not null default 0 check (lessons_completed >= 0),
  status text not null default 'active'
    check (status in ('pending', 'active', 'completed', 'cancelled', 'refunded')),
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lessons_completed <= total_lessons)
);

create table if not exists public.lesson_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  wix_booking_id text,
  instructor_user_id uuid references auth.users(id) on delete set null,
  instructor_name text not null default '',
  lesson_type text not null default 'Driving lesson',
  started_at timestamptz,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  objectives jsonb not null default '[]'::jsonb
    check (jsonb_typeof(objectives) = 'array'),
  strengths jsonb not null default '[]'::jsonb
    check (jsonb_typeof(strengths) = 'array'),
  improvements jsonb not null default '[]'::jsonb
    check (jsonb_typeof(improvements) = 'array'),
  instructor_notes text,
  progress_score numeric(5,2) check (progress_score is null or progress_score between 0 and 100),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('instructor', 'admin', 'super_admin')),
  enabled boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_records_student_started_idx
  on public.lesson_records (student_id, started_at desc);
create index if not exists lesson_records_instructor_started_idx
  on public.lesson_records (instructor_user_id, started_at desc);
create index if not exists assignments_student_status_idx
  on public.student_package_assignments (student_id, status);
create index if not exists packages_status_idx on public.packages (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- Prevent users from changing their own account status through the public client.
create or replace function public.protect_bsda_profile_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $
begin
  if new.account_status is distinct from old.account_status
     and not (select public.bsda_is_admin()) then
    raise exception 'Only BSDA administrators can change account status.'
      using errcode = '42501';
  end if;
  return new;
end;
$;

drop trigger if exists profiles_protect_account_status on public.profiles;
create trigger profiles_protect_account_status
before update on public.profiles
for each row execute function public.protect_bsda_profile_status();
drop trigger if exists packages_set_updated_at on public.packages;
create trigger packages_set_updated_at before update on public.packages
for each row execute function public.set_updated_at();
drop trigger if exists assignments_set_updated_at on public.student_package_assignments;
create trigger assignments_set_updated_at before update on public.student_package_assignments
for each row execute function public.set_updated_at();
drop trigger if exists lesson_records_set_updated_at on public.lesson_records;
create trigger lesson_records_set_updated_at before update on public.lesson_records
for each row execute function public.set_updated_at();
drop trigger if exists staff_access_set_updated_at on public.staff_access;
create trigger staff_access_set_updated_at before update on public.staff_access
for each row execute function public.set_updated_at();

-- New Auth users receive a basic profile. Do not assign any staff role here.
create or replace function public.handle_new_bsda_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_bsda_auth_user_created on auth.users;
create trigger on_bsda_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_bsda_user();

-- SECURITY DEFINER helpers avoid recursive RLS checks on staff_access.
create or replace function public.bsda_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff_access s
    where s.user_id = (select auth.uid())
      and s.enabled = true
      and s.role in ('admin', 'super_admin')
  );
$$;

create or replace function public.bsda_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff_access s
    where s.user_id = (select auth.uid())
      and s.enabled = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.student_package_assignments enable row level security;
alter table public.lesson_records enable row level security;
alter table public.staff_access enable row level security;

-- Profiles: students can read/update their own basic profile; admins can manage all profiles.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select public.bsda_is_admin()));

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles
for update to authenticated
using (id = (select auth.uid()) or (select public.bsda_is_admin()))
with check (id = (select auth.uid()) or (select public.bsda_is_admin()));

drop policy if exists "profiles_insert_admin_only" on public.profiles;
create policy "profiles_insert_admin_only" on public.profiles
for insert to authenticated
with check ((select public.bsda_is_admin()));

-- Packages: public visitors can read active packages; only admins can change the catalogue.
drop policy if exists "packages_read_active_or_admin" on public.packages;
create policy "packages_read_active_or_admin" on public.packages
for select to anon, authenticated
using (status = 'active' or (select public.bsda_is_admin()));

drop policy if exists "packages_admin_insert" on public.packages;
create policy "packages_admin_insert" on public.packages
for insert to authenticated
with check ((select public.bsda_is_admin()));
drop policy if exists "packages_admin_update" on public.packages;
create policy "packages_admin_update" on public.packages
for update to authenticated
using ((select public.bsda_is_admin()))
with check ((select public.bsda_is_admin()));
drop policy if exists "packages_admin_delete" on public.packages;
create policy "packages_admin_delete" on public.packages
for delete to authenticated
using ((select public.bsda_is_admin()));

-- Students can read their own assignments. Only admins can create or change entitlements.
drop policy if exists "assignments_select_owner_or_admin" on public.student_package_assignments;
create policy "assignments_select_owner_or_admin" on public.student_package_assignments
for select to authenticated
using (student_id = (select auth.uid()) or (select public.bsda_is_admin()));
drop policy if exists "assignments_admin_insert" on public.student_package_assignments;
create policy "assignments_admin_insert" on public.student_package_assignments
for insert to authenticated
with check ((select public.bsda_is_admin()));
drop policy if exists "assignments_admin_update" on public.student_package_assignments;
create policy "assignments_admin_update" on public.student_package_assignments
for update to authenticated
using ((select public.bsda_is_admin()))
with check ((select public.bsda_is_admin()));
drop policy if exists "assignments_admin_delete" on public.student_package_assignments;
create policy "assignments_admin_delete" on public.student_package_assignments
for delete to authenticated
using ((select public.bsda_is_admin()));

-- Students see their own lesson history; instructors see only lessons assigned to them;
-- admins can manage all lesson records.
drop policy if exists "lessons_select_owner_instructor_admin" on public.lesson_records;
create policy "lessons_select_owner_instructor_admin" on public.lesson_records
for select to authenticated
using (
  student_id = (select auth.uid())
  or instructor_user_id = (select auth.uid())
  or (select public.bsda_is_admin())
);
drop policy if exists "lessons_admin_insert" on public.lesson_records;
create policy "lessons_admin_insert" on public.lesson_records
for insert to authenticated
with check ((select public.bsda_is_admin()));
drop policy if exists "lessons_admin_update" on public.lesson_records;
create policy "lessons_admin_update" on public.lesson_records
for update to authenticated
using ((select public.bsda_is_admin()))
with check ((select public.bsda_is_admin()));
drop policy if exists "lessons_admin_delete" on public.lesson_records;
create policy "lessons_admin_delete" on public.lesson_records
for delete to authenticated
using ((select public.bsda_is_admin()));

-- A user can read only their own staff row; admins can manage staff grants.
drop policy if exists "staff_access_select_self_or_admin" on public.staff_access;
create policy "staff_access_select_self_or_admin" on public.staff_access
for select to authenticated
using (user_id = (select auth.uid()) or (select public.bsda_is_admin()));
drop policy if exists "staff_access_admin_insert" on public.staff_access;
create policy "staff_access_admin_insert" on public.staff_access
for insert to authenticated
with check ((select public.bsda_is_admin()));
drop policy if exists "staff_access_admin_update" on public.staff_access;
create policy "staff_access_admin_update" on public.staff_access
for update to authenticated
using ((select public.bsda_is_admin()))
with check ((select public.bsda_is_admin()));
drop policy if exists "staff_access_admin_delete" on public.staff_access;
create policy "staff_access_admin_delete" on public.staff_access
for delete to authenticated
using ((select public.bsda_is_admin()));

-- Restrict helper function execution to authenticated users (policies call these functions).
revoke all on function public.bsda_is_admin() from public, anon;
revoke all on function public.bsda_is_staff() from public, anon;
grant execute on function public.bsda_is_admin() to authenticated;
grant execute on function public.bsda_is_staff() to authenticated;

-- Table privileges are required in addition to RLS.
grant select, update on public.profiles to authenticated;
grant insert on public.profiles to authenticated;
grant select on public.packages to anon, authenticated;
grant insert, update, delete on public.packages to authenticated;
grant select, insert, update, delete on public.student_package_assignments to authenticated;
grant select, insert, update, delete on public.lesson_records to authenticated;
grant select, insert, update, delete on public.staff_access to authenticated;
