-- Chat history for the "Ask agent" page (ChatGPT-style conversation list).
-- Run this once in the Supabase SQL editor, same as schema.sql and the
-- other *_functions.sql files in this folder -- there's no automated
-- migration runner in this project.

create table agent_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null default 'New chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references agent_conversations on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  file_url text,
  file_label text,
  created_at timestamptz default now()
);

create index agent_conversations_user_id_idx on agent_conversations (user_id, updated_at desc);
create index agent_messages_conversation_id_idx on agent_messages (conversation_id, created_at);

-- Keeps the sidebar's "most recently active first" ordering correct
-- without every call site having to remember to bump it by hand.
create or replace function touch_agent_conversation() returns trigger as $$
begin
  update agent_conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger agent_messages_touch_conversation
  after insert on agent_messages
  for each row execute function touch_agent_conversation();

alter table agent_conversations enable row level security;
alter table agent_messages enable row level security;

create policy "Users manage their own conversations"
  on agent_conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage messages in their own conversations"
  on agent_messages
  for all
  using (
    exists (
      select 1 from agent_conversations
      where agent_conversations.id = agent_messages.conversation_id
        and agent_conversations.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from agent_conversations
      where agent_conversations.id = agent_messages.conversation_id
        and agent_conversations.user_id = auth.uid()
    )
  );
