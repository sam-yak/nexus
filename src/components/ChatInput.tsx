"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface Props {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSubmit, isLoading, placeholder }: Props) {
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
      <div className="bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--border-strong)] focus-within:border-[var(--accent)] focus-within:border-opacity-40 rounded-2xl transition-all shadow-lg shadow-black/20">
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
          <div className="flex items-center gap-2 pl-2">
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
              {isLoading ? "Researching..." : "Enter to send · Shift+Enter for new line"}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--accent)] text-[var(--surface-0)] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            {isLoading ? (
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray="60"
                  strokeDashoffset="20"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
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
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
