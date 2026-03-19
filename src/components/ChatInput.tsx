"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ResearchDepth, DEPTH_CONFIG } from "@/types";

interface Props {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  placeholder?: string;
  depth?: ResearchDepth;
  onDepthChange?: (depth: ResearchDepth) => void;
  showDepth?: boolean;
}

const DEPTHS: ResearchDepth[] = ["quick", "standard", "deep"];
const DEPTH_ICONS: Record<ResearchDepth, string> = {
  quick: "⚡",
  standard: "🔍",
  deep: "🧬",
};

export default function ChatInput({ onSubmit, isLoading, placeholder, depth, onDepthChange, showDepth = false }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      <div className="bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--border-strong)] focus-within:border-[var(--accent)] focus-within:border-opacity-40 rounded-2xl transition-all shadow-lg" style={{ boxShadow: '0 8px 32px var(--input-shadow)' }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask anything..."}
          disabled={isLoading}
          rows={1}
          className="w-full bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-[15px] px-5 pt-4 pb-3 resize-none outline-none leading-relaxed disabled:opacity-50"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-2">
            {/* Depth selector inline */}
            {showDepth && depth && onDepthChange && (
              <div className="flex items-center gap-0.5 bg-[var(--surface-2)] rounded-lg p-0.5 border border-[var(--border)]">
                {DEPTHS.map((d) => {
                  const config = DEPTH_CONFIG[d];
                  const isActive = depth === d;
                  return (
                    <button
                      key={d}
                      onClick={() => onDepthChange(d)}
                      disabled={isLoading}
                      className={`relative flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all disabled:opacity-50 ${
                        isActive
                          ? "text-[var(--text-primary)] bg-[var(--surface-3)]"
                          : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                      }`}
                      title={config.description}
                    >
                      <span className="text-[10px]">{DEPTH_ICONS[d]}</span>
                      <span className="hidden sm:inline">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {!showDepth && (
              <span className="text-[10px] text-[var(--text-tertiary)] font-mono pl-2">
                {isLoading ? "Researching..." : "Enter ↵"}
              </span>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--accent)] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
