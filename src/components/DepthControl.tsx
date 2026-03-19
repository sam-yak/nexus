"use client";

import { ResearchDepth, DEPTH_CONFIG } from "@/types";
import { motion } from "framer-motion";

interface Props {
  depth: ResearchDepth;
  onChange: (depth: ResearchDepth) => void;
  disabled?: boolean;
}

const DEPTHS: ResearchDepth[] = ["quick", "standard", "deep"];

const DEPTH_ICONS: Record<ResearchDepth, string> = {
  quick: "⚡",
  standard: "🔍",
  deep: "🧬",
};

export default function DepthControl({ depth, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-xl p-1 border border-[var(--border)]">
      {DEPTHS.map((d) => {
        const config = DEPTH_CONFIG[d];
        const isActive = depth === d;
        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            disabled={disabled}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
              isActive
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="depth-indicator"
                className="absolute inset-0 bg-[var(--surface-3)] border border-[var(--border-strong)] rounded-lg"
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 text-[11px]">{DEPTH_ICONS[d]}</span>
            <span className="relative z-10">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
