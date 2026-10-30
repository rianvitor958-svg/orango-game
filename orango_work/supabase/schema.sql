-- Execute este arquivo no SQL Editor do seu projeto Supabase.
create table if not exists public.players (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Visitante' check (char_length(nickname) between 1 and 24),
  points integer not null default 0,
  earned_points integer not null default 0,
  games integer not null default 0,
  wins integer not null default 0,
  rewards integer not null default 0,
  safe_tiles integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.game_history (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  event text not null,
  points integer not null default 0,
  details text,
  difficulty text,
  created_at timestamptz not null default now()
);
create table if not exists public.player_achievements (
  player_id uuid not null references public.players(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  primary key(player_id, achievement_key)
);
create index if not exists idx_players_rank on public.players(points desc, wins desc, games desc);
create index if not exists idx_history_player on public.game_history(player_id, id desc);

-- As tabelas são acessadas exclusivamente pelas Netlify Functions usando service role.
-- Não exponha a chave service role no navegador.
alter table public.players enable row level security;
alter table public.game_history enable row level security;
alter table public.player_achievements enable row level security;
revoke all on public.players from anon, authenticated;
revoke all on public.game_history from anon, authenticated;
revoke all on public.player_achievements from anon, authenticated;
