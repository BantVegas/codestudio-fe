/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * GPCS CodeStudio - Auto-Trapping Engine
 * Trap Overlay Visualization (TODO 4)
 * 
 * Renders trap geometry as SVG overlay
 */

import React, { useMemo } from 'react'
import type {
  TrapLayer,
  TrapObject,
  BezierPath,
  ViewMode,
  TrapDirection,
} from '../types/trappingTypes'

interface TrapOverlayLayerProps {
  trapLayer: TrapLayer | null
  viewMode: ViewMode
  opacity: number
  selectedTrapId?: string
  onTrapClick?: (trapId: string) => void
  onTrapHover?: (trapId: string | null) => void
  width: number
  height: number
  zoom: number
  panX: number
  panY: number
}

export const TrapOverlayLayer: React.FC<TrapOverlayLayerProps> = ({
  trapLayer,
  viewMode,
  opacity,
  selectedTrapId,
  onTrapClick,
  onTrapHover,
  width,
  height,
  zoom,
  panX,
  panY,
}) => {
  // Don't render if not in trap overlay mode or no traps
  if (viewMode !== 'TRAP_OVERLAY' || !trapLayer || trapLayer.traps.length === 0) {
    return null
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ opacity }}
    >
      <defs>
        {/* Gradient for spread traps */}
        <linearGradient id="spreadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
        </linearGradient>

        {/* Gradient for choke traps */}
        <linearGradient id="chokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0.3" />
        </linearGradient>

        {/* Gradient for centerline traps */}
        <linearGradient id="centerlineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.3" />
        </linearGradient>

        {/* Pattern for selected trap */}
        <pattern id="selectedPattern" patternUnits="userSpaceOnUse" width="4" height="4">
          <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#fff" strokeWidth="0.5" />
        </pattern>
      </defs>

      <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
        {trapLayer.traps.map(trap => (
          <TrapShape
            key={trap.id}
            trap={trap}
            isSelected={trap.id === selectedTrapId}
            onClick={() => onTrapClick?.(trap.id)}
            onMouseEnter={() => onTrapHover?.(trap.id)}
            onMouseLeave={() => onTrapHover?.(null)}
          />
        ))}
      </g>
    </svg>
  )
}

// ============================================
// TRAP SHAPE COMPONENT
// ============================================

interface TrapShapeProps {
  trap: TrapObject
  isSelected: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

const TrapShape: React.FC<TrapShapeProps> = ({
  trap,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const pathData = useMemo(() => bezierPathToSvg(trap.path), [trap.path])
  
  const fillColor = useMemo(() => {
    switch (trap.decision.direction) {
      case 'SPREAD':
        return 'url(#spreadGradient)'
      case 'CHOKE':
        return 'url(#chokeGradient)'
      case 'CENTERLINE':
        return 'url(#centerlineGradient)'
      default:
        return '#888'
    }
  }, [trap.decision.direction])

  const strokeColor = useMemo(() => {
    switch (trap.decision.direction) {
      case 'SPREAD':
        return '#22d3ee'
      case 'CHOKE':
        return '#f472b6'
      case 'CENTERLINE':
        return '#a78bfa'
      default:
        return '#888'
    }
  }, [trap.decision.direction])

  return (
    <g
      className="pointer-events-auto cursor-pointer"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Main trap fill */}
      <path
        d={pathData}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 0.3 : 0.1}
        opacity={isSelected ? 1 : 0.7}
      />

      {/* Selected overlay */}
      {isSelected && (
        <path
          d={pathData}
          fill="url(#selectedPattern)"
          stroke="#fff"
          strokeWidth={0.2}
          strokeDasharray="0.5,0.5"
        />
      )}

      {/* Direction indicator for larger traps */}
      {trap.widthMm > 0.2 && (
        <TrapDirectionIndicator trap={trap} />
      )}
    </g>
  )
}

// ============================================
// DIRECTION INDICATOR
// ============================================

interface TrapDirectionIndicatorProps {
  trap: TrapObject
}

