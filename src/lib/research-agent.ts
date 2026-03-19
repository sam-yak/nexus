import { getAnthropicClient } from "./anthropic";
import { searchWeb } from "./search";
import {
  SubQuery,
  SearchResult,
  Source,
  KnowledgeGraph,
  Contradiction,
  ResearchStep,
  ResearchDepth,
  SourceCredibility,
  FollowUpQuestion,
  DEPTH_CONFIG,
} from "@/types";

// ─── Domain Authority Database ──────────────────────────────────────────────

const DOMAIN_AUTHORITY: Record<string, number> = {
  // Tier 1: Primary sources & top institutions
  "nature.com": 0.95, "science.org": 0.95, "gov": 0.93, "edu": 0.90,
  "who.int": 0.95, "nih.gov": 0.94, "arxiv.org": 0.88,
  "reuters.com": 0.92, "apnews.com": 0.92, "bbc.com": 0.90, "bbc.co.uk": 0.90,
  // Tier 2: Major publications & established outlets
  "nytimes.com": 0.88, "washingtonpost.com": 0.87, "theguardian.com": 0.86,
  "economist.com": 0.89, "ft.com": 0.88, "wsj.com": 0.87,
  "wired.com": 0.82, "arstechnica.com": 0.83, "techcrunch.com": 0.78,
  "bloomberg.com": 0.88, "cnbc.com": 0.80,
  // Tier 3: Good but variable
  "wikipedia.org": 0.75, "medium.com": 0.45, "substack.com": 0.50,
  "reddit.com": 0.35, "quora.com": 0.30,
  // Tier 4: Low authority
  "blogspot.com": 0.20, "wordpress.com": 0.25,
};

function getDomainAuthority(url: string): number {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    // Check exact match
    if (DOMAIN_AUTHORITY[hostname]) return DOMAIN_AUTHORITY[hostname];
    // Check TLD (.gov, .edu)
    const tld = hostname.split(".").pop() || "";
    if (DOMAIN_AUTHORITY[tld]) return DOMAIN_AUTHORITY[tld];
    // Check if it's a subdomain of a known domain
    for (const [domain, score] of Object.entries(DOMAIN_AUTHORITY)) {
      if (hostname.endsWith(`.${domain}`) || hostname === domain) return score;
    }
    return 0.5; // Unknown domain default
  } catch {
    return 0.5;
  }
}

// ─── Stream Event Emitter ───────────────────────────────────────────────────

type EventCallback = (event: { type: string; data: unknown }) => void;

export class ResearchAgent {
  private emit: EventCallback;
  private allSources: Source[] = [];
  private graph: KnowledgeGraph = { nodes: [], edges: [] };
  private contradictions: Contradiction[] = [];
  private conversationHistory: { role: "user" | "assistant"; content: string }[];
  private depth: ResearchDepth;
  private config: typeof DEPTH_CONFIG["standard"];

  constructor(
    emit: EventCallback,
    conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
    depth: ResearchDepth = "standard"
  ) {
    this.emit = emit;
    this.conversationHistory = conversationHistory;
    this.depth = depth;
    this.config = DEPTH_CONFIG[depth];
  }

  // ─── Main Research Pipeline ─────────────────────────────────────────────

