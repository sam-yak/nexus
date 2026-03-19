import { getAnthropicClient } from "./anthropic";
import { searchWeb } from "./search";
import {
  SubQuery,
  SearchResult,
  Source,
  KnowledgeGraph,
  Contradiction,
  ResearchStep,
} from "@/types";

// ─── Stream Event Emitter ───────────────────────────────────────────────────

type EventCallback = (event: { type: string; data: unknown }) => void;

export class ResearchAgent {
  private emit: EventCallback;
  private allSources: Source[] = [];
  private graph: KnowledgeGraph = { nodes: [], edges: [] };
  private contradictions: Contradiction[] = [];
  private conversationHistory: { role: "user" | "assistant"; content: string }[];

  constructor(emit: EventCallback, conversationHistory: { role: "user" | "assistant"; content: string }[] = []) {
    this.emit = emit;
    this.conversationHistory = conversationHistory;
  }

  // ─── Main Research Pipeline ─────────────────────────────────────────────

  async research(query: string, existingGraph?: KnowledgeGraph): Promise<void> {
    if (existingGraph) {
      this.graph = existingGraph;
    }

    try {
      // Step 1: Determine if this needs multi-hop research or a simple answer
      this.emitStep("decompose", "Analyzing query complexity...");
      const plan = await this.planResearch(query);

      if (plan.isSimple) {
        // Simple query: single search + direct answer
        this.emitStep("search", "Searching the web...");
        const results = await searchWeb(query, 6);
        this.indexSources(results);

        this.emitStep("extract", "Extracting knowledge...");
        await this.extractAndBuildGraph(results, query);

        this.emitStep("synthesize", "Generating answer...");
        await this.synthesize(query, results);
      } else {
        // Complex query: multi-hop research
        const subQueries = plan.subQueries;

        // Step 2: Execute sub-queries in parallel
        this.emitStep("search", `Researching ${subQueries.length} angles simultaneously...`);

        const allResults: SearchResult[] = [];
        await Promise.all(
          subQueries.map(async (sq) => {
            this.emit({
              type: "subquery",
              data: { ...sq, status: "searching" },
            });

            try {
              const results = await searchWeb(sq.query, 5);
              sq.results = results;
              sq.status = "complete";
              allResults.push(...results);

              this.emit({ type: "subquery", data: sq });
              this.indexSources(results);
            } catch {
              sq.status = "failed";
              this.emit({ type: "subquery", data: sq });
            }
          })
        );

        // Step 3: Extract entities and build knowledge graph
        this.emitStep("extract", "Extracting entities and relationships...");
        await this.extractAndBuildGraph(allResults, query);

        // Step 4: Identify gaps and do follow-up searches
        if (plan.subQueries.length > 1) {
          this.emitStep("analyze", "Identifying knowledge gaps...");
          const followUps = await this.identifyGaps(query, allResults);

          if (followUps.length > 0) {
            this.emitStep("follow-up", `Performing ${followUps.length} follow-up searches...`);

            for (const fq of followUps) {
              try {
                const results = await searchWeb(fq, 3);
                allResults.push(...results);
                this.indexSources(results);
                await this.extractAndBuildGraph(results, fq);
              } catch {
                // Continue even if follow-up fails
              }
            }
          }
        }

        // Step 5: Detect contradictions
        this.emitStep("analyze", "Checking for contradictions...");
        await this.detectContradictions(allResults);

        // Step 6: Synthesize final answer
        this.emitStep("synthesize", "Synthesizing comprehensive answer...");
        await this.synthesize(query, allResults);
      }

      this.emit({
        type: "done",
        data: {
          sources: this.allSources,
          graph: this.graph,
          contradictions: this.contradictions,
        },
      });
    } catch (error) {
      this.emit({
        type: "error",
        data: { message: error instanceof Error ? error.message : "Research failed" },
      });
    }
  }

  // ─── Query Planning ─────────────────────────────────────────────────────

