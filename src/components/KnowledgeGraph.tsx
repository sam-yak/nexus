"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";
import { KnowledgeGraph as KGType, GraphNode, GraphEdge, Contradiction } from "@/types";

const NODE_COLORS: Record<string, string> = {
  person: "#60a5fa",
  organization: "#f59e0b",
  concept: "#c8a2ff",
  event: "#34d399",
  location: "#fb7185",
  technology: "#38bdf8",
  claim: "#fbbf24",
};

const NODE_ICONS: Record<string, string> = {
  person: "👤",
  organization: "🏢",
  concept: "💡",
  event: "📅",
  location: "📍",
  technology: "⚡",
  claim: "📌",
};

interface Props {
  graph: KGType;
  contradictions: Contradiction[];
  onNodeClick?: (node: GraphNode) => void;
}

export default function KnowledgeGraph({ graph, contradictions, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Build and update graph
  useEffect(() => {
    if (!svgRef.current || graph.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.selectAll("*").remove();

    // Defs for gradients and markers
    const defs = svg.append("defs");

    // Glow filter
    const filter = defs.append("filter").attr("id", "glow");
    filter
      .append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Arrow marker
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .append("path")
      .attr("d", "M 0,-5 L 10,0 L 0,5")
      .attr("fill", "rgba(255,255,255,0.15)");

    // Zoom
    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Center initially
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8));

    // Resolve edges to use node objects for D3
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, { ...n }]));
    const nodes = Array.from(nodeMap.values());
    const edges: (GraphEdge & { source: any; target: any })[] = graph.edges
      .filter((e) => nodeMap.has(e.source as string) && nodeMap.has(e.target as string))
      .map((e) => ({
        ...e,
        source: e.source,
        target: e.target,
      }));

    // Mark contradiction edges
    for (const c of contradictions) {
      for (const edge of edges) {
        const srcId = typeof edge.source === "string" ? edge.source : edge.source.id;
        const tgtId = typeof edge.target === "string" ? edge.target : edge.target.id;
        if (c.nodeIds.includes(srcId) || c.nodeIds.includes(tgtId)) {
          edge.isContradiction = true;
        }
      }
    }

    // Simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, any>(edges)
          .id((d) => d.id)
          .distance(100)
          .strength(0.4)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(0, 0))
      .force("collision", d3.forceCollide().radius(35))
      .alphaDecay(0.02);

    simulationRef.current = simulation;

    // Edges
    const link = g
      .append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", (d) =>
        d.isContradiction ? "var(--contradiction)" : "rgba(255,255,255,0.08)"
      )
      .attr("stroke-width", (d) => (d.isContradiction ? 2 : 1))
      .attr("stroke-dasharray", (d) => (d.isContradiction ? "5,5" : "none"))
      .attr("marker-end", "url(#arrowhead)");

    // Edge labels
    const edgeLabels = g
      .append("g")
      .selectAll("text")
      .data(edges)
      .join("text")
      .attr("class", "graph-edge-label")
      .text((d) => d.label)
      .attr("opacity", 0.6);

    // Node groups
    const node = g
      .append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node outer ring (confidence indicator)
    node
      .append("circle")
      .attr("r", 22)
      .attr("fill", "none")
      .attr("stroke", (d) => NODE_COLORS[d.type] || "#c8a2ff")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", (d) => d.confidence)
      .attr("filter", "url(#glow)");

    // Node inner circle
    node
      .append("circle")
      .attr("r", 16)
      .attr("fill", (d) => {
        const color = NODE_COLORS[d.type] || "#c8a2ff";
        return color + "20";
      })
      .attr("stroke", (d) => NODE_COLORS[d.type] || "#c8a2ff")
      .attr("stroke-width", 1);

    // Node icon
    node
      .append("text")
      .text((d) => NODE_ICONS[d.type] || "•")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", "12px");

    // Node label
    node
      .append("text")
      .attr("class", "graph-node-label")
      .text((d) => d.label.length > 20 ? d.label.slice(0, 18) + "…" : d.label)
      .attr("dy", 32);

    // Hover + click
    node
      .on("mouseenter", (_, d) => setHoveredNode(d))
      .on("mouseleave", () => setHoveredNode(null))
      .on("click", (_, d) => onNodeClick?.(d));

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      edgeLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graph, contradictions, dimensions, onNodeClick]);

  if (graph.nodes.length === 0) {
    return (
      <div
        ref={containerRef}
        className="graph-container h-full flex items-center justify-center rounded-xl border border-[var(--border)]"
      >
        <div className="text-center px-6">
          <div className="text-2xl mb-2 opacity-40">🕸️</div>
          <p className="text-[var(--text-tertiary)] text-sm font-body">
            Knowledge graph will appear here as research progresses
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="graph-container h-full relative rounded-xl border border-[var(--border)] overflow-hidden">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
        {Object.entries(NODE_COLORS).map(([type, color]) => {
          const hasType = graph.nodes.some((n) => n.type === type);
          if (!hasType) return null;
          return (
            <div
              key={type}
              className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)] bg-[var(--surface-1)] px-2 py-1 rounded-full border border-[var(--border)]"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: color }}
              />
              {type}
            </div>
          );
        })}
        {contradictions.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--contradiction)] bg-[var(--surface-1)] px-2 py-1 rounded-full border border-[var(--border)]">
            <div className="w-2 h-2 rounded-full bg-[var(--contradiction)]" />
            contradiction
          </div>
        )}
      </div>

      {/* Node count */}
      <div className="absolute top-3 right-3 text-[10px] text-[var(--text-tertiary)] bg-[var(--surface-1)] px-2 py-1 rounded-full border border-[var(--border)]">
        {graph.nodes.length} nodes · {graph.edges.length} edges
      </div>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="absolute top-3 left-3 bg-[var(--surface-2)] border border-[var(--border-strong)] rounded-lg px-3 py-2 max-w-[240px] shadow-xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{NODE_ICONS[hoveredNode.type]}</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {hoveredNode.label}
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)]">
            <span className="capitalize">{hoveredNode.type}</span>
            <span className="mx-1.5">·</span>
            <span>
              Confidence:{" "}
              <span
                style={{
                  color:
                    hoveredNode.confidence > 0.7
                      ? "var(--confidence-high)"
                      : hoveredNode.confidence > 0.4
                        ? "var(--confidence-mid)"
                        : "var(--confidence-low)",
                }}
              >
                {Math.round(hoveredNode.confidence * 100)}%
              </span>
            </span>
            <span className="mx-1.5">·</span>
            <span>{hoveredNode.sourceIds.length} sources</span>
          </div>
          {hoveredNode.properties && Object.keys(hoveredNode.properties).length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-[var(--border)]">
              {Object.entries(hoveredNode.properties).map(([k, v]) => (
                <div key={k} className="text-[10px]">
                  <span className="text-[var(--text-tertiary)]">{k}:</span>{" "}
                  <span className="text-[var(--text-secondary)]">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