  async research(query: string, existingGraph?: KnowledgeGraph): Promise<void> {
    if (existingGraph) {
      this.graph = existingGraph;
    }

    try {
      // Step 1: Plan research based on depth
      this.emitStep("decompose", `Analyzing query (${this.config.label} mode)...`);
      const plan = await this.planResearch(query);

      if (plan.isSimple || this.depth === "quick") {
        // Quick/simple: single search + direct answer
        this.emitStep("search", "Searching the web...");
        const results = await searchWeb(query, this.config.searchResultsPerQuery);
        this.indexSources(results);

        // Credibility scoring
        this.emitStep("credibility", "Scoring source credibility...");
        this.scoreCredibility(results);

        this.emitStep("extract", "Extracting knowledge...");
        await this.extractAndBuildGraph(results, query);

        this.emitStep("synthesize", "Generating answer...");
        await this.synthesize(query, results);
      } else {
        // Multi-hop research
        const subQueries = plan.subQueries.slice(0, this.config.maxSubQueries);

        // Step 2: Parallel sub-queries
        this.emitStep("search", `Researching ${subQueries.length} angles simultaneously...`);

        const allResults: SearchResult[] = [];
        await Promise.all(
          subQueries.map(async (sq) => {
            this.emit({ type: "subquery", data: { ...sq, status: "searching" } });

            try {
              const results = await searchWeb(sq.query, this.config.searchResultsPerQuery);
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

        // Step 3: Source credibility scoring
        this.emitStep("credibility", "Scoring source credibility...");
        this.scoreCredibility(allResults);

        // Step 4: Extract entities and build knowledge graph
        this.emitStep("extract", "Extracting entities and relationships...");
        await this.extractAndBuildGraph(allResults, query);

        // Step 5: Gap analysis + follow-up hops
        if (this.config.enableGapAnalysis && subQueries.length > 1) {
          this.emitStep("analyze", "Identifying knowledge gaps...");
          const followUps = await this.identifyGaps(query, allResults);
          const limitedFollowUps = followUps.slice(0, this.config.maxFollowUps);

          if (limitedFollowUps.length > 0) {
            this.emitStep("follow-up", `Performing ${limitedFollowUps.length} follow-up searches...`);

            for (const fq of limitedFollowUps) {
              try {
                const results = await searchWeb(fq, 3);
                allResults.push(...results);
                this.indexSources(results);
                this.scoreCredibility(results);
                await this.extractAndBuildGraph(results, fq);
              } catch {
                // Continue even if follow-up fails
              }
            }
          }
        }

        // Step 6: Contradiction detection
        if (this.config.enableContradictions) {
          this.emitStep("analyze", "Checking for contradictions...");
          await this.detectContradictions(allResults);
        }

        // Step 7: Synthesize final answer
        this.emitStep("synthesize", "Synthesizing comprehensive answer...");
        await this.synthesize(query, allResults);
      }

      // Step 8: Generate follow-up questions
      this.emitStep("analyze", "Generating follow-up questions...");
      const followUpQuestions = await this.generateFollowUps(query);

      this.emit({
        type: "follow_up_questions",
        data: followUpQuestions,
      });

      this.emit({
        type: "done",
        data: {
          sources: this.allSources,
          graph: this.graph,
          contradictions: this.contradictions,
          followUpQuestions,
        },
      });
    } catch (error) {
      this.emit({
        type: "error",
        data: { message: error instanceof Error ? error.message : "Research failed" },
      });
    }
  }

  // ─── Source Credibility Scoring ──────────────────────────────────────────

  private scoreCredibility(results: SearchResult[]): void {
    // Build cross-reference map: count how many sources mention similar content
    const contentFingerprints = results.map((r) => {
      const words = r.content.toLowerCase().split(/\s+/).filter((w) => w.length > 5);
      return new Set(words);
    });

    for (const source of this.allSources) {
      if (source.credibility) continue; // Already scored

      const authority = getDomainAuthority(source.url);

      // Cross-reference: how many other sources share significant content overlap
      const sourceIdx = results.findIndex((r) => r.url === source.url);
      let crossRefCount = 0;
      if (sourceIdx >= 0 && contentFingerprints[sourceIdx]) {
        const thisFingerprint = contentFingerprints[sourceIdx];
        for (let j = 0; j < contentFingerprints.length; j++) {
          if (j === sourceIdx) continue;
          const other = contentFingerprints[j];
          let overlap = 0;
          thisFingerprint.forEach((word) => {
            if (other.has(word)) overlap++;
          });
          if (overlap > 5) crossRefCount++;
        }
      }

      // Recency: assume current year sources are most recent (simple heuristic)
      const recency = 0.7; // Default; would need publish dates for accuracy

      const overall = (authority * 0.4) + (Math.min(crossRefCount / 3, 1) * 0.35) + (recency * 0.25);

      source.credibility = {
        domain: (() => {
          try { return new URL(source.url).hostname.replace("www.", ""); } catch { return "unknown"; }
        })(),
        authority,
        crossReferenceCount: crossRefCount,
        recency,
        overall: Math.round(overall * 100) / 100,
      };
    }

    this.emit({ type: "sources_update", data: this.allSources });
  }

  // ─── Query Planning ─────────────────────────────────────────────────────

  private async planResearch(query: string): Promise<{
    isSimple: boolean;
    subQueries: SubQuery[];
  }> {
    if (this.depth === "quick") {
      return {
        isSimple: true,
        subQueries: [{ query, reasoning: "Quick mode — direct search", status: "pending" as const, results: [] }],
      };
    }

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are a research planning assistant. Given a user query, determine if it's simple (single search needed) or complex (needs multi-angle research).

For complex queries, decompose into ${this.config.maxSubQueries} focused sub-queries that together cover the topic comprehensively.

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

      for (const node of extracted.nodes || []) {
        const existing = this.graph.nodes.find(
          (n) => n.label.toLowerCase() === node.label.toLowerCase()
        );
        if (existing) {
          existing.confidence = (existing.confidence + node.confidence) / 2;
          const newSourceIds = results.slice(0, 3).map((_, i) => `src-${this.allSources.length - results.length + i}`);
          existing.sourceIds = Array.from(new Set([...existing.sourceIds, ...newSourceIds]));
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

  private async identifyGaps(originalQuery: string, results: SearchResult[]): Promise<string[]> {
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

Return 0-${this.config.maxFollowUps} follow-up queries. Only include truly important gaps.`,
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

  // ─── Follow-Up Question Generation ──────────────────────────────────────

  private async generateFollowUps(query: string): Promise<FollowUpQuestion[]> {
    const client = getAnthropicClient();

    const graphSummary = this.graph.nodes
      .slice(0, 15)
      .map((n) => `${n.label} (${n.type})`)
      .join(", ");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: `You generate insightful follow-up research questions based on a completed research query and the knowledge graph entities discovered.

Respond ONLY with valid JSON (no markdown fences):
{
  "questions": [
    { "text": "follow-up question text", "reasoning": "why this is worth exploring" }
  ]
}

Generate exactly 3 follow-up questions that:
- Dig deeper into interesting entities or relationships discovered
- Explore implications or consequences of the findings
- Connect the topic to adjacent domains or recent developments
Make them specific and compelling, not generic.`,
      messages: [
        {
          role: "user",
          content: `Original query: "${query}"\nEntities discovered: ${graphSummary}\nContradictions found: ${this.contradictions.length}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    try {
      const result = JSON.parse(text.replace(/```json?\n?|\n?```/g, "").trim());
      return (result.questions || []).slice(0, 3);
    } catch {
      return [];
    }
  }

  // ─── Synthesis ──────────────────────────────────────────────────────────

  private async synthesize(query: string, results: SearchResult[]): Promise<void> {
    const client = getAnthropicClient();

    // Sort sources by credibility for better synthesis
    const rankedSources = [...this.allSources].sort(
      (a, b) => (b.credibility?.overall || 0.5) - (a.credibility?.overall || 0.5)
    );

    const sourcesText = results
      .slice(0, 12)
      .map((r, i) => {
        const source = this.allSources.find((s) => s.url === r.url);
        const cred = source?.credibility?.overall
          ? ` [credibility: ${Math.round(source.credibility.overall * 100)}%]`
          : "";
        return `[${i + 1}] ${r.title} (${r.url})${cred}\n${r.content.slice(0, 500)}`;
      })
      .join("\n\n");

    const contradictionsText =
      this.contradictions.length > 0
        ? `\n\nKnown contradictions between sources:\n${this.contradictions.map((c) => `- "${c.claim1.text}" vs "${c.claim2.text}"`).join("\n")}`
        : "";

    const credibilityNote =
      this.depth !== "quick"
        ? "\n- Weight information from higher-credibility sources more heavily\n- If low-credibility sources make unique claims, note the source quality"
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
- Use markdown formatting (headers, bold, lists) for readability${credibilityNote}
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
