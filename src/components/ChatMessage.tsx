"use client";

import { Message, Source } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import React from "react";

interface Props {
  message: Message;
  sources: Source[];
}

function CitationRenderer({ text, sources }: { text: string; sources: Source[] }) {
  // Replace [N] citation patterns with interactive elements
  const parts = text.split(/(\[\d+\])/g);

  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const num = parseInt(match[1]);
          const source = sources[num - 1];
          if (source) {
            return (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="citation-ref"
                title={source.title}
              >
                {num}
              </a>
            );
          }
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

export default function ChatMessage({ message, sources }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end mb-6"
      >
        <div className="max-w-[75%] bg-[var(--accent-muted)] border border-[rgba(200,162,255,0.12)] rounded-2xl rounded-br-md px-5 py-3">
          <p className="text-[15px] text-[var(--accent-bright)] leading-relaxed">
            {message.content}
          </p>
        </div>
      </motion.div>
    );
  }

  const allSources = message.sources || sources;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="max-w-full">
        {/* Answer content */}
        {message.content && (
          <div className="markdown-content text-[15px] leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => {
                  const text = React.Children.toArray(children)
                    .map((child) => (typeof child === "string" ? child : ""))
                    .join("");
                  if (text.includes("[") && /\[\d+\]/.test(text)) {
                    return (
                      <p>
                        <CitationRenderer text={text} sources={allSources} />
                      </p>
                    );
                  }
                  return <p>{children}</p>;
                },
                li: ({ children }) => {
                  const text = React.Children.toArray(children)
                    .map((child) => (typeof child === "string" ? child : ""))
                    .join("");
                  if (text.includes("[") && /\[\d+\]/.test(text)) {
                    return (
                      <li>
                        <CitationRenderer text={text} sources={allSources} />
                      </li>
                    );
                  }
                  return <li>{children}</li>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Streaming cursor */}
        {message.isStreaming && (
          <span className="inline-flex gap-1 ml-1 align-middle">
            <span className="loading-dot w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="loading-dot w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="loading-dot w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          </span>
        )}
      </div>
    </motion.div>
  );
}
