-- Accelerate the cosine-distance ORDER BY in match_knowledge_chunks.
-- Keep the RPC's raw embedding <=> query_embedding ordering index-compatible.
create index if not exists knowledge_chunks_embedding_hnsw_cosine_idx
  on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Keep only the KNN distance ordering term so PostgreSQL can use HNSW.
-- Iterative strict scans help satisfy published/threshold filters without losing order.
create or replace function public.match_knowledge_chunks(
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
set hnsw.iterative_scan = 'strict_order'
as $$
  select chunk.id, document.id, document.title, document.source_url, chunk.heading, chunk.content,
    1 - (chunk.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.knowledge_chunks as chunk
  join public.knowledge_documents as document on document.id = chunk.document_id
  where document.published
    and match_threshold between -1 and 1
    and 1 - (chunk.embedding operator(extensions.<=>) query_embedding) >= match_threshold
  order by chunk.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(match_count, 0), 20);
$$;

-- CREATE OR REPLACE preserves the existing grants; restate them as an explicit guard.
revoke all on function public.match_knowledge_chunks(extensions.vector, double precision, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.match_knowledge_chunks(extensions.vector, double precision, integer)
  to authenticated, service_role;
