"use client";

import { Contradiction, Source } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface Props {
  contradictions: Contradiction[];
  sources: Source[];
}

export default function ContradictionBanner({ contradictions, sources }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (contradictions.length === 0) return null;

  const getSourceTitle = (sourceId: string) => {
    const source = sources.find((s) => s.id === sourceId);
    return source?.title || "Unknown source";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-[rgba(255,107,107,0.06)] border border-[rgba(255,107,107,0.15)] rounded-xl px-4 py-3 text-left hover:bg-[rgba(255,107,107,0.08)] transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-sm">⚠️</span>
            <span className="text-sm font-medium text-[var(--contradiction)]">
              {contradictions.length} contradiction{contradictions.length > 1 ? "s" : ""} detected
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-[var(--contradiction)] transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-3">
              {contradictions.map((c) => (
                <div
                  key={c.id}
                  className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-4 py-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-full bg-[var(--graph-node-person)] rounded-full shrink-0 mt-1" style={{ minHeight: "1em" }} />
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">&ldquo;{c.claim1.text}&rdquo;</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                          — {getSourceTitle(c.claim1.sourceId)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3">
                      <div className="flex-1 h-px bg-[var(--border)]" />
                      <span className="text-[10px] text-[var(--contradiction)] font-medium">VS</span>
                      <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-full bg-[var(--graph-node-org)] rounded-full shrink-0 mt-1" style={{ minHeight: "1em" }} />
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">&ldquo;{c.claim2.text}&rdquo;</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                          — {getSourceTitle(c.claim2.sourceId)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
