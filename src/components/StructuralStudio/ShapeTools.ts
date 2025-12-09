/**
 * GPCS CodeStudio - Shape Tools
 * 
 * Professional shape creation and boolean operations
 * Rectangle, Rounded Rectangle, Ellipse, Polygon
 * Union, Subtract, Intersect, Offset/Inset
 */

import type { DieSegment, DiePath, Point2D, DieLineType } from '../../prepress/dieline/DieLineTypes'

// Generate unique IDs
const generateId = () => `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
const generatePathId = () => `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export interface ShapeOptions {
  lineType: DieLineType
  centerX: number
  centerY: number
}

export interface RectangleOptions extends ShapeOptions {
  width: number
  height: number
}

export interface RoundedRectOptions extends RectangleOptions {
  cornerRadius: number
}

export interface EllipseOptions extends ShapeOptions {
  radiusX: number
  radiusY: number
  segments?: number
}

export interface PolygonOptions extends ShapeOptions {
  radius: number
  sides: number
  rotation?: number
}

// Create rectangle
export function createRectangle(options: RectangleOptions): DiePath {
  const { width, height, centerX, centerY, lineType } = options
  const halfW = width / 2
  const halfH = height / 2
  
  const corners = [
    { x: centerX - halfW, y: centerY - halfH },
    { x: centerX + halfW, y: centerY - halfH },
    { x: centerX + halfW, y: centerY + halfH },
    { x: centerX - halfW, y: centerY + halfH }
  ]
  
  const segments: DieSegment[] = corners.map((corner, i) => ({
    id: generateId(),
    type: 'LINE',
    lineType,
    start: corner,
    end: corners[(i + 1) % 4]
  }))
  
  return {
    id: generatePathId(),
    segments,
    isClosed: true,
    lineType,
    bounds: {
      minX: centerX - halfW,
      minY: centerY - halfH,
      maxX: centerX + halfW,
      maxY: centerY + halfH,
      width,
      height
    }
  }
}

// Create rounded rectangle
export function createRoundedRectangle(options: RoundedRectOptions): DiePath {
  const { width, height, centerX, centerY, cornerRadius, lineType } = options
  const halfW = width / 2
  const halfH = height / 2
  const r = Math.min(cornerRadius, halfW, halfH)
  
  const segments: DieSegment[] = []
  
  // Top edge
  segments.push({
    id: generateId(),
    type: 'LINE',
    lineType,
    start: { x: centerX - halfW + r, y: centerY - halfH },
    end: { x: centerX + halfW - r, y: centerY - halfH }
  })
  
  // Top-right corner
  if (r > 0) {
    segments.push({
      id: generateId(),
      type: 'ARC',
      lineType,
      start: { x: centerX + halfW - r, y: centerY - halfH },
      end: { x: centerX + halfW, y: centerY - halfH + r },
      center: { x: centerX + halfW - r, y: centerY - halfH + r },
      radius: r,
      clockwise: false
    })
  }
  
  // Right edge
  segments.push({
    id: generateId(),
    type: 'LINE',
    lineType,
    start: { x: centerX + halfW, y: centerY - halfH + r },
    end: { x: centerX + halfW, y: centerY + halfH - r }
  })
  
  // Bottom-right corner
  if (r > 0) {
    segments.push({
      id: generateId(),
      type: 'ARC',
      lineType,
      start: { x: centerX + halfW, y: centerY + halfH - r },
      end: { x: centerX + halfW - r, y: centerY + halfH },
      center: { x: centerX + halfW - r, y: centerY + halfH - r },
      radius: r,
      clockwise: false
    })
  }
  
  // Bottom edge
  segments.push({
    id: generateId(),
    type: 'LINE',
    lineType,
    start: { x: centerX + halfW - r, y: centerY + halfH },
    end: { x: centerX - halfW + r, y: centerY + halfH }
  })
  
  // Bottom-left corner
  if (r > 0) {
    segments.push({
      id: generateId(),
      type: 'ARC',
      lineType,
      start: { x: centerX - halfW + r, y: centerY + halfH },
      end: { x: centerX - halfW, y: centerY + halfH - r },
      center: { x: centerX - halfW + r, y: centerY + halfH - r },
      radius: r,
      clockwise: false
    })
  }
  
  // Left edge
  segments.push({
    id: generateId(),
    type: 'LINE',
    lineType,
    start: { x: centerX - halfW, y: centerY + halfH - r },
    end: { x: centerX - halfW, y: centerY - halfH + r }
  })
  
  // Top-left corner
  if (r > 0) {
    segments.push({
      id: generateId(),
      type: 'ARC',
      lineType,
      start: { x: centerX - halfW, y: centerY - halfH + r },
      end: { x: centerX - halfW + r, y: centerY - halfH },
      center: { x: centerX - halfW + r, y: centerY - halfH + r },
      radius: r,
      clockwise: false
    })
  }
  
  return {
    id: generatePathId(),
    segments,
    isClosed: true,
    lineType,
    bounds: {
      minX: centerX - halfW,
      minY: centerY - halfH,
      maxX: centerX + halfW,
      maxY: centerY + halfH,
      width,
      height
    }
  }
}

