-- Migration: add preset support
-- Run in Supabase SQL Editor (safe to run on existing DB)

alter table games add column if not exists is_preset  boolean not null default false;
alter table games add column if not exists description text;
alter table games add column if not exists scene       text;

create index if not exists games_is_preset_idx on games(is_preset) where is_preset = true;