  private async planResearch(query: string): Promise<{
    isSimple: boolean;
    subQueries: SubQuery[];
  }> {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are a research planning assistant. Given a user query, determine if it's simple (single search needed) or complex (needs multi-angle research).

For complex queries, decompose into 2-4 focused sub-queries that together cover the topic comprehensively.

Respond ONLY with valid JSON (no markdown fences):
{
  "isSimple": boolean,
  "subQueries": [
    { "query": "search query text", "reasoning": "why this angle matters" }
  ]
}

For simple queries, include exactly one subQuery with the direct search.
Simple queries: factual lookups, definitions, simple current events.
Complex queries: comparisons, analysis, controversial topics, multi-faceted questions.`,
      messages: [
        ...this.conversationHistory.slice(-4),
        { role: "user", content: query },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    try {
      const plan = JSON.parse(text.replace(/```json?\n?|\n?```/g, "").trim());
      return {
        isSimple: plan.isSimple,
        subQueries: (plan.subQueries || []).map((sq: { query: string; reasoning: string }) => ({
          query: sq.query,
          reasoning: sq.reasoning,
          status: "pending" as const,
          results: [],
        })),
      };
    } catch {
      return {
        isSimple: true,
        subQueries: [{ query, reasoning: "Direct search", status: "pending" as const, results: [] }],
      };
    }
  }

  // ─── Entity Extraction & Graph Building ─────────────────────────────────

  private async extractAndBuildGraph(results: SearchResult[], context: string): Promise<void> {
    const client = getAnthropicClient();

    const sourceSnippets = results
      .slice(0, 8)
      .map((r, i) => `[Source ${i}] ${r.title}\n${r.content.slice(0, 600)}`)
      .join("\n\n");

    const existingNodeLabels = this.graph.nodes.map((n) => n.label).join(", ");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `You are a knowledge graph extraction engine. Extract entities and relationships from search results.

Existing graph nodes: [${existingNodeLabels}]

Respond ONLY with valid JSON (no markdown fences):
{
  "nodes": [
    {
      "label": "Entity Name",
      "type": "person|organization|concept|event|location|technology|claim",
      "confidence": 0.0-1.0,
      "properties": { "key": "value" }
    }
  ],
  "edges": [
    {
      "source": "Entity Name 1",
      "target": "Entity Name 2",
      "label": "relationship description",
      "weight": 0.0-1.0
    }
  ]
}

Rules:
- Extract 3-10 entities most relevant to the query context
- Include meaningful relationships between entities
- Confidence reflects how well-supported the entity is across sources
- If an entity matches an existing node, use the EXACT same label
- Focus on factual, verifiable entities and relationships
- "claim" type is for disputed or notable assertions`,
      messages: [
        {
          role: "user",
          content: `Context query: "${context}"\n\nSources:\n${sourceSnippets}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    try {
      const extracted = JSON.parse(text.replace(/```json?\n?|\n?```/g, "").trim());

      // Merge new nodes
      for (const node of extracted.nodes || []) {
        const existing = this.graph.nodes.find(
          (n) => n.label.toLowerCase() === node.label.toLowerCase()
        );
        if (existing) {
          // Update confidence (weighted average)
          existing.confidence = (existing.confidence + node.confidence) / 2;
          // Merge source IDs
          const newSourceIds = results.slice(0, 3).map((_, i) => `src-${this.allSources.length - results.length + i}`);
          existing.sourceIds = [...new Set([...existing.sourceIds, ...newSourceIds])];
        } else {
          const sourceIds = results.slice(0, 3).map((_, i) => `src-${this.allSources.length - results.length + i}`);
          this.graph.nodes.push({
            id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            label: node.label,
            type: node.type || "concept",
            sourceIds: sourceIds,
            confidence: node.confidence || 0.5,
            properties: node.properties || {},
          });
        }
      }

      // Add new edges
      for (const edge of extracted.edges || []) {
        const sourceNode = this.graph.nodes.find(
          (n) => n.label.toLowerCase() === edge.source.toLowerCase()
        );
        const targetNode = this.graph.nodes.find(
          (n) => n.label.toLowerCase() === edge.target.toLowerCase()
        );

        if (sourceNode && targetNode) {
          const existingEdge = this.graph.edges.find(
            (e) => e.source === sourceNode.id && e.target === targetNode.id
          );

          if (!existingEdge) {
            this.graph.edges.push({
              id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              source: sourceNode.id,
              target: targetNode.id,
              label: edge.label,
              weight: edge.weight || 0.5,
              isContradiction: false,
              sourceIds: [],
            });
          }
        }
      }

      this.emit({ type: "graph_update", data: { ...this.graph } });
    } catch {
      // Graph extraction failed, continue without
    }
  }

  // ─── Gap Identification ─────────────────────────────────────────────────

