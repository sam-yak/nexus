"use client";

import { Message, Source } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import React, { ReactNode } from "react";

interface Props {
  message: Message;
  sources: Source[];
}

// Transforms citation patterns [N] in a string into clickable links
function transformCitations(text: string, sources: Source[]): ReactNode[] {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const num = parseInt(match[1]);
      const source = sources[num - 1];
      if (source) {
        return (
          
            key={`cite-${i}`}
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
    return <React.Fragment key={`text-${i}`}>{part}</React.Fragment>;
  });
}

// Recursively walks React children, keeping elements intact
// and only transforming citation patterns inside strings
function injectCitations(children: ReactNode, sources: Source[]): ReactNode {
  return React.Children.map(children, (child) => {
    // String node: transform citations
    if (typeof child === "string") {
      if (/\[\d+\]/.test(child)) {
        return <>{transformCitations(child, sources)}</>;
      }
      return child;
    }

    // React element: recurse into its children
    if (React.isValidElement(child)) {
      const element = child as React.ReactElement<{ children?: ReactNode }>;
      if (element.props.children) {
        return React.cloneElement(element, {
          ...element.props,
          children: injectCitations(element.props.children, sources),
        });
      }
      return child;
    }

    return child;
  });
}

// Check if any string content in children contains [N] patterns
function hasCitations(children: ReactNode): boolean {
  let found = false;
  React.Children.forEach(children, (child) => {
    if (typeof child === "string" && /\[\d+\]/.test(child)) {
      found = true;
    }
    if (React.isValidElement(child)) {
      const element = child as React.ReactElement<{ children?: ReactNode }>;
      if (element.props.children && hasCitations(element.props.children)) {
        found = true;
      }
    }
  });
  return found;
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
        {message.content && (
          <div className="markdown-content text-[15px] leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => {
                  if (hasCitations(children)) {
                    return <p>{injectCitations(children, allSources)}</p>;
                  }
                  return <p>{children}</p>;
                },
                li: ({ children }) => {
                  if (hasCitations(children)) {
                    return <li>{injectCitations(children, allSources)}</li>;
                  }
                  return <li>{children}</li>;
                },
                h2: ({ children }) => {
                  if (hasCitations(children)) {
                    return <h2>{injectCitations(children, allSources)}</h2>;
                  }
                  return <h2>{children}</h2>;
                },
                h3: ({ children }) => {
                  if (hasCitations(children)) {
                    return <h3>{injectCitations(children, allSources)}</h3>;
                  }
                  return <h3>{children}</h3>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

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
