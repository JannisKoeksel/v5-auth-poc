drop schema if exists app_public cascade;
create extension if not exists pgcrypto;
create extension if not exists citext;

create schema app_public;

create table app_public.users (
  id serial primary key,
  username citext not null unique,
  hashed_password text not null, -- I am **VERY HEAVILY** opposed to passwords being stored alongside users, but this is an example of a field to be completely omitted from the API
  email citext not null check (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app_public.organizations (
  id serial primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table app_public.organization_memberships (
  id serial primary key,
  organization_id int not null references app_public.organizations,
  user_id int not null references app_public.users,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (organization_id, user_id)
);

insert into app_public.users
  (id, username, hashed_password, email, is_admin) values
  (1, 'Alice', crypt('4l1c3', gen_salt('bf', 8)), 'alice@example.com', false),
  (2, 'Bob', crypt('808', gen_salt('bf', 8)), 'bob@example.com', false),
  (3, 'Caroline', crypt('C420l1n3', gen_salt('bf', 8)), 'caroline@example.com', true),
  (4, 'Dave', crypt('D4v3', gen_salt('bf', 8)), 'dave@example.com', false);

insert into app_public.organizations
  (id, name) values
  (101, 'Acme Corp'),
  (102, 'Graphile Ltd');

insert into app_public.organization_memberships
  (organization_id, user_id, is_admin) values
  (101, 1, true),
  (102, 1, true),
  (101, 4, true),
  (102, 2, true),
  (102, 3, true);