  private async identifyGaps(
    originalQuery: string,
    results: SearchResult[]
  ): Promise<string[]> {
    const client = getAnthropicClient();

    const summaries = results
      .slice(0, 10)
      .map((r) => `- ${r.title}: ${r.content.slice(0, 200)}`)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: `You identify knowledge gaps in research results. Given the original question and current findings, determine if there are important angles not yet covered.

Respond ONLY with valid JSON (no markdown fences):
{
  "gaps": ["follow-up search query 1", "follow-up search query 2"],
  "reasoning": "why these gaps matter"
}

Return 0-2 follow-up queries. Only include truly important gaps.`,
      messages: [
        {
          role: "user",
          content: `Original question: "${originalQuery}"\n\nCurrent findings:\n${summaries}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    try {
      const gaps = JSON.parse(text.replace(/```json?\n?|\n?```/g, "").trim());
      return gaps.gaps || [];
    } catch {
      return [];
    }
  }

  // ─── Contradiction Detection ────────────────────────────────────────────

  private async detectContradictions(results: SearchResult[]): Promise<void> {
    const client = getAnthropicClient();

    const claims = results
      .slice(0, 10)
      .map((r, i) => `[Source ${i}: ${r.title}] ${r.content.slice(0, 400)}`)
      .join("\n\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You detect contradictions between sources. Find claims that directly conflict.

Respond ONLY with valid JSON (no markdown fences):
{
  "contradictions": [
    {
      "claim1": { "text": "claim from source A", "sourceIndex": 0 },
      "claim2": { "text": "contradicting claim from source B", "sourceIndex": 1 },
      "topic": "what the contradiction is about"
    }
  ]
}

Only include genuine contradictions, not just different perspectives or additional info. Return empty array if no contradictions found.`,
      messages: [
        { role: "user", content: `Analyze these sources for contradictions:\n\n${claims}` },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    try {
      const detected = JSON.parse(text.replace(/```json?\n?|\n?```/g, "").trim());

      for (const c of detected.contradictions || []) {
        const contradiction: Contradiction = {
          id: `contra-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          claim1: {
            text: c.claim1.text,
            sourceId: this.allSources[c.claim1.sourceIndex]?.id || "",
          },
          claim2: {
            text: c.claim2.text,
            sourceId: this.allSources[c.claim2.sourceIndex]?.id || "",
          },
          nodeIds: [],
        };

        this.contradictions.push(contradiction);
        this.emit({ type: "contradiction", data: contradiction });
      }
    } catch {
      // No contradictions found or parsing failed
    }
  }

  // ─── Synthesis ──────────────────────────────────────────────────────────

  private async synthesize(query: string, results: SearchResult[]): Promise<void> {
    const client = getAnthropicClient();

    const sourcesText = results
      .slice(0, 10)
      .map((r, i) => `[${i + 1}] ${r.title} (${r.url})\n${r.content.slice(0, 500)}`)
      .join("\n\n");

    const contradictionsText =
      this.contradictions.length > 0
        ? `\n\nKnown contradictions between sources:\n${this.contradictions.map((c) => `- "${c.claim1.text}" vs "${c.claim2.text}"`).join("\n")}`
        : "";

    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `You are a research assistant synthesizing search results into a comprehensive answer. You write clearly and authoritatively.

Rules:
- Cite sources using [N] notation where N is the source number
- If there are contradictions between sources, acknowledge them explicitly
- Be thorough but concise
- Structure your response with clear sections if the topic warrants it
- Use markdown formatting (headers, bold, lists) for readability
- End with a brief assessment of confidence/reliability of the information`,
      messages: [
        ...this.conversationHistory.slice(-4),
        {
          role: "user",
          content: `Question: ${query}\n\nSources:\n${sourcesText}${contradictionsText}\n\nProvide a comprehensive, well-cited answer.`,
        },
      ],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        this.emit({
          type: "synthesis_chunk",
          data: { text: event.delta.text, sources: this.allSources },
        });
      }
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private indexSources(results: SearchResult[]): void {
    for (const r of results) {
      if (!this.allSources.find((s) => s.url === r.url)) {
        this.allSources.push({
          id: `src-${this.allSources.length}`,
          title: r.title,
          url: r.url,
          snippet: r.content.slice(0, 200),
          relevance: r.score,
        });
      }
    }
    this.emit({ type: "sources_update", data: this.allSources });
  }

  private emitStep(type: ResearchStep["type"], description: string): void {
    this.emit({
      type: "step",
      data: { type, description, timestamp: Date.now() },
    });
  }
}
