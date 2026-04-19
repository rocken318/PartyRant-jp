-- PartyRant Full MVP Schema
-- Run in Supabase SQL Editor.
-- Safe to re-run: drops existing tables first to avoid type conflicts.

drop table if exists answers cascade;
drop table if exists players cascade;
drop table if exists games cascade;
drop table if exists events cascade;

-- ─── Events ──────────────────────────────────────────────────────────────────
create table if not exists events (
  id         text primary key,
  host_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at bigint not null
);

-- ─── Games ───────────────────────────────────────────────────────────────────
create table if not exists games (
  id           text primary key,
  event_id     text references events(id) on delete cascade,
  host_id      uuid references auth.users(id),
  join_code    text unique not null,
  mode         text not null check (mode in ('trivia', 'polling')),
  game_mode    text not null default 'live' check (game_mode in ('live', 'self_paced')),
  title        text not null,
  description  text,
  scene        text,
  questions    jsonb not null default '[]',
  status       text not null default 'draft',
  is_preset    boolean not null default false,
  current_question_index      integer not null default -1,
  current_question_started_at bigint,
  created_at   bigint not null,
  ended_at     bigint
);

-- ─── Players ─────────────────────────────────────────────────────────────────
create table if not exists players (
  id           text primary key,
  game_id      text not null references games(id) on delete cascade,
  display_name text not null,
  joined_at    bigint not null
);

-- ─── Answers ─────────────────────────────────────────────────────────────────
create table if not exists answers (
  id               text primary key,
  game_id          text not null references games(id) on delete cascade,
  player_id        text not null references players(id) on delete cascade,
  question_id      text not null,
  choice_index     integer not null,
  answered_at      bigint not null,
  response_time_ms integer not null,
  unique (player_id, question_id)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists events_host_id_idx        on events(host_id);
create index if not exists games_event_id_idx        on games(event_id);
create index if not exists players_game_id_idx       on players(game_id);
create index if not exists answers_game_id_idx       on answers(game_id);
create index if not exists answers_game_question_idx on answers(game_id, question_id);

-- ─── RLS (disabled — service role key bypasses RLS) ──────────────────────────
alter table events  disable row level security;
alter table games   disable row level security;
alter table players disable row level security;
alter table answers disable row level security;
