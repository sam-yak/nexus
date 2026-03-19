"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useResearch } from "@/hooks/useResearch";
import { GraphNode } from "@/types";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import ResearchProgress from "@/components/ResearchProgress";
import ChatMessage from "@/components/ChatMessage";
import SourcePanel from "@/components/SourcePanel";
import ContradictionBanner from "@/components/ContradictionBanner";
import ChatInput from "@/components/ChatInput";
import FollowUpQuestions from "@/components/FollowUpQuestions";
import ThemeToggle from "@/components/ThemeToggle";

const EXAMPLE_QUERIES = [
  {
    text: "Compare the approaches of OpenAI, Anthropic, and Google to AI safety",
    icon: "🤖",
  },
  {
    text: "What are the latest breakthroughs in nuclear fusion?",
    icon: "⚛️",
  },
  {
    text: "How does the CHIPS Act affect global semiconductor supply chains?",
    icon: "🔧",
  },
  {
    text: "What is the current state of quantum error correction?",
    icon: "💻",
  },
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
    followUpQuestions,
    depth,
    setDepth,
    sendQuery,
    clearConversation,
  } = useResearch();

  const [rightPanel, setRightPanel] = useState<"graph" | "sources">("graph");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentSteps, followUpQuestions]);

  useEffect(() => {
    if (sources.length > 0 && graph.nodes.length === 0) {
      setRightPanel("sources");
    } else if (graph.nodes.length > 0) {
      setRightPanel("graph");
    }
  }, [sources, graph]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (isResearching) return;
      sendQuery(`Tell me more about ${node.label} and its significance in this context`);
    },
    [isResearching, sendQuery]
  );

  const handleFollowUp = useCallback(
    (question: string) => {
      if (isResearching) return;
      sendQuery(question);
    },
    [isResearching, sendQuery]
  );

  const lastMessage = messages[messages.length - 1];
  const showFollowUps =
    followUpQuestions.length > 0 &&
    !isResearching &&
    lastMessage?.role === "assistant" &&
    !lastMessage?.isStreaming;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--surface-0)]">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[#7c5cbf] flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                </svg>
              </div>
              <h1 className="text-lg font-display text-[var(--text-primary)]">
                Nexus
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {hasMessages && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={clearConversation}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] px-3 py-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-all border border-transparent hover:border-[var(--border)]"
              >
                + New
              </motion.button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat area */}
        <div className={`flex flex-col transition-all duration-300 ${hasMessages ? "w-[60%]" : "w-full"}`}>
          <div className="flex-1 overflow-y-auto">
            {!hasMessages ? (
              /* ─── Landing Page ──────────────────────────────────────── */
              <div className="h-full flex flex-col">
                <div className="flex-1 flex items-center justify-center px-6 hero-gradient">
                  <div className="max-w-2xl w-full">
                    {/* Hero */}
                    <motion.div
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      className="text-center mb-10"
                    >
                      <div className="inline-flex items-center gap-2 bg-[var(--accent-muted)] text-[var(--accent)] text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-[var(--accent-muted)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                        AI-Powered Multi-Hop Research
                      </div>
                      <h2 className="text-5xl sm:text-6xl font-display text-[var(--text-primary)] mb-5 leading-[1.1] tracking-tight">
                        Research that<br />
                        <em className="text-[var(--accent)]">thinks deeper</em>
                      </h2>
                      <p className="text-[var(--text-secondary)] text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
                        Ask complex questions. Nexus decomposes them, searches multiple angles,
                        builds knowledge graphs, and catches contradictions — all in real time.
                      </p>
                    </motion.div>

                    {/* Input */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                      className="mb-8"
                    >
                      <ChatInput
                        onSubmit={sendQuery}
                        isLoading={isResearching}
                        placeholder="Ask a complex question..."
                        depth={depth}
                        onDepthChange={setDepth}
                        showDepth={true}
                      />
                    </motion.div>

                    {/* Example queries */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="grid grid-cols-2 gap-2.5"
                    >
                      {EXAMPLE_QUERIES.map((q, i) => (
                        <motion.button
                          key={q.text}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.35 + i * 0.07 }}
                          onClick={() => sendQuery(q.text)}
                          className="group text-left text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl px-4 py-3 transition-all leading-snug"
                        >
                          <span className="mr-2 text-sm opacity-60 group-hover:opacity-100 transition-opacity">{q.icon}</span>
                          {q.text}
                        </motion.button>
                      ))}
                    </motion.div>

                    {/* Feature pills */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.55 }}
                      className="flex flex-wrap items-center justify-center gap-2 mt-8"
                    >
                      {[
                        { icon: "🔄", label: "Multi-hop search" },
                        { icon: "🕸️", label: "Knowledge graph" },
                        { icon: "⚠️", label: "Contradiction detection" },
                        { icon: "🛡️", label: "Source credibility" },
                        { icon: "🧭", label: "Smart follow-ups" },
                      ].map((f, i) => (
                        <motion.div
                          key={f.label}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.6 + i * 0.05 }}
                          className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] bg-[var(--surface-1)] px-2.5 py-1 rounded-full border border-[var(--border)]"
                        >
                          <span>{f.icon}</span>
                          {f.label}
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                </div>

                {/* Footer */}
                <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-0)] px-6 py-3">
                  <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      Built with Claude &amp; Tavily
                    </span>
                    <div className="flex items-center gap-4">
                      <a
                        href="https://github.com/sam-yak/nexus"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                      </a>
                      <a
                        href="https://linkedin.com/in/sam-agarwal-ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn
                      </a>
                    </div>
                  </div>
                </footer>
              </div>
            ) : (
              /* ─── Chat Messages ─────────────────────────────────────── */
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

                <FollowUpQuestions
                  questions={followUpQuestions}
                  onSelect={handleFollowUp}
                  isVisible={showFollowUps}
                />

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Bottom input (when messages exist) */}
          {hasMessages && (
            <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-0)] px-6 py-4">
              <div className="max-w-3xl mx-auto">
                <ChatInput
                  onSubmit={sendQuery}
                  isLoading={isResearching}
                  placeholder="Ask a follow-up question..."
                  depth={depth}
                  onDepthChange={setDepth}
                  showDepth={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── Right Panel ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {hasMessages && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "40%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-l border-[var(--border)] bg-[var(--surface-0)] flex flex-col overflow-hidden"
            >
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
                    <span className="ml-1.5 text-[10px] opacity-60">({graph.nodes.length})</span>
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
                    <span className="ml-1.5 text-[10px] opacity-60">({sources.length})</span>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                {rightPanel === "graph" ? (
                  <div className="h-full p-3">
                    <KnowledgeGraph
                      graph={graph}
                      contradictions={contradictions}
                      onNodeClick={handleNodeClick}
                    />
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto p-4">
                    <SourcePanel sources={sources} />
                  </div>
                )}
              </div>

              {rightPanel === "graph" && graph.nodes.length > 0 && (
                <div className="shrink-0 border-t border-[var(--border)] px-3 py-2 text-center">
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Click any node to explore deeper
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
