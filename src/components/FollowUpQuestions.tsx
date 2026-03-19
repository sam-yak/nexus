"use client";

import { FollowUpQuestion } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  questions: FollowUpQuestion[];
  onSelect: (question: string) => void;
  isVisible: boolean;
}

export default function FollowUpQuestions({ questions, onSelect, isVisible }: Props) {
  if (!isVisible || questions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="mb-4"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-4 h-px bg-[var(--border-strong)]" />
        <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          Explore further
        </span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
      <div className="grid gap-2">
        <AnimatePresence mode="popLayout">
          {questions.map((q, i) => (
            <motion.button
              key={q.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onSelect(q.text)}
              className="text-left group bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent-muted)] rounded-xl px-4 py-3 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-md bg-[var(--accent-muted)] flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-3 h-3 text-[var(--accent)] group-hover:translate-x-0.5 transition-transform"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-bright)] transition-colors leading-snug">
                    {q.text}
                  </p>
                  {q.reasoning && (
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-1 leading-relaxed">
                      {q.reasoning}
                    </p>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