const TrapDirectionIndicator: React.FC<TrapDirectionIndicatorProps> = ({ trap }) => {
  // Calculate center of trap path
  const center = useMemo(() => {
    const points = trap.path.points
    if (points.length === 0) return { x: 0, y: 0 }
    
    let sumX = 0, sumY = 0
    for (const point of points) {
      sumX += point.anchor.x
      sumY += point.anchor.y
    }
    return {
      x: sumX / points.length,
      y: sumY / points.length
    }
  }, [trap.path])

  const arrowPath = useMemo(() => {
    const size = trap.widthMm * 2
    const direction = trap.decision.direction
    
    if (direction === 'SPREAD') {
      // Arrow pointing outward
      return `M ${center.x - size/2} ${center.y} L ${center.x + size/2} ${center.y} M ${center.x + size/4} ${center.y - size/4} L ${center.x + size/2} ${center.y} L ${center.x + size/4} ${center.y + size/4}`
    } else if (direction === 'CHOKE') {
      // Arrow pointing inward
      return `M ${center.x + size/2} ${center.y} L ${center.x - size/2} ${center.y} M ${center.x - size/4} ${center.y - size/4} L ${center.x - size/2} ${center.y} L ${center.x - size/4} ${center.y + size/4}`
    } else {
      // Centerline - double arrow
      return `M ${center.x - size/2} ${center.y} L ${center.x + size/2} ${center.y}`
    }
  }, [center, trap.widthMm, trap.decision.direction])

  return (
    <path
      d={arrowPath}
      fill="none"
      stroke="#fff"
      strokeWidth={0.1}
      opacity={0.8}
    />
  )
}

// ============================================
// SVG PATH UTILITIES
// ============================================

/**
 * Convert BezierPath to SVG path data string
 */
function bezierPathToSvg(path: BezierPath): string {
  if (path.points.length === 0) return ''

  const parts: string[] = []
  
  // Move to first point
  const first = path.points[0]
  parts.push(`M ${first.anchor.x} ${first.anchor.y}`)

  // Draw segments
  for (let i = 1; i < path.points.length; i++) {
    const prev = path.points[i - 1]
    const curr = path.points[i]

    if (prev.handleOut && curr.handleIn) {
      // Cubic bezier curve
      parts.push(`C ${prev.handleOut.x} ${prev.handleOut.y}, ${curr.handleIn.x} ${curr.handleIn.y}, ${curr.anchor.x} ${curr.anchor.y}`)
    } else if (prev.handleOut) {
      // Quadratic bezier (one control point)
      parts.push(`Q ${prev.handleOut.x} ${prev.handleOut.y}, ${curr.anchor.x} ${curr.anchor.y}`)
    } else if (curr.handleIn) {
      // Quadratic bezier (one control point)
      parts.push(`Q ${curr.handleIn.x} ${curr.handleIn.y}, ${curr.anchor.x} ${curr.anchor.y}`)
    } else {
      // Line segment
      parts.push(`L ${curr.anchor.x} ${curr.anchor.y}`)
    }
  }

  // Close path if needed
  if (path.closed) {
    const last = path.points[path.points.length - 1]
    if (last.handleOut && first.handleIn) {
      parts.push(`C ${last.handleOut.x} ${last.handleOut.y}, ${first.handleIn.x} ${first.handleIn.y}, ${first.anchor.x} ${first.anchor.y}`)
    }
    parts.push('Z')
  }

  return parts.join(' ')
}

// ============================================
// TRAP INFO TOOLTIP
// ============================================

interface TrapTooltipProps {
  trap: TrapObject | null
  x: number
  y: number
}

export const TrapTooltip: React.FC<TrapTooltipProps> = ({ trap, x, y }) => {
  if (!trap) return null

  const directionLabel = {
    'SPREAD': 'Spread (svetlá → tmavá)',
    'CHOKE': 'Choke (tmavá → svetlá)',
    'CENTERLINE': 'Centerline',
    'NONE': 'Žiadny'
  }[trap.decision.direction]

  const styleLabel = {
    'NORMAL': 'Normálny',
    'ABUTTED': 'Abutted',
    'FEATHERED': 'Feathered',
    'SLIDING': 'Sliding',
    'KEEPAWAY': 'Keepaway'
  }[trap.style]

  return (
    <div
      className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 text-xs text-slate-200 pointer-events-none"
      style={{
        left: x + 10,
        top: y + 10,
        maxWidth: 250
      }}
    >
      <div className="font-medium text-pink-400 mb-2">Trap Info</div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-400">Smer:</span>
          <span>{directionLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Šírka:</span>
          <span>{trap.widthMm.toFixed(3)} mm</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Štýl:</span>
          <span>{styleLabel}</span>
        </div>
        {trap.decision.warnings.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-600">
            <div className="text-yellow-400 mb-1">Upozornenia:</div>
            {trap.decision.warnings.map((w, i) => (
              <div key={i} className="text-yellow-300/80">• {w.message}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TrapOverlayLayer
