// ─── Core Search & Research Types ────────────────────────────────────────────

export type ResearchDepth = "quick" | "standard" | "deep";

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface SourceCredibility {
  domain: string;
  authority: number;
  crossReferenceCount: number;
  recency: number;
  overall: number;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  snippet: string;
  relevance: number;
  credibility?: SourceCredibility;
}

export interface SubQuery {
  query: string;
  reasoning: string;
  status: "pending" | "searching" | "complete" | "failed";
  results: SearchResult[];
}

export interface ResearchStep {
  type: "decompose" | "search" | "analyze" | "follow-up" | "synthesize" | "extract" | "credibility";
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

export interface FollowUpQuestion {
  text: string;
  reasoning: string;
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
  followUpQuestions?: FollowUpQuestion[];
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
  depth?: ResearchDepth;
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
    | "follow_up_questions"
    | "sources_update"
    | "done"
    | "error";
  data: unknown;
}

export interface DoneEvent {
  type: "done";
  data: {
    finalAnswer: string;
    sources: Source[];
    graph: KnowledgeGraph;
    contradictions: Contradiction[];
    followUpQuestions: FollowUpQuestion[];
  };
}

// ─── Depth Configuration ────────────────────────────────────────────────────

export const DEPTH_CONFIG: Record<ResearchDepth, {
  maxSubQueries: number;
  maxFollowUps: number;
  searchResultsPerQuery: number;
  enableContradictions: boolean;
  enableGapAnalysis: boolean;
  label: string;
  description: string;
}> = {
  quick: {
    maxSubQueries: 1,
    maxFollowUps: 0,
    searchResultsPerQuery: 4,
    enableContradictions: false,
    enableGapAnalysis: false,
    label: "Quick",
    description: "Single search, fast answer",
  },
  standard: {
    maxSubQueries: 3,
    maxFollowUps: 1,
    searchResultsPerQuery: 5,
    enableContradictions: true,
    enableGapAnalysis: true,
    label: "Standard",
    description: "Multi-angle research with verification",
  },
  deep: {
    maxSubQueries: 5,
    maxFollowUps: 3,
    searchResultsPerQuery: 6,
    enableContradictions: true,
    enableGapAnalysis: true,
    label: "Deep",
    description: "Exhaustive research with full analysis",
  },
};
