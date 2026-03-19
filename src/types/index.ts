// ─── Core Search & Research Types ────────────────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  snippet: string;
  relevance: number;
}

export interface SubQuery {
  query: string;
  reasoning: string;
  status: "pending" | "searching" | "complete" | "failed";
  results: SearchResult[];
}

export interface ResearchStep {
  type: "decompose" | "search" | "analyze" | "follow-up" | "synthesize" | "extract";
  description: string;
  timestamp: number;
  data?: unknown;
}

// ─── Knowledge Graph Types ──────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  type: "person" | "organization" | "concept" | "event" | "location" | "technology" | "claim";
  sourceIds: string[];
  confidence: number;
  properties?: Record<string, string>;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number;
  isContradiction: boolean;
  sourceIds: string[];
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Contradiction {
  id: string;
  claim1: { text: string; sourceId: string };
  claim2: { text: string; sourceId: string };
  nodeIds: string[];
}

// ─── Message & Conversation Types ───────────────────────────────────────────

export interface Citation {
  sourceId: string;
  text: string;
  url: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  citations?: Citation[];
  graph?: KnowledgeGraph;
  contradictions?: Contradiction[];
  researchSteps?: ResearchStep[];
  subQueries?: SubQuery[];
  timestamp: number;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  graph: KnowledgeGraph;
  sources: Source[];
  createdAt: number;
}

// ─── API Types ──────────────────────────────────────────────────────────────

export interface ChatRequest {
  query: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  existingGraph?: KnowledgeGraph;
}

export interface ResearchEvent {
  type:
    | "step"
    | "subquery"
    | "search_result"
    | "analysis"
    | "graph_update"
    | "contradiction"
    | "synthesis_chunk"
    | "done"
    | "error";
  data: unknown;
}

export interface ResearchStepEvent {
  type: "step";
  data: ResearchStep;
}

export interface SubQueryEvent {
  type: "subquery";
  data: SubQuery;
}

export interface GraphUpdateEvent {
  type: "graph_update";
  data: KnowledgeGraph;
}

export interface ContradictionEvent {
  type: "contradiction";
  data: Contradiction;
}

export interface SynthesisChunkEvent {
  type: "synthesis_chunk";
  data: { text: string; sources: Source[] };
}

export interface DoneEvent {
  type: "done";
  data: {
    finalAnswer: string;
    sources: Source[];
    graph: KnowledgeGraph;
    contradictions: Contradiction[];
  };
}
