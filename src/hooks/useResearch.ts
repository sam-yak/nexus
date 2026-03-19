"use client";

import { useState, useCallback, useRef } from "react";
import {
  Message,
  Source,
  KnowledgeGraph,
  Contradiction,
  ResearchStep,
  SubQuery,
  ResearchDepth,
  FollowUpQuestion,
} from "@/types";

interface UseResearchReturn {
  messages: Message[];
  sources: Source[];
  graph: KnowledgeGraph;
  contradictions: Contradiction[];
  isResearching: boolean;
  currentSteps: ResearchStep[];
  activeSubQueries: SubQuery[];
  followUpQuestions: FollowUpQuestion[];
  depth: ResearchDepth;
  setDepth: (depth: ResearchDepth) => void;
  sendQuery: (query: string) => Promise<void>;
  clearConversation: () => void;
}

export function useResearch(): UseResearchReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [graph, setGraph] = useState<KnowledgeGraph>({ nodes: [], edges: [] });
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<ResearchStep[]>([]);
  const [activeSubQueries, setActiveSubQueries] = useState<SubQuery[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([]);
  const [depth, setDepth] = useState<ResearchDepth>("standard");
  const abortRef = useRef<AbortController | null>(null);

  const sendQuery = useCallback(
    async (query: string) => {
      if (isResearching) return;

      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: query,
        timestamp: Date.now(),
      };

      const assistantMsgId = `msg-${Date.now()}-assistant`;
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        sources: [],
        citations: [],
        researchSteps: [],
        subQueries: [],
        followUpQuestions: [],
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsResearching(true);
      setCurrentSteps([]);
      setActiveSubQueries([]);
      setFollowUpQuestions([]);

      const conversationHistory = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      abortRef.current = new AbortController();

      try {
        const response = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            conversationHistory,
            existingGraph: graph.nodes.length > 0 ? graph : undefined,
            depth,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedText = "";
        let latestSources: Source[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);

            try {
              const event = JSON.parse(jsonStr);

              switch (event.type) {
                case "step":
                  setCurrentSteps((prev) => [...prev, event.data]);
                  break;

                case "subquery":
                  setActiveSubQueries((prev) => {
                    const existing = prev.findIndex((sq) => sq.query === event.data.query);
                    if (existing >= 0) {
                      const updated = [...prev];
                      updated[existing] = event.data;
                      return updated;
                    }
                    return [...prev, event.data];
                  });
                  break;

                case "sources_update":
                  latestSources = event.data;
                  setSources(event.data);
                  break;

                case "graph_update":
                  setGraph(event.data);
                  break;

                case "contradiction":
                  setContradictions((prev) => [...prev, event.data]);
                  break;

                case "follow_up_questions":
                  setFollowUpQuestions(event.data);
                  break;

                case "synthesis_chunk":
                  accumulatedText += event.data.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                    )
                  );
                  break;

                case "done":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            content: accumulatedText,
                            sources: event.data.sources || latestSources,
                            graph: event.data.graph,
                            contradictions: event.data.contradictions,
                            followUpQuestions: event.data.followUpQuestions || [],
                            isStreaming: false,
                          }
                        : m
                    )
                  );
                  if (event.data.graph) setGraph(event.data.graph);
                  if (event.data.followUpQuestions) setFollowUpQuestions(event.data.followUpQuestions);
                  break;

                case "error":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: `Research failed: ${event.data.message}`, isStreaming: false }
                        : m
                    )
                  );
                  break;
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: `Error: ${(error as Error).message}`, isStreaming: false }
                : m
            )
          );
        }
      } finally {
        setIsResearching(false);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
        );
      }
    },
    [isResearching, messages, graph, depth]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setSources([]);
    setGraph({ nodes: [], edges: [] });
    setContradictions([]);
    setCurrentSteps([]);
    setActiveSubQueries([]);
    setFollowUpQuestions([]);
  }, []);

  return {
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
  };
}