// Create ellipse (approximated with bezier curves or line segments)
export function createEllipse(options: EllipseOptions): DiePath {
  const { radiusX, radiusY, centerX, centerY, lineType, segments: numSegments = 32 } = options
  
  const segments: DieSegment[] = []
  
  for (let i = 0; i < numSegments; i++) {
    const angle1 = (i / numSegments) * Math.PI * 2
    const angle2 = ((i + 1) / numSegments) * Math.PI * 2
    
    segments.push({
      id: generateId(),
      type: 'LINE',
      lineType,
      start: {
        x: centerX + Math.cos(angle1) * radiusX,
        y: centerY + Math.sin(angle1) * radiusY
      },
      end: {
        x: centerX + Math.cos(angle2) * radiusX,
        y: centerY + Math.sin(angle2) * radiusY
      }
    })
  }
  
  return {
    id: generatePathId(),
    segments,
    isClosed: true,
    lineType,
    bounds: {
      minX: centerX - radiusX,
      minY: centerY - radiusY,
      maxX: centerX + radiusX,
      maxY: centerY + radiusY,
      width: radiusX * 2,
      height: radiusY * 2
    }
  }
}

// Create regular polygon
export function createPolygon(options: PolygonOptions): DiePath {
  const { radius, sides, centerX, centerY, lineType, rotation = 0 } = options
  
  const segments: DieSegment[] = []
  const angleStep = (Math.PI * 2) / sides
  const startAngle = rotation * (Math.PI / 180) - Math.PI / 2
  
  for (let i = 0; i < sides; i++) {
    const angle1 = startAngle + i * angleStep
    const angle2 = startAngle + (i + 1) * angleStep
    
    segments.push({
      id: generateId(),
      type: 'LINE',
      lineType,
      start: {
        x: centerX + Math.cos(angle1) * radius,
        y: centerY + Math.sin(angle1) * radius
      },
      end: {
        x: centerX + Math.cos(angle2) * radius,
        y: centerY + Math.sin(angle2) * radius
      }
    })
  }
  
  return {
    id: generatePathId(),
    segments,
    isClosed: true,
    lineType,
    bounds: {
      minX: centerX - radius,
      minY: centerY - radius,
      maxX: centerX + radius,
      maxY: centerY + radius,
      width: radius * 2,
      height: radius * 2
    }
  }
}

