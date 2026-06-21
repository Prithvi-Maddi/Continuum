'use client';
import { useEffect, useRef, useState } from 'react';
import { useContinuumStore } from '@/hooks/useContinuumStore';
import type { Entity } from '@/lib/types';

const TYPE_COLORS: Record<string, string> = {
  character: '#58a6ff',
  location:  '#3fb950',
  faction:   '#d29922',
  object:    '#bc8cff',
  rule:      '#79c0ff',
  event:     '#f85149',
};

interface Node {
  id: string; label: string; type: string;
  x: number; y: number; vx: number; vy: number;
}
interface Edge { source: string; target: string; count: number }

function buildGraph(entities: Entity[], factEntityIds: string[][]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = entities.slice(0, 60).map((e, i) => {
    const angle = (i / Math.min(entities.length, 60)) * Math.PI * 2;
    const r = 180 + Math.random() * 60;
    return { id: e.id, label: e.name, type: e.type, x: 300 + r * Math.cos(angle), y: 280 + r * Math.sin(angle), vx: 0, vy: 0 };
  });

  const nodeSet = new Set(nodes.map(n => n.id));
  const edgeMap = new Map<string, number>();
  for (const ids of factEntityIds) {
    const valid = ids.filter(id => nodeSet.has(id));
    for (let i = 0; i < valid.length; i++) {
      for (let j = i + 1; j < valid.length; j++) {
        const key = [valid[i], valid[j]].sort().join('::');
        edgeMap.set(key, (edgeMap.get(key) ?? 0) + 1);
      }
    }
  }
  const edges: Edge[] = Array.from(edgeMap.entries()).map(([k, count]) => {
    const [source, target] = k.split('::');
    return { source, target, count };
  });

  return { nodes, edges };
}

function simulate(nodes: Node[], edges: Edge[], width: number, height: number): Node[] {
  const ns = nodes.map(n => ({ ...n }));
  const idx = new Map(ns.map((n, i) => [n.id, i]));

  for (let iter = 0; iter < 250; iter++) {
    const cool = 1 - iter / 250;

    // Repulsion
    for (let a = 0; a < ns.length; a++) {
      for (let b = a + 1; b < ns.length; b++) {
        const dx = ns[b].x - ns[a].x || 0.01;
        const dy = ns[b].y - ns[a].y || 0.01;
        const dist2 = dx * dx + dy * dy;
        const dist = Math.sqrt(dist2) || 1;
        const force = Math.min(1200 / dist2, 8);
        ns[a].vx -= force * dx / dist;
        ns[a].vy -= force * dy / dist;
        ns[b].vx += force * dx / dist;
        ns[b].vy += force * dy / dist;
      }
    }

    // Springs
    for (const e of edges) {
      const ai = idx.get(e.source); const bi = idx.get(e.target);
      if (ai == null || bi == null) continue;
      const dx = ns[bi].x - ns[ai].x;
      const dy = ns[bi].y - ns[ai].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = 100 + 40 / e.count;
      const force = (dist - target) * 0.04;
      ns[ai].vx += force * dx / dist; ns[ai].vy += force * dy / dist;
      ns[bi].vx -= force * dx / dist; ns[bi].vy -= force * dy / dist;
    }

    // Center gravity
    for (const n of ns) {
      n.vx += (width / 2 - n.x) * 0.008;
      n.vy += (height / 2 - n.y) * 0.008;
      n.x = Math.max(28, Math.min(width - 28, n.x + n.vx * cool));
      n.y = Math.max(28, Math.min(height - 28, n.y + n.vy * cool));
      n.vx *= 0.75; n.vy *= 0.75;
    }
  }
  return ns;
}

export function CanonGraph() {
  const { entities, facts } = useContinuumStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 560 });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  // Measure container
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(e => {
      const r = e[0].contentRect;
      setDims({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rebuild graph on data or size change
  useEffect(() => {
    if (entities.length === 0) return;
    const { nodes: raw, edges: rawEdges } = buildGraph(entities, facts.map(f => f.entityIds));
    const settled = simulate(raw, rawEdges, dims.w, dims.h);
    setNodes(settled);
    setEdges(rawEdges);
  }, [entities, facts, dims]);

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const hoveredEdges = hovered
    ? new Set(edges.filter(e => e.source === hovered || e.target === hovered).flatMap(e => [e.source, e.target]))
    : null;

  if (entities.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
        No entities yet.
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Import canon or commit a scene to populate the graph.</span>
      </div>
    );
  }

  return (
    <svg ref={svgRef} width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <filter key={type} id={`glow-${type}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        ))}
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const a = nodeMap.get(e.source); const b = nodeMap.get(e.target);
        if (!a || !b) return null;
        const isActive = hoveredEdges ? hoveredEdges.has(e.source) && hoveredEdges.has(e.target) : false;
        return (
          <line key={i}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={isActive ? 'var(--accent)' : 'var(--border)'}
            strokeWidth={isActive ? Math.min(e.count + 1, 3) : 1}
            strokeOpacity={hovered ? (isActive ? 0.8 : 0.15) : 0.35}
            style={{ transition: 'stroke-opacity 0.2s, stroke 0.2s' }}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map(n => {
        const color = TYPE_COLORS[n.type] ?? '#8b949e';
        const isHov = hovered === n.id;
        const isDim = hovered && !hoveredEdges?.has(n.id) && hovered !== n.id;
        const r = isHov ? 10 : 7;
        return (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(n.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <circle r={r + 4} fill="transparent" />
            <circle r={r} fill={color}
              fillOpacity={isDim ? 0.2 : isHov ? 1 : 0.85}
              filter={isHov ? `url(#glow-${n.type})` : undefined}
              stroke={isHov ? '#fff' : color}
              strokeWidth={isHov ? 1.5 : 0}
              style={{ transition: 'r 0.15s, fill-opacity 0.2s' }}
            />
            {(isHov || nodes.length < 20) && (
              <text
                y={r + 12}
                textAnchor="middle"
                fontSize={isHov ? 11 : 10}
                fill={isDim ? 'var(--text-dim)' : 'var(--text-muted)'}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Legend */}
      {Object.entries(TYPE_COLORS).map(([type, color], i) => (
        <g key={type} transform={`translate(12,${12 + i * 18})`}>
          <circle r={5} fill={color} fillOpacity={0.85} />
          <text x={12} y={4} fontSize={10} fill="var(--text-dim)" style={{ userSelect: 'none' }}>
            {type}
          </text>
        </g>
      ))}
    </svg>
  );
}
