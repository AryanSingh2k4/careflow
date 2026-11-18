import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

const demoIdPattern = /^demo-[a-z0-9]+(?:-[a-z0-9]+)*$/;

type PageProps = { params: Promise<{ slug: string }> };

export default async function KnowledgeSourcePage({ params }: PageProps) {
  const { slug } = await params;
  if (!demoIdPattern.test(slug)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: document, error: documentError } = await supabase
    .from('knowledge_documents')
    .select('id, title, source_url, published')
    .eq('id', slug)
    .eq('published', true)
    .maybeSingle();
  if (documentError || !document || document.id !== slug ||
      document.source_url !== `https://careflow.example/knowledge/${slug}`) notFound();

  const { data: chunks, error: chunksError } = await supabase
    .from('knowledge_chunks')
    .select('ordinal, heading, content')
    .eq('document_id', slug)
    .order('ordinal', { ascending: true });
  if (chunksError || !chunks?.length) notFound();

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-on-surface md:px-12">
      <article className="mx-auto max-w-3xl rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-7 shadow-sm md:p-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Fictional demo source</p>
        <h1 className="mb-4 text-3xl font-bold text-primary">{document.title}</h1>
        <p className="mb-8 rounded-xl bg-secondary-container p-4 text-on-secondary-container">
          This page contains synthetic CareFlow Demo Clinic material for testing. It is not real clinic policy or medical guidance.
        </p>
        <div className="space-y-8">
          {chunks.map((chunk) => (
            <section key={chunk.ordinal}>
              {chunk.heading ? <h2 className="mb-3 text-xl font-semibold">{chunk.heading}</h2> : null}
              <p className="whitespace-pre-wrap leading-7">{chunk.content}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
