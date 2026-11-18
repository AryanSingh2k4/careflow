create schema if not exists extensions;
create extension if not exists vector with schema extensions;

do $$
begin
  if to_regtype('extensions.vector') is null then
    raise exception 'CareFlow expects pgvector in schema extensions, but it is installed elsewhere. Inspect pg_depend references to the vector extension; if it is safe to relocate, run ALTER EXTENSION vector SET SCHEMA extensions, then retry. Do not drop and recreate the extension.';
  end if;
end;
$$;

create table public.knowledge_documents (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 100),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  source_url text not null check (source_url ~ '^https://[^/@[:space:]]+(/[^[:space:]]*)?$' and char_length(source_url) <= 2048),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  revision uuid not null default gen_random_uuid(),
  published boolean not null
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references public.knowledge_documents(id) on delete cascade,
  ordinal integer not null check (ordinal >= 1),
  heading text check (char_length(btrim(heading)) between 1 and 300),
  content text not null check (char_length(btrim(content)) between 1 and 1200),
  embedding extensions.vector(768) not null check (extensions.vector_norm(embedding) > 0),
  unique (document_id, ordinal)
);

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

revoke all on public.knowledge_documents, public.knowledge_chunks from public, anon, authenticated, service_role;
grant usage on schema extensions to authenticated, service_role;
grant select (id, title, source_url, published) on public.knowledge_documents to authenticated;
grant select on public.knowledge_chunks to authenticated;
grant select, insert, update on public.knowledge_documents to service_role;
grant select, insert, delete on public.knowledge_chunks to service_role;

create policy "Authenticated users can read published knowledge documents"
  on public.knowledge_documents for select to authenticated using (published);

create policy "Authenticated users can read published knowledge chunks"
  on public.knowledge_chunks for select to authenticated using (
    exists (
      select 1 from public.knowledge_documents as document
      where document.id = knowledge_chunks.document_id and document.published
    )
  );

create function public.match_knowledge_chunks(
  query_embedding extensions.vector(768),
  match_threshold double precision,
  match_count integer
)
returns table (
  id uuid,
  document_id text,
  title text,
  source_url text,
  heading text,
  content text,
  similarity double precision
)
language sql
stable
strict
security invoker
set search_path = ''
as $$
  select chunk.id, document.id, document.title, document.source_url, chunk.heading, chunk.content,
    1 - (chunk.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.knowledge_chunks as chunk
  join public.knowledge_documents as document on document.id = chunk.document_id
  where document.published
    and match_threshold between -1 and 1
    and 1 - (chunk.embedding operator(extensions.<=>) query_embedding) >= match_threshold
  order by chunk.embedding operator(extensions.<=>) query_embedding, document.id, chunk.ordinal
  limit least(greatest(match_count, 0), 20);
$$;

create function public.publish_knowledge_document(
  target_document_id text,
  document_title text,
  document_source_url text,
  document_content_hash text,
  expected_revision uuid,
  chunks jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_document public.knowledge_documents%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_document_id, 4850));
  select * into current_document from public.knowledge_documents where id = target_document_id;

  if current_document.published and current_document.content_hash = document_content_hash then
    return 'unchanged';
  end if;

  if current_document.revision is distinct from expected_revision then
    raise exception 'Knowledge document changed during ingestion' using errcode = '40001';
  end if;

  if jsonb_typeof(chunks) is distinct from 'array' then
    raise exception 'Knowledge chunks must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(chunks) not between 1 and 100 then
    raise exception 'Expected between 1 and 100 knowledge chunks' using errcode = '22023';
  end if;

  insert into public.knowledge_documents (id, title, source_url, content_hash, published)
  values (target_document_id, document_title, document_source_url, document_content_hash, true)
  on conflict (id) do update set
    title = excluded.title,
    source_url = excluded.source_url,
    content_hash = excluded.content_hash,
    revision = gen_random_uuid(),
    published = true;

  delete from public.knowledge_chunks where document_id = target_document_id;

  insert into public.knowledge_chunks (document_id, ordinal, heading, content, embedding)
  select target_document_id, chunk.ordinal, chunk.item ->> 'heading', chunk.item ->> 'content',
    (chunk.item ->> 'embedding')::extensions.vector(768)
  from jsonb_array_elements(chunks) with ordinality as chunk(item, ordinal);

  return 'published';
end;
$$;

create function public.retire_knowledge_document(target_document_id text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  was_published boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_document_id, 4850));
  select published into was_published from public.knowledge_documents where id = target_document_id;

  if not found then
    return 'missing';
  end if;

  update public.knowledge_documents
  set published = false, revision = gen_random_uuid()
  where id = target_document_id;

  delete from public.knowledge_chunks where document_id = target_document_id;

  return case when was_published then 'retired' else 'unchanged' end;
end;
$$;

revoke all on function public.match_knowledge_chunks(extensions.vector, double precision, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.match_knowledge_chunks(extensions.vector, double precision, integer)
  to authenticated, service_role;

revoke all on function public.publish_knowledge_document(text, text, text, text, uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.publish_knowledge_document(text, text, text, text, uuid, jsonb)
  to service_role;

revoke all on function public.retire_knowledge_document(text)
  from public, anon, authenticated, service_role;
grant execute on function public.retire_knowledge_document(text) to service_role;

