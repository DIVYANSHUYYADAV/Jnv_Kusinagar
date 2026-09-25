"use client";
import { useMemo } from "react";
import type { GraphData, GraphPoint } from "@/types/game";

interface CoordinatePlaneProps {
  data: GraphData;
  width?: number;
  height?: number;
  className?: string;
}

export default function CoordinatePlane({ data, width = 300, height = 300, className = "" }: CoordinatePlaneProps) {
  const range = data.gridRange || 6;
  const padding = 32;
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

  // Convert coordinate to SVG pixel
  const toSvgX = (x: number) => padding + ((x + range) / (2 * range)) * plotW;
  const toSvgY = (y: number) => padding + ((range - y) / (2 * range)) * plotH;

  // Grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = -range; i <= range; i++) {
      const x = toSvgX(i);
      const y = toSvgY(i);
      lines.push(
        <line key={`v${i}`} x1={x} y1={padding} x2={x} y2={height - padding}
          stroke={i === 0 ? "#60A5FA" : "rgba(255,255,255,0.08)"}
          strokeWidth={i === 0 ? 1.5 : 0.5} />,
        <line key={`h${i}`} x1={padding} y1={y} x2={width - padding} y2={y}
          stroke={i === 0 ? "#60A5FA" : "rgba(255,255,255,0.08)"}
          strokeWidth={i === 0 ? 1.5 : 0.5} />
      );
    }
    return lines;
  }, [range, width, height, padding]);

  // Tick labels
  const ticks = useMemo(() => {
    const labels = [];
    for (let i = -range; i <= range; i++) {
      if (i === 0) continue;
      if (i % 2 !== 0 && range > 5) continue; // Skip odd ticks for large ranges
      const x = toSvgX(i);
      const y = toSvgY(i);
      const cx = toSvgX(0);
      const cy = toSvgY(0);
      labels.push(
        <text key={`tx${i}`} x={x} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={9}>{i}</text>,
        <text key={`ty${i}`} x={cx - 10} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize={9}>{i}</text>
      );
    }
    return labels;
  }, [range, width, height, padding]);

  // Polygon path if needed
  const polygonPath = useMemo(() => {
    if (!data.polygon || !data.points.length) return null;
    const pts = data.points.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ");
    return (
      <polygon points={pts} fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.4)"
        strokeWidth={1.5} strokeDasharray="4 2" />
    );
  }, [data]);

  const originX = toSvgX(0);
  const originY = toSvgY(0);

  return (
    <div className={`relative ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="coordinate-svg"
        style={{ background: "rgba(15,23,42,0.6)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}
        aria-label="Coordinate plane graph"
        role="img"
      >
        {/* Grid */}
        {gridLines}

        {/* Axis arrows */}
        <defs>
          <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#60A5FA" />
          </marker>
        </defs>

        {/* X axis with arrow */}
        <line x1={padding - 8} y1={originY} x2={width - padding + 8} y2={originY}
          stroke="#60A5FA" strokeWidth={1.5} markerEnd="url(#arrowBlue)" />
        {/* Y axis with arrow */}
        <line x1={originX} y1={height - padding + 8} x2={originX} y2={padding - 8}
          stroke="#60A5FA" strokeWidth={1.5} markerEnd="url(#arrowBlue)" />

        {/* Axis labels */}
        <text x={width - padding + 14} y={originY + 4} fill="#60A5FA" fontSize={12} fontWeight="bold">x</text>
        <text x={originX} y={padding - 14} fill="#60A5FA" fontSize={12} fontWeight="bold" textAnchor="middle">y</text>

        {/* Tick labels */}
        {ticks}

        {/* Origin label */}
        <text x={originX - 10} y={originY + 14} fill="rgba(255,255,255,0.4)" fontSize={9}>O</text>

        {/* Polygon/shape */}
        {polygonPath}

        {/* Points */}
        {data.points.map((pt, i) => {
          const sx = toSvgX(pt.x);
          const sy = toSvgY(pt.y);
          return (
            <g key={i}>
              {/* Glow */}
              <circle cx={sx} cy={sy} r={8} fill={pt.color} opacity={0.15} />
              {/* Point */}
              <circle cx={sx} cy={sy} r={5} fill={pt.color}
                stroke="white" strokeWidth={1.5} />
              {/* Label */}
              <text
                x={sx + (pt.x >= 0 ? 10 : -10)}
                y={sy + (pt.y >= 0 ? -10 : 16)}
                fill={pt.color}
                fontSize={12}
                fontWeight="bold"
                textAnchor={pt.x >= 0 ? "start" : "end"}
              >
                {pt.label}({pt.x},{pt.y})
              </text>
            </g>
          );
        })}

        {/* Quadrant labels (subtle) */}
        <text x={width*0.72} y={height*0.28} fill="rgba(255,255,255,0.07)" fontSize={11}>Q I</text>
        <text x={width*0.17} y={height*0.28} fill="rgba(255,255,255,0.07)" fontSize={11}>Q II</text>
        <text x={width*0.13} y={height*0.78} fill="rgba(255,255,255,0.07)" fontSize={11}>Q III</text>
        <text x={width*0.72} y={height*0.78} fill="rgba(255,255,255,0.07)" fontSize={11}>Q IV</text>
      </svg>
    </div>
  );
}
