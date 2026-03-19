"use client";

import { ResearchStep, SubQuery } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

const STEP_ICONS: Record<string, string> = {
  decompose: "🔍",
  search: "🌐",
  analyze: "🧠",
  "follow-up": "🔄",
  synthesize: "✍️",
  extract: "🕸️",
};

interface Props {
  steps: ResearchStep[];
  subQueries: SubQuery[];
  isActive: boolean;
}

export default function ResearchProgress({ steps, subQueries, isActive }: Props) {
  if (steps.length === 0 && !isActive) return null;

  return (
    <div className="w-full mb-4">
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-3">
        {/* Steps */}
        <AnimatePresence mode="popLayout">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            return (
              <motion.div
                key={`${step.type}-${step.timestamp}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-3 py-1.5"
              >
                <span className="text-sm shrink-0 mt-0.5">
                  {STEP_ICONS[step.type] || "•"}
                </span>
                <span
                  className={`text-sm ${
                    isLast && isActive
                      ? "text-[var(--accent)] step-active"
                      : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {step.description}
                </span>
                {isLast && isActive && (
                  <span className="flex gap-1 ml-auto">
                    <span className="loading-dot w-1 h-1 rounded-full bg-[var(--accent)]" />
                    <span className="loading-dot w-1 h-1 rounded-full bg-[var(--accent)]" />
                    <span className="loading-dot w-1 h-1 rounded-full bg-[var(--accent)]" />
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Sub-queries */}
        {subQueries.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[var(--border)]">
            <div className="grid gap-1.5">
              <AnimatePresence mode="popLayout">
                {subQueries.map((sq, i) => (
                  <motion.div
                    key={sq.query}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2.5 text-xs"
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        sq.status === "complete"
                          ? "bg-[var(--confidence-high)]"
                          : sq.status === "searching"
                            ? "bg-[var(--accent)] step-active"
                            : sq.status === "failed"
                              ? "bg-[var(--confidence-low)]"
                              : "bg-[var(--text-tertiary)]"
                      }`}
                    />
                    <span className="text-[var(--text-secondary)] truncate">
                      {sq.query}
                    </span>
                    {sq.status === "complete" && sq.results.length > 0 && (
                      <span className="text-[var(--text-tertiary)] shrink-0 ml-auto">
                        {sq.results.length} results
                      </span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
