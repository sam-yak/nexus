# Nexus — Multi-Hop Research Engine with Live Knowledge Graph

> An AI-powered research interface that goes far beyond simple search. Nexus autonomously decomposes complex questions into parallel sub-queries, builds an interactive knowledge graph from extracted entities, detects contradictions between sources, and synthesizes cited answers in real-time.

![Nexus](https://img.shields.io/badge/Next.js-14-black?style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square) ![Claude](https://img.shields.io/badge/Claude-Sonnet_4-purple?style=flat-square)

---

## The Creative Leap: Multi-Hop Agentic Research

While a basic Perplexity clone is a single search → synthesize pipeline, **Nexus** implements an autonomous research agent with:

### 1. Intelligent Query Decomposition
Complex questions are analyzed and broken into 2-4 orthogonal sub-queries that together provide comprehensive coverage. Simple factual questions skip this step entirely for speed.

### 2. Parallel Multi-Hop Search
Sub-queries execute simultaneously, and the agent analyzes results for **knowledge gaps** — automatically performing follow-up searches to fill them. This creates a multi-hop research chain that follows leads like a human researcher would.

### 3. Real-Time Knowledge Graph Construction
As results stream in, entities (people, organizations, technologies, events, etc.) and their relationships are extracted using LLM-powered NLP. These are rendered as an interactive force-directed graph using D3.js with:
- **Type-coded nodes** (color + icon per entity type)
- **Confidence halos** (opacity reflects how well-supported the entity is)
- **Draggable** nodes for manual exploration
- **Zoom/pan** for navigating complex graphs
- **Live updates** as new entities are discovered

### 4. Contradiction Detection
The agent cross-references claims across sources to identify conflicts. Contradictions are:
- Highlighted with a visual banner in the chat
- Marked as dashed red edges in the knowledge graph
- Explicitly addressed in the synthesized answer

### 5. Streaming Synthesis with Citations
The final answer streams in real-time with `[N]` citations that render as interactive, clickable badges linked to the source.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React)                           │
│  ┌─────────┐  ┌───────────────┐  ┌──────────┐  ┌───────────┐    │
│  │  Chat   │  │  Knowledge    │  │  Source  │  │Contradict.│    │
│  │  View   │  │  Graph (D3)   │  │  Panel   │  │  Banner   │    │
│  └────┬────┘  └───────┬───────┘  └────┬─────┘  └─────┬─────┘    │ 
│       └───────────────┴───────────────┴──────────────┘          │
│                           │ SSE Stream                          │
└───────────────────────────┼─────────────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                  API Route (Next.js)                          │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                   ResearchAgent                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐  │ │
│  │  │  Query   │→ │ Parallel │→ │  Entity Extraction &   │  │ │
│  │  │ Planner  │  │ Search   │  │  Graph Building (LLM)  │  │ │
│  │  └──────────┘  └──────────┘  └────────────────────────┘  │ │
│  │       │              │                    │              │ │
│  │       ▼              ▼                    ▼              │ │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐  │ │
│  │  │   Gap    │→ │ Follow-  │→ │   Contradiction        │  │ │
│  │  │ Analysis │  │ up Hops  │  │   Detection (LLM)      │  │ │
│  │  └──────────┘  └──────────┘  └────────────────────────┘  │ │
│  │                      │                                   │ │
│  │                      ▼                                   │ │
│  │              ┌──────────────┐                            │ │
│  │              │  Streaming   │                            │ │
│  │              │  Synthesis   │                            │ │
│  │              └──────────────┘                            │ │
│  └──────────────────────────────────────────────────────────┘ │
│       │                │                │                     │
│  ┌────┴────┐    ┌──────┴──────┐   ┌─────┴─────┐               │
│  │ Claude  │    │   Tavily    │   │  Claude   │               │
│  │Sonnet 4 │    │ Search API  │   │ Sonnet 4  │               │
│  │(planner)│    │             │   │(synthesis)│               │
│  └─────────┘    └─────────────┘   └───────────┘               │
└───────────────────────────────────────────────────────────────┘
```

### Key Technical Decisions

| Decision | Why |
|---|---|
| **Server-Sent Events** over WebSockets | Unidirectional streaming is all we need; SSE is simpler, auto-reconnects, and works through proxies. |
| **Tavily** over SerpAPI/Google | Native "advanced" search depth, faster, cheaper, returns clean content snippets. |
| **Claude Sonnet 4** | Best price/performance for structured extraction. Used for planning, NER, contradiction detection, AND synthesis. |
| **D3 Force Graph** over vis.js/cytoscape | Full control over rendering, animations, and styling. Performance is fine for <200 nodes. |
| **Next.js App Router** | API routes co-located with frontend, streaming support out of the box, easy Vercel deployment. |
| **Parallel sub-queries** | 3-4x faster than sequential. Bounded concurrency keeps API costs predictable. |

---

## Getting Started

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)
- A [Tavily API key](https://tavily.com/) (free tier: 1000 searches/month)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/nexus.git
cd nexus
npm install
```

### Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy to Vercel

```bash
npx vercel
```

Set environment variables in Vercel dashboard, then deploy.

---

## Project Structure

```
nexus/
├── src/
│   ├── app/
│   │   ├── api/research/route.ts   # SSE streaming research endpoint
│   │   ├── globals.css              # Design system + theme
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Main application
│   ├── components/
│   │   ├── ChatInput.tsx            # Query input with keyboard shortcuts
│   │   ├── ChatMessage.tsx          # Message with citation rendering
│   │   ├── ContradictionBanner.tsx  # Expandable contradiction display
│   │   ├── KnowledgeGraph.tsx       # D3 force-directed graph
│   │   ├── ResearchProgress.tsx     # Live research step timeline
│   │   └── SourcePanel.tsx          # Source cards with favicons
│   ├── hooks/
│   │   └── useResearch.ts           # Research state + SSE management
│   ├── lib/
│   │   ├── anthropic.ts             # Claude client
│   │   ├── research-agent.ts        # Core multi-hop research agent
│   │   └── search.ts                # Tavily search wrapper
│   └── types/
│       └── index.ts                 # Full TypeScript type system
├── .env.example
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Design Philosophy

**Editorial darkness.** The UI uses Instrument Serif for display text, DM Sans for body, and JetBrains Mono for technical elements. The color palette is intentionally constrained — nearly monochromatic with a single purple accent — to keep focus on the content and the knowledge graph.

The graph uses a subtle radial gradient background, glow filters on nodes, and confidence-based opacity to create visual hierarchy without clutter.

---

## Trade-offs & Next Steps

### What I'd build next
1. **Persistent graph** — Save knowledge graphs to a database so follow-up sessions build on prior research
2. **Source credibility scoring** — Use domain authority, publication date, and cross-reference count to weight sources
3. **Export** — PDF reports with embedded graph snapshots and full citation lists
4. **Collaborative research** — Real-time multiplayer research sessions via WebSockets
5. **Graph-based querying** — Click a node to ask "tell me more about this entity" using the graph as context

### Known limitations
- Tavily free tier caps at 1000 searches/month
- Very broad queries can produce noisy graphs (>50 nodes)
- Contradiction detection works best for factual claims, less well for opinion-based content
- No persistent storage between sessions (stateless)
