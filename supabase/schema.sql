-- CampusPlan Supabase schema
-- Run this once in Supabase SQL Editor.
-- The frontend only uses the public anon key. Never ship the service-role key.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Planner user',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  category text not null default 'Other' check (category in ('College','Study','Personal','Health','Shopping','Other')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  due_date date not null default current_date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text default '',
  description text default '',
  due_date date not null,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  exam_name text not null,
  exam_date date not null,
  exam_time time,
  location text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.timetable (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  teacher text default '',
  room text default '',
  day_of_week smallint not null default 1 check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  time time,
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  days_completed integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_date_idx on public.tasks(user_id, due_date);
create index if not exists assignments_user_date_idx on public.assignments(user_id, due_date);
create index if not exists exams_user_date_idx on public.exams(user_id, exam_date);
create index if not exists events_user_date_idx on public.events(user_id, date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks for each row execute procedure public.set_updated_at();
drop trigger if exists assignments_updated_at on public.assignments;
create trigger assignments_updated_at before update on public.assignments for each row execute procedure public.set_updated_at();
drop trigger if exists exams_updated_at on public.exams;
create trigger exams_updated_at before update on public.exams for each row execute procedure public.set_updated_at();
drop trigger if exists timetable_updated_at on public.timetable;
create trigger timetable_updated_at before update on public.timetable for each row execute procedure public.set_updated_at();
drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at before update on public.notes for each row execute procedure public.set_updated_at();
drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events for each row execute procedure public.set_updated_at();
drop trigger if exists streaks_updated_at on public.streaks;
create trigger streaks_updated_at before update on public.streaks for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Planner user'), new.email)
  on conflict (id) do nothing;
  insert into public.streaks (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.assignments enable row level security;
alter table public.exams enable row level security;
alter table public.timetable enable row level security;
alter table public.notes enable row level security;
alter table public.events enable row level security;
alter table public.streaks enable row level security;

-- Profiles use the auth user id as the owner id.
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- Every planner record is readable and writable only by its authenticated owner.
create policy "tasks_select_own" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid() = user_id);

create policy "assignments_select_own" on public.assignments for select using (auth.uid() = user_id);
create policy "assignments_insert_own" on public.assignments for insert with check (auth.uid() = user_id);
create policy "assignments_update_own" on public.assignments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "assignments_delete_own" on public.assignments for delete using (auth.uid() = user_id);

create policy "exams_select_own" on public.exams for select using (auth.uid() = user_id);
create policy "exams_insert_own" on public.exams for insert with check (auth.uid() = user_id);
create policy "exams_update_own" on public.exams for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exams_delete_own" on public.exams for delete using (auth.uid() = user_id);

create policy "timetable_select_own" on public.timetable for select using (auth.uid() = user_id);
create policy "timetable_insert_own" on public.timetable for insert with check (auth.uid() = user_id);
create policy "timetable_update_own" on public.timetable for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "timetable_delete_own" on public.timetable for delete using (auth.uid() = user_id);

create policy "notes_select_own" on public.notes for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes for delete using (auth.uid() = user_id);

create policy "events_select_own" on public.events for select using (auth.uid() = user_id);
create policy "events_insert_own" on public.events for insert with check (auth.uid() = user_id);
create policy "events_update_own" on public.events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "events_delete_own" on public.events for delete using (auth.uid() = user_id);

create policy "streaks_select_own" on public.streaks for select using (auth.uid() = user_id);
create policy "streaks_insert_own" on public.streaks for insert with check (auth.uid() = user_id);
create policy "streaks_update_own" on public.streaks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "streaks_delete_own" on public.streaks for delete using (auth.uid() = user_id);
