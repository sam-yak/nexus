"use client";

import { Source } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  sources: Source[];
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return "";
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function getCredibilityColor(score: number): string {
  if (score >= 0.7) return "var(--confidence-high)";
  if (score >= 0.4) return "var(--confidence-mid)";
  return "var(--confidence-low)";
}

function getCredibilityLabel(score: number): string {
  if (score >= 0.8) return "High";
  if (score >= 0.6) return "Good";
  if (score >= 0.4) return "Fair";
  return "Low";
}

export default function SourcePanel({ sources }: Props) {
  if (sources.length === 0) return null;

  // Sort by credibility (highest first)
  const sortedSources = [...sources].sort(
    (a, b) => (b.credibility?.overall || 0.5) - (a.credibility?.overall || 0.5)
  );

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider px-1">
        Sources ({sources.length})
      </h3>
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {sortedSources.map((source, i) => {
            const cred = source.credibility;
            const credScore = cred?.overall || 0.5;

            return (
              <motion.a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="block bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-lg px-3 py-2.5 transition-all group"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-[var(--surface-3)] shrink-0 mt-0.5 text-[10px] font-mono font-bold text-[var(--accent)]">
                    {sources.indexOf(source) + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-[var(--text-primary)] font-medium truncate group-hover:text-[var(--accent)] transition-colors">
                      {source.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <img
                        src={getFaviconUrl(source.url)}
                        alt=""
                        className="w-3 h-3 rounded-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                        {getDomain(source.url)}
                      </span>
                    </div>

                    {/* Credibility bar */}
                    {cred && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${credScore * 100}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05 + 0.2 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: getCredibilityColor(credScore) }}
                          />
                        </div>
                        <span
                          className="text-[9px] font-medium shrink-0"
                          style={{ color: getCredibilityColor(credScore) }}
                        >
                          {getCredibilityLabel(credScore)}
                        </span>
                      </div>
                    )}

                    {/* Credibility details on hover-like expansion */}
                    {cred && (
                      <div className="flex items-center gap-3 mt-1.5 text-[9px] text-[var(--text-tertiary)]">
                        <span>Authority: {Math.round(cred.authority * 100)}%</span>
                        <span>·</span>
                        <span>Cross-refs: {cred.crossReferenceCount}</span>
                      </div>
                    )}

                    {source.snippet && (
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5 line-clamp-2 leading-relaxed">
                        {source.snippet}
                      </p>
                    )}
                  </div>
                </div>
              </motion.a>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