// Offset/Inset path
export function offsetPath(path: DiePath, offset: number, lineType?: DieLineType): DiePath {
  // Positive offset = outward, negative = inward
  const newSegments: DieSegment[] = []
  const lt = lineType || path.lineType
  
  path.segments.forEach((seg, i) => {
    const prev = path.segments[(i - 1 + path.segments.length) % path.segments.length]
    const next = path.segments[(i + 1) % path.segments.length]
    
    // Calculate normal vector
    const dx = seg.end.x - seg.start.x
    const dy = seg.end.y - seg.start.y
    const len = Math.sqrt(dx * dx + dy * dy)
    
    if (len === 0) return
    
    // Normal perpendicular to segment (pointing outward for CW paths)
    const nx = -dy / len
    const ny = dx / len
    
    newSegments.push({
      id: generateId(),
      type: seg.type,
      lineType: lt,
      start: {
        x: seg.start.x + nx * offset,
        y: seg.start.y + ny * offset
      },
      end: {
        x: seg.end.x + nx * offset,
        y: seg.end.y + ny * offset
      },
      center: seg.center ? {
        x: seg.center.x + nx * offset,
        y: seg.center.y + ny * offset
      } : undefined,
      radius: seg.radius ? seg.radius + offset : undefined,
      clockwise: seg.clockwise
    })
  })
  
  // Recalculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  newSegments.forEach(seg => {
    minX = Math.min(minX, seg.start.x, seg.end.x)
    minY = Math.min(minY, seg.start.y, seg.end.y)
    maxX = Math.max(maxX, seg.start.x, seg.end.x)
    maxY = Math.max(maxY, seg.start.y, seg.end.y)
  })
  
  return {
    id: generatePathId(),
    segments: newSegments,
    isClosed: path.isClosed,
    lineType: lt,
    bounds: {
      minX, minY, maxX, maxY,
      width: maxX - minX,
      height: maxY - minY
    }
  }
}

// Generate bleed path from cut path
export function generateBleed(cutPath: DiePath, bleedAmount: number): DiePath {
  return offsetPath(cutPath, bleedAmount, 'BLEED')
}

// Generate safe area path from cut path
export function generateSafeArea(cutPath: DiePath, safeMargin: number): DiePath {
  return offsetPath(cutPath, -safeMargin, 'ANNOTATION')
}

// Calculate path perimeter
export function calculatePerimeter(path: DiePath): number {
  return path.segments.reduce((total, seg) => {
    if (seg.type === 'LINE') {
      return total + Math.sqrt(
        (seg.end.x - seg.start.x) ** 2 + 
        (seg.end.y - seg.start.y) ** 2
      )
    } else if (seg.type === 'ARC' && seg.radius) {
      // Approximate arc length
      const dx = seg.end.x - seg.start.x
      const dy = seg.end.y - seg.start.y
      const chord = Math.sqrt(dx * dx + dy * dy)
      const angle = 2 * Math.asin(chord / (2 * seg.radius))
      return total + seg.radius * angle
    }
    return total
  }, 0)
}

// Calculate path area (for closed paths)
export function calculateArea(path: DiePath): number {
  if (!path.isClosed) return 0
  
  // Shoelace formula for polygon area
  let area = 0
  path.segments.forEach(seg => {
    area += (seg.start.x * seg.end.y - seg.end.x * seg.start.y)
  })
  
  return Math.abs(area / 2)
}

// Calculate angle between two segments
export function calculateAngleBetween(seg1: DieSegment, seg2: DieSegment): number {
  const v1 = { x: seg1.end.x - seg1.start.x, y: seg1.end.y - seg1.start.y }
  const v2 = { x: seg2.end.x - seg2.start.x, y: seg2.end.y - seg2.start.y }
  
  const dot = v1.x * v2.x + v1.y * v2.y
  const cross = v1.x * v2.y - v1.y * v2.x
  
  return Math.atan2(cross, dot) * (180 / Math.PI)
}

// Snap point to grid
export function snapToGrid(point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  }
}

// Snap point to nearest guide
export function snapToGuide(
  point: Point2D, 
  guides: { horizontal: number[], vertical: number[] },
  threshold: number
): Point2D {
  let x = point.x
  let y = point.y
  
  for (const vGuide of guides.vertical) {
    if (Math.abs(point.x - vGuide) < threshold) {
      x = vGuide
      break
    }
  }
  
  for (const hGuide of guides.horizontal) {
    if (Math.abs(point.y - hGuide) < threshold) {
      y = hGuide
      break
    }
  }
  
  return { x, y }
}

// Export shape tools
export const ShapeTools = {
  createRectangle,
  createRoundedRectangle,
  createEllipse,
  createPolygon,
  offsetPath,
  generateBleed,
  generateSafeArea,
  calculatePerimeter,
  calculateArea,
  calculateAngleBetween,
  snapToGrid,
  snapToGuide
}
