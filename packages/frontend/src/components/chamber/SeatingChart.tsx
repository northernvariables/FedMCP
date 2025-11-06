/**
 * SeatingChart Component
 *
 * SVG-based visualization of the House of Commons seating plan
 * - Color-coded circles by party (smaller, fits better)
 * - Opposition benches at top
 * - Government benches at bottom
 * - Speaker position
 * - Clickable seats with hover tooltips
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MP {
  id: string;
  name: string;
  party: string;
  riding: string;
  photo_url?: string;
  cabinet_position?: string;
  seat_row?: number;
  seat_column?: number;
  bench_section?: string;
  seat_visual_x?: number;
  seat_visual_y?: number;
}

interface SeatingChartProps {
  mps: MP[];
  onSeatClick?: (mp: MP) => void;
  highlightedMpId?: string;
}

// Party colors
const PARTY_COLORS: Record<string, string> = {
  'Conservative': '#002395',
  'Liberal': '#D71920',
  'Bloc Québécois': '#33B2CC',
  'Bloc': '#33B2CC', // Database uses "Bloc" without "Québécois"
  'NDP': '#F37021',
  'New Democratic Party': '#F37021',
  'Green Party': '#3D9B35',
  'Green': '#3D9B35', // Database uses "Green" not "Green Party"
  'Independent': '#666666',
};

export function SeatingChart({ mps, onSeatClick, highlightedMpId }: SeatingChartProps) {
  const [hoveredMp, setHoveredMp] = React.useState<MP | null>(null);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const svgRef = React.useRef<SVGSVGElement>(null);

  // Filter MPs with seating data
  const seatedMps = mps.filter(mp =>
    mp.seat_visual_x !== undefined &&
    mp.seat_visual_y !== undefined
  );

  // Separate by bench section
  const oppositionMps = seatedMps.filter(mp => mp.bench_section === 'opposition');
  const governmentMps = seatedMps.filter(mp => mp.bench_section === 'government');
  const speakerMp = seatedMps.find(mp => mp.bench_section === 'speaker');

  // SVG dimensions - more compact
  const width = 1400;
  const height = 800;
  const seatRadius = 11; // Larger circles for better visibility

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    const svgY = ((e.clientY - rect.top) / rect.height) * height;

    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Normalize party name to handle accent variations (Québécois vs Quebecois)
  const normalizePartyName = (name: string): string => {
    return name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
      .trim();
  };

  const getPartyColor = (party: string): string => {
    // Try exact match first
    if (PARTY_COLORS[party]) {
      return PARTY_COLORS[party];
    }

    // Try normalized match
    const normalizedParty = normalizePartyName(party);
    for (const [key, color] of Object.entries(PARTY_COLORS)) {
      if (normalizePartyName(key) === normalizedParty) {
        return color;
      }
    }

    return PARTY_COLORS['Independent'];
  };

  const renderSeat = (mp: MP, isSpeaker: boolean = false) => {
    const x = mp.seat_visual_x!;
    const y = mp.seat_visual_y!;
    const partyColor = isSpeaker ? '#8B4513' : getPartyColor(mp.party);
    const isHighlighted = mp.id === highlightedMpId;
    const isHovered = hoveredMp?.id === mp.id;
    const radius = isSpeaker ? seatRadius * 1.5 : seatRadius;

    return (
      <g
        key={mp.id}
        transform={`translate(${x}, ${y})`}
        onClick={() => onSeatClick?.(mp)}
        onMouseEnter={() => setHoveredMp(mp)}
        onMouseLeave={() => setHoveredMp(null)}
        className="cursor-pointer transition-all"
      >
        {/* Main seat circle */}
        <circle
          r={radius}
          fill={partyColor}
          stroke={isHighlighted ? '#FFD700' : isHovered ? '#fff' : partyColor}
          strokeWidth={isHighlighted ? 3 : isHovered ? 2 : 1}
          opacity={isHovered ? 1 : 0.9}
          className="transition-all"
        />

        {/* Cabinet indicator - small gold ring */}
        {mp.cabinet_position && !isSpeaker && (
          <circle
            r={radius + 2}
            fill="none"
            stroke="#FFD700"
            strokeWidth={1.5}
          />
        )}

        {/* Speaker indicator - gavel icon approximation */}
        {isSpeaker && (
          <>
            <rect
              x={-3}
              y={-radius + 2}
              width={6}
              height={3}
              fill="#FFD700"
            />
            <rect
              x={-1}
              y={-radius + 5}
              width={2}
              height={radius - 3}
              fill="#FFD700"
            />
          </>
        )}

        {/* Highlight pulse animation */}
        {isHighlighted && (
          <circle
            r={radius + 5}
            fill="none"
            stroke="#FFD700"
            strokeWidth={2}
            opacity={0.5}
          >
            <animate
              attributeName="r"
              from={radius}
              to={radius + 10}
              dur="1.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              from={0.8}
              to={0}
              dur="1.5s"
              repeatCount="indefinite"
            />
          </circle>
        )}
      </g>
    );
  };

  return (
    <div className="relative w-full">
      <div className="max-w-6xl mx-auto">
        {/* SVG Seating Chart */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto bg-bg-secondary rounded-lg shadow-md border border-border-subtle"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredMp(null)}
        >
        {/* Section Labels */}
        <text
          x={width / 2}
          y={40}
          textAnchor="middle"
          className="fill-text-primary font-semibold"
          fontSize="20"
        >
          Opposition • Speaker's Left
        </text>

        {/* Speaker Position Label */}
        {speakerMp && (
          <text
            x={width / 2}
            y={height / 2 - 20}
            textAnchor="middle"
            className="fill-text-tertiary"
            fontSize="14"
          >
            Speaker's Chair
          </text>
        )}

        <text
          x={width / 2}
          y={height - 20}
          textAnchor="middle"
          className="fill-text-primary font-semibold"
          fontSize="20"
        >
          Government • Speaker's Right
        </text>

        {/* Center divider line */}
        <line
          x1={100}
          y1={height / 2}
          x2={width - 100}
          y2={height / 2}
          stroke="#666"
          strokeWidth={1}
          strokeDasharray="5,5"
          opacity={0.2}
        />

        {/* Render Opposition Seats */}
        {oppositionMps.map(mp => renderSeat(mp))}

        {/* Render Government Seats */}
        {governmentMps.map(mp => renderSeat(mp))}

        {/* Render Speaker */}
        {speakerMp && renderSeat(speakerMp, true)}
        </svg>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
          {Object.entries(PARTY_COLORS)
            .filter(([party]) => !['New Democratic Party', 'Independent', 'Bloc', 'Green'].includes(party)) // Skip database aliases
            .map(([party, color]) => {
              // Count MPs for this party, including database aliases
              const count = seatedMps.filter(mp => {
                const mpParty = mp.party;
                // Direct match
                if (mpParty === party) return true;
                // Match database aliases
                if (party === 'Bloc Québécois' && mpParty === 'Bloc') return true;
                if (party === 'Green Party' && mpParty === 'Green') return true;
                if (party === 'NDP' && (mpParty === 'NDP' || mpParty === 'New Democratic Party')) return true;
                // Normalized match for accents
                return normalizePartyName(mpParty) === normalizePartyName(party);
              }).length;
              // Only skip if it's not a major party or if count is 0 AND it's not one of the main parties
              const isMajorParty = ['Liberal', 'Conservative', 'Bloc Québécois', 'NDP', 'Green Party'].includes(party);
              if (count === 0 && !isMajorParty) return null;

              return (
                <div key={party} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-border-subtle"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-text-secondary">
                    {party} <span className="font-semibold text-text-primary">({count})</span>
                  </span>
                </div>
              );
            })}
          {speakerMp && (
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border border-border-subtle"
                style={{ backgroundColor: '#8B4513' }}
              />
              <span className="text-text-secondary">
                Speaker <span className="font-semibold text-text-primary">(1)</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredMp && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed pointer-events-none z-50 bg-bg-elevated border border-border-subtle rounded-lg shadow-xl p-3 max-w-xs"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y + 15,
          }}
        >
          <div className="space-y-1">
            <p className="font-semibold text-text-primary text-sm">{hoveredMp.name}</p>
            <p className="text-xs text-text-secondary">{hoveredMp.party}</p>
            <p className="text-xs text-text-tertiary">{hoveredMp.riding}</p>
            {hoveredMp.cabinet_position && (
              <p className="text-xs text-accent-blue font-medium mt-1">
                ⭐ {hoveredMp.cabinet_position}
              </p>
            )}
            {hoveredMp.bench_section === 'speaker' && (
              <p className="text-xs text-accent-blue font-medium mt-1">
                🔨 Speaker of the House
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
