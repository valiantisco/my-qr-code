-- QR tracking app schema.
-- Run in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- QR FOLDERS ---------------------------------------------------------------
create table if not exists public.qr_folders (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  name_normalized text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint qr_folders_name_present check (char_length(trim(name)) > 0),
  constraint qr_folders_owner_name_unique unique (owner_id, name_normalized)
);

create index if not exists qr_folders_owner_idx on public.qr_folders(owner_id);

-- QR CODES -----------------------------------------------------------------
create table if not exists public.qr_codes (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  folder_id       uuid references public.qr_folders(id) on delete set null,
  name            text not null,
  slug            text not null unique,
  destination_url text not null,
  campaign        text,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.qr_codes
  add column if not exists folder_id uuid references public.qr_folders(id) on delete set null;

create index if not exists qr_codes_owner_idx   on public.qr_codes(owner_id);
create index if not exists qr_codes_folder_idx  on public.qr_codes(folder_id);
create index if not exists qr_codes_active_idx  on public.qr_codes(is_active);
create index if not exists qr_codes_created_idx on public.qr_codes(created_at desc);

-- keep updated_at fresh
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists qr_codes_set_updated_at on public.qr_codes;
create trigger qr_codes_set_updated_at
  before update on public.qr_codes
  for each row execute function public.set_updated_at();

drop trigger if exists qr_folders_set_updated_at on public.qr_folders;
create trigger qr_folders_set_updated_at
  before update on public.qr_folders
  for each row execute function public.set_updated_at();

-- QR SCANS -----------------------------------------------------------------
create table if not exists public.qr_scans (
  id           bigserial primary key,
  qr_code_id   uuid not null references public.qr_codes(id) on delete cascade,
  created_at   timestamptz not null default now(),
  referrer     text,
  user_agent   text,
  ip           text,
  country      text,
  city         text,
  device       text,
  browser      text,
  os           text
);

create index if not exists qr_scans_qr_idx         on public.qr_scans(qr_code_id);
create index if not exists qr_scans_created_idx    on public.qr_scans(created_at desc);
create index if not exists qr_scans_qr_created_idx on public.qr_scans(qr_code_id, created_at desc);

-- REPORT PREFERENCES -------------------------------------------------------
create table if not exists public.report_preferences (
  owner_id        uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  weekly_enabled  boolean not null default true,
  monthly_enabled boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists report_prefs_set_updated_at on public.report_preferences;
create trigger report_prefs_set_updated_at
  before update on public.report_preferences
  for each row execute function public.set_updated_at();

-- ROW LEVEL SECURITY -------------------------------------------------------
alter table public.qr_codes           enable row level security;
alter table public.qr_folders         enable row level security;
alter table public.qr_scans           enable row level security;
alter table public.report_preferences enable row level security;

-- qr_folders: owner can do everything
drop policy if exists "qr_folders_owner_all" on public.qr_folders;
create policy "qr_folders_owner_all"
  on public.qr_folders for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- qr_codes: owner can do everything
drop policy if exists "qr_codes_owner_all" on public.qr_codes;
create policy "qr_codes_owner_all"
  on public.qr_codes for all
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and (
      folder_id is null
      or exists (
        select 1 from public.qr_folders f
        where f.id = qr_codes.folder_id and f.owner_id = auth.uid()
      )
    )
  );

-- qr_scans: owner can read scans for their codes
drop policy if exists "qr_scans_owner_read" on public.qr_scans;
create policy "qr_scans_owner_read"
  on public.qr_scans for select
  using (
    exists (
      select 1 from public.qr_codes c
      where c.id = qr_scans.qr_code_id and c.owner_id = auth.uid()
    )
  );

-- qr_scans inserts happen via the service role on the redirect route, so no public insert policy.

-- report_preferences: owner-only
drop policy if exists "report_prefs_owner_all" on public.report_preferences;
create policy "report_prefs_owner_all"
  on public.report_preferences for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
