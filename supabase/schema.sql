-- Estrutura inicial do Echo. Execute no SQL Editor do projeto Supabase.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '',
  creator_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  type text not null default 'text' check (type in ('text', 'voice')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (space_id, name)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index messages_channel_created_at_idx on public.messages(channel_id, created_at);
create index channels_space_position_idx on public.channels(space_id, position);

alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;

-- Funções auxiliares SECURITY DEFINER para evitar recursão infinita entre tabelas.
-- Essas funções ignoram RLS, quebrando o ciclo spaces ↔ space_members.
create or replace function public.is_space_member(p_space_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.space_members where space_id = p_space_id and user_id = auth.uid());
$$;

create or replace function public.is_space_creator(p_space_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.spaces where id = p_space_id and creator_id = auth.uid());
$$;

-- Perfis contêm apenas dados públicos de exibição.
create policy "authenticated users read profiles" on public.profiles for select to authenticated using (true);
create policy "users create their own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "users update their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "members read their spaces" on public.spaces for select to authenticated using (
  creator_id = (select auth.uid()) or public.is_space_member(id)
);
create policy "users create spaces" on public.spaces for insert to authenticated with check ((select auth.uid()) = creator_id);
create policy "owners update spaces" on public.spaces for update to authenticated using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
create policy "owners delete spaces" on public.spaces for delete to authenticated using (creator_id = (select auth.uid()));

create policy "members read their own membership" on public.space_members for select to authenticated using (
  user_id = (select auth.uid())
);
create policy "creators add themselves as owner" on public.space_members for insert to authenticated with check (
  user_id = (select auth.uid()) and role = 'owner' and public.is_space_creator(space_id)
);
create policy "owners remove members" on public.space_members for delete to authenticated using (
  public.is_space_creator(space_id)
);

create policy "members read channels" on public.channels for select to authenticated using (
  public.is_space_member(channels.space_id)
);
create policy "owners manage channels" on public.channels for all to authenticated using (
  public.is_space_creator(channels.space_id)
) with check (
  public.is_space_creator(channels.space_id)
);

create policy "members read messages" on public.messages for select to authenticated using (
  exists (select 1 from public.channels c join public.space_members m on m.space_id = c.space_id where c.id = messages.channel_id and m.user_id = (select auth.uid()))
);
create policy "members send messages as themselves" on public.messages for insert to authenticated with check (
  author_id = (select auth.uid()) and exists (select 1 from public.channels c join public.space_members m on m.space_id = c.space_id where c.id = messages.channel_id and m.user_id = (select auth.uid()))
);
create policy "authors edit messages" on public.messages for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "authors delete messages" on public.messages for delete to authenticated using (author_id = (select auth.uid()));

alter publication supabase_realtime add table public.messages;

-- Tabela de amizades (adicionada para o sistema de amigos)
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  constraint not_self check (user_id <> friend_id)
);

alter table public.friendships enable row level security;

create policy "Users read their own friendships" on public.friendships
  for select to authenticated
  using (user_id = (select auth.uid()) or friend_id = (select auth.uid()));

create policy "Users insert their own friendships" on public.friendships
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

create policy "Recipient updates friendship status" on public.friendships
  for update to authenticated
  using (friend_id = (select auth.uid()))
  with check (friend_id = (select auth.uid()) and status = 'accepted');

create policy "Users delete their own friendships" on public.friendships
  for delete to authenticated
  using (user_id = (select auth.uid()) or friend_id = (select auth.uid()));

