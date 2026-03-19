"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useResearch } from "@/hooks/useResearch";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import ResearchProgress from "@/components/ResearchProgress";
import ChatMessage from "@/components/ChatMessage";
import SourcePanel from "@/components/SourcePanel";
import ContradictionBanner from "@/components/ContradictionBanner";
import ChatInput from "@/components/ChatInput";

const EXAMPLE_QUERIES = [
  "Compare the approaches of OpenAI, Anthropic, and Google to AI safety",
  "What are the latest breakthroughs in nuclear fusion and how close are we to commercial viability?",
  "How does the CHIPS Act affect global semiconductor supply chains?",
  "What is the current state of quantum error correction?",
];

export default function Home() {
  const {
    messages,
    sources,
    graph,
    contradictions,
    isResearching,
    currentSteps,
    activeSubQueries,
    sendQuery,
    clearConversation,
  } = useResearch();

  const [rightPanel, setRightPanel] = useState<"graph" | "sources">("graph");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentSteps]);

  // Switch to sources panel when sources arrive and graph is empty
  useEffect(() => {
    if (sources.length > 0 && graph.nodes.length === 0) {
      setRightPanel("sources");
    } else if (graph.nodes.length > 0) {
      setRightPanel("graph");
    }
  }, [sources, graph]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--surface-0)]">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[#7c5cbf] flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                </svg>
              </div>
              <h1 className="text-lg font-display text-[var(--text-primary)]">
                Nexus
              </h1>
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--border)]">
              multi-hop research
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasMessages && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={clearConversation}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] px-3 py-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-all"
              >
                New research
              </motion.button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat area */}
        <div className={`flex flex-col transition-all duration-300 ${hasMessages ? "w-[60%]" : "w-full"}`}>
          <div className="flex-1 overflow-y-auto">
            {!hasMessages ? (
              // ─── Empty State ──────────────────────────────────────────
              <div className="h-full flex items-center justify-center px-6">
                <div className="max-w-2xl w-full">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                  >
                    <h2 className="text-5xl font-display text-[var(--text-primary)] mb-4 leading-tight">
                      Research, <em className="text-[var(--accent)]">connected</em>
                    </h2>
                    <p className="text-[var(--text-secondary)] text-lg max-w-md mx-auto leading-relaxed">
                      Multi-hop search that follows leads, builds knowledge
                      graphs, and detects contradictions across sources.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                    className="mb-8"
                  >
                    <ChatInput
                      onSubmit={sendQuery}
                      isLoading={isResearching}
                      placeholder="Ask a complex question..."
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="grid grid-cols-2 gap-2.5"
                  >
                    {EXAMPLE_QUERIES.map((q, i) => (
                      <motion.button
                        key={q}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 + i * 0.08 }}
                        onClick={() => sendQuery(q)}
                        className="text-left text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl px-4 py-3 transition-all leading-snug"
                      >
                        {q}
                      </motion.button>
                    ))}
                  </motion.div>

                  {/* Feature badges */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center justify-center gap-3 mt-10"
                  >
                    {[
                      { icon: "🔄", label: "Multi-hop" },
                      { icon: "🕸️", label: "Knowledge graph" },
                      { icon: "⚠️", label: "Contradiction detection" },
                      { icon: "📊", label: "Confidence scoring" },
                    ].map((f) => (
                      <div
                        key={f.label}
                        className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] bg-[var(--surface-1)] px-2.5 py-1 rounded-full border border-[var(--border)]"
                      >
                        <span className="text-xs">{f.icon}</span>
                        {f.label}
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>
            ) : (
              // ─── Chat Messages ────────────────────────────────────────
              <div className="px-6 py-6 max-w-3xl mx-auto w-full">
                {messages.map((msg, idx) => (
                  <div key={msg.id}>
                    {msg.role === "assistant" &&
                      msg.contradictions &&
                      msg.contradictions.length > 0 && (
                        <ContradictionBanner
                          contradictions={msg.contradictions}
                          sources={msg.sources || sources}
                        />
                      )}
                    <ChatMessage message={msg} sources={sources} />
                    {/* Show research progress below the streaming assistant message */}
                    {msg.role === "assistant" &&
                      msg.isStreaming &&
                      !msg.content &&
                      idx === messages.length - 1 && (
                        <ResearchProgress
                          steps={currentSteps}
                          subQueries={activeSubQueries}
                          isActive={isResearching}
                        />
                      )}
                  </div>
                ))}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input (when messages exist) */}
          {hasMessages && (
            <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-0)] px-6 py-4">
              <div className="max-w-3xl mx-auto">
                <ChatInput
                  onSubmit={sendQuery}
                  isLoading={isResearching}
                  placeholder="Ask a follow-up question..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Graph + Sources */}
        <AnimatePresence>
          {hasMessages && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "40%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-l border-[var(--border)] bg-[var(--surface-0)] flex flex-col overflow-hidden"
            >
              {/* Panel tabs */}
              <div className="shrink-0 flex border-b border-[var(--border)]">
                <button
                  onClick={() => setRightPanel("graph")}
                  className={`flex-1 text-xs font-medium py-3 transition-colors ${
                    rightPanel === "graph"
                      ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  Knowledge Graph
                  {graph.nodes.length > 0 && (
                    <span className="ml-1.5 text-[10px] opacity-60">
                      ({graph.nodes.length})
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setRightPanel("sources")}
                  className={`flex-1 text-xs font-medium py-3 transition-colors ${
                    rightPanel === "sources"
                      ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  Sources
                  {sources.length > 0 && (
                    <span className="ml-1.5 text-[10px] opacity-60">
                      ({sources.length})
                    </span>
                  )}
                </button>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-hidden">
                {rightPanel === "graph" ? (
                  <div className="h-full p-3">
                    <KnowledgeGraph
                      graph={graph}
                      contradictions={contradictions}
                    />
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto p-4">
                    <SourcePanel sources={sources} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
