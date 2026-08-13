-- PartyRant-jp D1 schema (SQLite). Translated from supabase/schema.sql.
-- bigint->INTEGER, jsonb->TEXT, boolean->INTEGER(0/1), auth.users FK removed (host_id = Clerk userId text).

PRAGMA foreign_keys = ON;

create table if not exists events (
  id         text primary key,
  host_id    text not null,
  name       text not null,
  created_at integer not null
);

create table if not exists games (
  id           text primary key,
  event_id     text references events(id) on delete cascade,
  host_id      text,
  join_code    text unique not null,
  mode         text not null check (mode in ('trivia','polling','opinion')),
  game_mode    text not null default 'live' check (game_mode in ('live','self_paced')),
  title        text not null,
  description  text,
  scene        text,
  lose_rule    text check (lose_rule in ('minority','majority')),
  questions    text not null default '[]',
  status       text not null default 'draft',
  is_preset    integer not null default 0,
  current_question_index      integer not null default -1,
  current_question_started_at integer,
  created_at   integer not null,
  ended_at     integer
);

create table if not exists players (
  id           text primary key,
  game_id      text not null references games(id) on delete cascade,
  display_name text not null,
  joined_at    integer not null
);

create table if not exists answers (
  id               text primary key,
  game_id          text not null references games(id) on delete cascade,
  player_id        text not null references players(id) on delete cascade,
  question_id      text not null,
  choice_index     integer not null,
  answered_at      integer not null,
  response_time_ms integer not null,
  unique (player_id, question_id)
);

create table if not exists profiles (
  id              text primary key,      -- Clerk userId
  plan            text not null default 'free' check (plan in ('free','pro')),
  ai_gen_count    integer not null default 0,
  ai_gen_reset_at integer not null
);

create index if not exists events_host_id_idx        on events(host_id);
create index if not exists games_event_id_idx        on games(event_id);
create index if not exists games_is_preset_idx       on games(is_preset) where is_preset = 1;
create index if not exists players_game_id_idx       on players(game_id);
create index if not exists answers_game_id_idx       on answers(game_id);
create index if not exists answers_game_question_idx on answers(game_id, question_id);
