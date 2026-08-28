"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { GraphNode, GraphEdge } from "@/lib/queries";
import { ZoomIn, ZoomOut, RotateCcw, ExternalLink } from "lucide-react";
import Link from "next/link";

interface SimulationNode extends d3.SimulationNodeDatum, GraphNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: SimulationNode | string;
  target: SimulationNode | string;
  type: string;
  label: string;
}

interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  height?: number | string;
  onNodeSelect?: (node: GraphNode) => void;
  className?: string;
}

export default function GraphView({
  nodes: rawNodes,
  edges: rawEdges,
  height = 520,
  onNodeSelect,
  className = "",
}: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>(null);

  const handleZoom = useCallback((factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg
      .transition()
      .duration(500)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  }, []);

  useEffect(() => {
    if (!svgRef.current || rawNodes.length === 0) return;

    const width = containerRef.current?.clientWidth || 800;
    const svgHeight = typeof height === "number" ? height : 520;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");

    ["CITES", "AUTHORED", "ABOUT", "PUBLISHED_IN", "DEFAULT"].forEach(
      (type) => {
        let color = "#94a3b8";
        if (type === "AUTHORED") color = "#a855f7";
        if (type === "ABOUT") color = "#10b981";
        if (type === "CITES") color = "#0ea5e9";
        if (type === "PUBLISHED_IN") color = "#f59e0b";

        defs
          .append("marker")
          .attr("id", `arrow-${type}`)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 26) // Distance from target center
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .attr("fill", color);
      },
    );

    const g = svg.append("g").attr("class", "graph-container");

    // Configure Zoom & Pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Deep copy data for D3 simulation
    const nodes: SimulationNode[] = rawNodes.map((n) => ({ ...n }));
    const edges: SimulationLink[] = rawEdges.map((e) => ({ ...e }));

    // D3 Force Simulation Setup
    const simulation = d3
      .forceSimulation<SimulationNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimulationNode, SimulationLink>(edges)
          .id((d) => d.id)
          .distance((d) => {
            if (d.type === "ABOUT") return 110;
            if (d.type === "AUTHORED") return 90;
            return 130;
          }),
      )
      .force("charge", d3.forceManyBody().strength(-380))
      .force("center", d3.forceCenter(width / 2, svgHeight / 2))
      .force("collision", d3.forceCollide().radius(36));

    // Render Edges
    const linkGroup = g.append("g").attr("class", "links");
    const link = linkGroup
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("stroke", (d) => {
        if (d.type === "AUTHORED") return "#c084fc";
        if (d.type === "ABOUT") return "#34d399";
        if (d.type === "CITES") return "#38bdf8";
        return "#94a3b8";
      })
      .attr("stroke-width", 1.8)
      .attr("stroke-opacity", 0.65)
      .attr("stroke-dasharray", (d) => (d.type === "ABOUT" ? "3,3" : "none"))
      .attr("marker-end", (d) => `url(#arrow-${d.type || "DEFAULT"})`);

    // Render Edge Labels
    const edgeLabelGroup = g.append("g").attr("class", "edge-labels");
    const edgeLabels = edgeLabelGroup
      .selectAll("text")
      .data(edges)
      .enter()
      .append("text")
      .attr(
        "class",
        "text-[9px] fill-slate-400 font-mono tracking-tight pointer-events-none select-none",
      )
      .attr("text-anchor", "middle")
      .text((d) => d.type.toLowerCase());

    // Render Nodes
    const nodeGroup = g.append("g").attr("class", "nodes");
    const node = nodeGroup
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "cursor-pointer")
      .call(
        d3
          .drag<SVGGElement, SimulationNode>()
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
          }),
      );

    // Node outer glow / circle
    node
      .append("circle")
      .attr("r", (d) =>
        d.label === "Paper" ? 18 : d.label === "Author" ? 16 : 14,
      )
      .attr("fill", (d) => d.color || "#3b82f6")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2.5)
      .attr(
        "class",
        "transition-transform duration-150 filter drop-shadow-sm hover:scale-110",
      );

    // Node type abbreviation — SVG text rendering is unreliable for emoji cross-browser
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("class", "fill-white text-[10px] font-bold pointer-events-none select-none")
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .text((d) => {
        if (d.label === "Paper") return "P";
        if (d.label === "Author") return "A";
        if (d.label === "Concept") return "C";
        if (d.label === "Venue") return "V";
        return "·";
      });

    node
      .append("text")
      .attr("dx", 0)
      .attr("dy", (d) => (d.label === "Paper" ? 28 : 25))
      .attr("text-anchor", "middle")
      .attr(
        "class",
        "fill-slate-700 dark:fill-slate-200 text-[11px] font-medium pointer-events-none select-none drop-shadow-sm",
      )
      .text((d) => {
        const text = d.title || d.name || d.id;
        return text.length > 22 ? text.substring(0, 20) + "…" : text;
      });

    // Interaction handlers
    node
      .on("mouseenter", (_, d) => {
        setHoveredNode(d);
      })
      .on("mouseleave", () => {
        setHoveredNode(null);
      })
      .on("click", (_, d) => {
        setSelectedNode(d);
        if (onNodeSelect) onNodeSelect(d);
      });

    // Simulation tick update
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimulationNode).x || 0)
        .attr("y1", (d) => (d.source as SimulationNode).y || 0)
        .attr("x2", (d) => (d.target as SimulationNode).x || 0)
        .attr("y2", (d) => (d.target as SimulationNode).y || 0);

      edgeLabels
        .attr(
          "x",
          (d) =>
            (((d.source as SimulationNode).x || 0) +
              ((d.target as SimulationNode).x || 0)) /
            2,
        )
        .attr(
          "y",
          (d) =>
            (((d.source as SimulationNode).y || 0) +
              ((d.target as SimulationNode).y || 0)) /
              2 -
            3,
        );

      node.attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [rawNodes, rawEdges, height, onNodeSelect]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 backdrop-blur-sm ${className}`}
      style={{ height }}
    >
      {/* Controls Overlay */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 rounded-lg bg-white/90 p-1.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/90 dark:ring-slate-800">
        <button
          onClick={() => handleZoom(1.25)}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleZoom(0.8)}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2.5 rounded-lg bg-white/90 px-3 py-2 text-xs font-medium shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/90 dark:ring-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span className="text-slate-600 dark:text-slate-300">Paper</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
          <span className="text-slate-600 dark:text-slate-300">Author</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-600 dark:text-slate-300">Concept</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-600 dark:text-slate-300">Venue</span>
        </div>
      </div>

      {hoveredNode && (
        <div className="pointer-events-none absolute top-3 left-3 z-20 max-w-sm rounded-lg bg-slate-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-sm border border-slate-700">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: hoveredNode.color || "#38bdf8" }}
            />
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">
              {hoveredNode.label}
            </span>
            {hoveredNode.year && (
              <span className="rounded bg-slate-800 px-1.5 py-0.2 font-mono text-[10px] text-slate-300">
                {hoveredNode.year}
              </span>
            )}
          </div>
          <p className="mt-1 font-medium text-slate-100">
            {hoveredNode.title || hoveredNode.name || hoveredNode.id}
          </p>
        </div>
      )}

      {selectedNode && (
        <div className="absolute bottom-3 right-3 z-20 max-w-xs rounded-xl bg-white p-4 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                {selectedNode.label}
              </span>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                {selectedNode.title || selectedNode.name}
              </h4>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            {selectedNode.label === "Paper" && (
              <Link
                href={`/papers/${selectedNode.id}`}
                className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 transition-colors"
              >
                View Paper <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
            {selectedNode.label === "Author" && (
              <Link
                href={`/authors/${selectedNode.id}`}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 transition-colors"
              >
                View Author <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
            {selectedNode.label === "Concept" && (
              <Link
                href={`/researchtopics?topic=${encodeURIComponent(selectedNode.name || "")}`}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                Explore Topic <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="h-full w-full select-none cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}
