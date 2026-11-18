"use client";

import { ChevronDown, ExternalLink, Library } from "lucide-react";
import type { Message } from "ai/react";
import { extractCitationIds } from "@/lib/citation-markers";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Validates and renders the clinic sources attached to an assistant message.
 * The citation/extraction rules intentionally mirror the previous UI.
 */
export function MessageSources({ message }: { message: Message }) {
  if (message.role !== "assistant" || !Array.isArray(message.annotations)) return null;

  const references = extractCitationIds(message.content);
  if (references.size === 0) return null;

  const sources = new Map<string, { title: string; href: string; internal: boolean }>();
  for (const annotation of message.annotations) {
    if (!isRecord(annotation) || annotation.type !== "clinic-sources" || !Array.isArray(annotation.sources)) {
      continue;
    }

    for (const source of annotation.sources) {
      if (
        !isRecord(source) ||
        typeof source.id !== "string" ||
        !references.has(source.id) ||
        typeof source.title !== "string" ||
        !source.title.trim() ||
        typeof source.url !== "string" ||
        sources.has(source.id)
      ) {
        continue;
      }

      const internalHref = /^\/knowledge\/(demo-[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(source.url);
      if (internalHref) {
        sources.set(source.id, { title: source.title.trim(), href: source.url, internal: true });
        continue;
      }

      try {
        const url = new URL(source.url);
        if (url.protocol === "https:" && !url.username && !url.password) {
          sources.set(source.id, { title: source.title.trim(), href: url.href, internal: false });
        }
      } catch {
        // Skip malformed source URLs.
      }
    }
  }

  if (sources.size === 0) return null;

  return (
    <details className="group mt-3 border-t border-outline-variant/60 pt-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-label-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface [&::-webkit-details-marker]:hidden">
        <Library className="h-3.5 w-3.5" aria-hidden />
        <span>
          Sources <span className="text-on-surface-variant/70">({sources.size})</span>
        </span>
        <ChevronDown
          className="ml-auto h-3.5 w-3.5 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ul className="mt-2 space-y-1.5">
        {Array.from(sources, ([id, source]) => (
          <li key={id}>
            <a
              href={source.href}
              target={source.internal ? undefined : "_blank"}
              rel={source.internal ? undefined : "noreferrer"}
              className="flex items-start gap-2 rounded-lg px-1.5 py-1 text-[13px] leading-5 text-primary transition-colors hover:bg-primary-container/50"
            >
              <span className="mt-0.5 flex h-4 min-w-4 items-center justify-center rounded bg-primary-container px-1 text-[10px] font-bold text-primary">
                {id}
              </span>
              <span className="min-w-0 flex-1 underline decoration-primary/30 underline-offset-2">
                {source.title}
              </span>
              {source.internal ? null : (
                <ExternalLink className="mt-0.5 h-3 w-3 flex-shrink-0 opacity-60" aria-hidden />
              )}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
