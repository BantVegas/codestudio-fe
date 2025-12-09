/**
 * GPCS CodeStudio - Measure Tools
 * 
 * Professional measurement utilities
 * Distance, angle, area, perimeter
 * Tolerance display and verification
 */

import type { DieSegment, DiePath, Point2D } from '../../prepress/dieline/DieLineTypes'

export interface MeasurementResult {
  type: 'DISTANCE' | 'ANGLE' | 'AREA' | 'PERIMETER' | 'RADIUS'
  value: number
  unit: string
  formatted: string
  points?: Point2D[]
  tolerance?: {
    min: number
    max: number
    inTolerance: boolean
  }
}

export interface ToleranceSpec {
  name: string
  minValue?: number
  maxValue?: number
  nominalValue?: number
  tolerance?: number // +/- tolerance
}

// Distance between two points
export function measureDistance(p1: Point2D, p2: Point2D, unit: 'mm' | 'inch' = 'mm'): MeasurementResult {
  const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
  const value = unit === 'inch' ? dist * 0.03937 : dist
  
  return {
    type: 'DISTANCE',
    value,
    unit,
    formatted: `${value.toFixed(2)} ${unit}`,
    points: [p1, p2]
  }
}

// Angle between three points (vertex at p2)
export function measureAngle(p1: Point2D, p2: Point2D, p3: Point2D): MeasurementResult {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y }
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }
  
  const dot = v1.x * v2.x + v1.y * v2.y
  const cross = v1.x * v2.y - v1.y * v2.x
  const angle = Math.atan2(cross, dot) * (180 / Math.PI)
  
  return {
    type: 'ANGLE',
    value: Math.abs(angle),
    unit: '°',
    formatted: `${Math.abs(angle).toFixed(1)}°`,
    points: [p1, p2, p3]
  }
}

// Angle between two segments
export function measureSegmentAngle(seg1: DieSegment, seg2: DieSegment): MeasurementResult {
  const v1 = { x: seg1.end.x - seg1.start.x, y: seg1.end.y - seg1.start.y }
  const v2 = { x: seg2.end.x - seg2.start.x, y: seg2.end.y - seg2.start.y }
  
  const dot = v1.x * v2.x + v1.y * v2.y
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2)
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2)
  
  if (mag1 === 0 || mag2 === 0) {
    return { type: 'ANGLE', value: 0, unit: '°', formatted: '0°' }
  }
  
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)))
  const angle = Math.acos(cos) * (180 / Math.PI)
  
  return {
    type: 'ANGLE',
    value: angle,
    unit: '°',
    formatted: `${angle.toFixed(1)}°`
  }
}

// Calculate segment length
export function measureSegmentLength(seg: DieSegment, unit: 'mm' | 'inch' = 'mm'): MeasurementResult {
  let length: number
  
  if (seg.type === 'LINE') {
    length = Math.sqrt(
      (seg.end.x - seg.start.x) ** 2 + 
      (seg.end.y - seg.start.y) ** 2
    )
  } else if (seg.type === 'ARC' && seg.radius) {
    // Arc length
    const dx = seg.end.x - seg.start.x
    const dy = seg.end.y - seg.start.y
    const chord = Math.sqrt(dx * dx + dy * dy)
    const angle = 2 * Math.asin(Math.min(1, chord / (2 * seg.radius)))
    length = seg.radius * angle
  } else {
    // Approximate for bezier
    length = Math.sqrt(
      (seg.end.x - seg.start.x) ** 2 + 
      (seg.end.y - seg.start.y) ** 2
    )
  }
  
  const value = unit === 'inch' ? length * 0.03937 : length
  
  return {
    type: 'DISTANCE',
    value,
    unit,
    formatted: `${value.toFixed(2)} ${unit}`
  }
}

// Calculate path perimeter
export function measurePerimeter(path: DiePath, unit: 'mm' | 'inch' = 'mm'): MeasurementResult {
  let perimeter = 0
  
  path.segments.forEach(seg => {
    const result = measureSegmentLength(seg, 'mm')
    perimeter += result.value
  })
  
  const value = unit === 'inch' ? perimeter * 0.03937 : perimeter
  
  return {
    type: 'PERIMETER',
    value,
    unit,
    formatted: `${value.toFixed(2)} ${unit}`
  }
}

// Calculate path area (for closed paths)
export function measureArea(path: DiePath, unit: 'mm' | 'inch' = 'mm'): MeasurementResult {
  if (!path.isClosed || path.segments.length < 3) {
    return { type: 'AREA', value: 0, unit: `${unit}²`, formatted: `0 ${unit}²` }
  }
  
  // Shoelace formula
  let area = 0
  path.segments.forEach(seg => {
    area += (seg.start.x * seg.end.y - seg.end.x * seg.start.y)
  })
  area = Math.abs(area / 2)
  
  const value = unit === 'inch' ? area * 0.00155 : area // mm² to inch²
  const unitStr = unit === 'inch' ? 'in²' : 'mm²'
  
  return {
    type: 'AREA',
    value,
    unit: unitStr,
    formatted: `${value.toFixed(2)} ${unitStr}`
  }
}

// Measure arc radius
export function measureRadius(seg: DieSegment, unit: 'mm' | 'inch' = 'mm'): MeasurementResult | null {
  if (seg.type !== 'ARC' || !seg.radius) return null
  
  const value = unit === 'inch' ? seg.radius * 0.03937 : seg.radius
  
  return {
    type: 'RADIUS',
    value,
    unit,
    formatted: `R${value.toFixed(2)} ${unit}`
  }
}

// Check if measurement is within tolerance
export function checkTolerance(
  measurement: MeasurementResult, 
  spec: ToleranceSpec
): MeasurementResult {
  let inTolerance = true
  let min = spec.minValue
  let max = spec.maxValue
  
  if (spec.nominalValue !== undefined && spec.tolerance !== undefined) {
    min = spec.nominalValue - spec.tolerance
    max = spec.nominalValue + spec.tolerance
  }
  
  if (min !== undefined && measurement.value < min) inTolerance = false
  if (max !== undefined && measurement.value > max) inTolerance = false
  
  return {
    ...measurement,
    tolerance: {
      min: min || 0,
      max: max || Infinity,
      inTolerance
    }
  }
}

// Find closest point on segment to given point
export function closestPointOnSegment(point: Point2D, seg: DieSegment): Point2D {
  if (seg.type === 'LINE') {
    const dx = seg.end.x - seg.start.x
    const dy = seg.end.y - seg.start.y
    const len2 = dx * dx + dy * dy
    
    if (len2 === 0) return seg.start
    
    let t = ((point.x - seg.start.x) * dx + (point.y - seg.start.y) * dy) / len2
    t = Math.max(0, Math.min(1, t))
    
    return {
      x: seg.start.x + t * dx,
      y: seg.start.y + t * dy
    }
  }
  
  // For arcs and beziers, approximate with start/end
  const distStart = Math.sqrt((point.x - seg.start.x) ** 2 + (point.y - seg.start.y) ** 2)
  const distEnd = Math.sqrt((point.x - seg.end.x) ** 2 + (point.y - seg.end.y) ** 2)
  
  return distStart < distEnd ? seg.start : seg.end
}

// Distance from point to segment
export function distanceToSegment(point: Point2D, seg: DieSegment): number {
  const closest = closestPointOnSegment(point, seg)
  return Math.sqrt((point.x - closest.x) ** 2 + (point.y - closest.y) ** 2)
}

// Format measurement for display
export function formatMeasurement(value: number, unit: 'mm' | 'inch', decimals: number = 2): string {
  if (unit === 'inch') {
    // Show as fraction if close to common fractions
    const fractions = [
      { frac: '1/16', val: 1/16 },
      { frac: '1/8', val: 1/8 },
      { frac: '3/16', val: 3/16 },
      { frac: '1/4', val: 1/4 },
      { frac: '5/16', val: 5/16 },
      { frac: '3/8', val: 3/8 },
      { frac: '7/16', val: 7/16 },
      { frac: '1/2', val: 1/2 },
      { frac: '9/16', val: 9/16 },
      { frac: '5/8', val: 5/8 },
      { frac: '11/16', val: 11/16 },
      { frac: '3/4', val: 3/4 },
      { frac: '13/16', val: 13/16 },
      { frac: '7/8', val: 7/8 },
      { frac: '15/16', val: 15/16 }
    ]
    
    const whole = Math.floor(value)
    const frac = value - whole
    
    for (const f of fractions) {
      if (Math.abs(frac - f.val) < 0.01) {
        return whole > 0 ? `${whole} ${f.frac}"` : `${f.frac}"`
      }
    }
  }
  
  return `${value.toFixed(decimals)} ${unit}`
}

// Calculate bounding box dimensions
export function measureBoundingBox(path: DiePath, unit: 'mm' | 'inch' = 'mm'): {
  width: MeasurementResult
  height: MeasurementResult
  diagonal: MeasurementResult
} {
  const scale = unit === 'inch' ? 0.03937 : 1
  
  return {
    width: {
      type: 'DISTANCE',
      value: path.bounds.width * scale,
      unit,
      formatted: `${(path.bounds.width * scale).toFixed(2)} ${unit}`
    },
    height: {
      type: 'DISTANCE',
      value: path.bounds.height * scale,
      unit,
      formatted: `${(path.bounds.height * scale).toFixed(2)} ${unit}`
    },
    diagonal: {
      type: 'DISTANCE',
      value: Math.sqrt(path.bounds.width ** 2 + path.bounds.height ** 2) * scale,
      unit,
      formatted: `${(Math.sqrt(path.bounds.width ** 2 + path.bounds.height ** 2) * scale).toFixed(2)} ${unit}`
    }
  }
}

// Export measure tools
export const MeasureTools = {
  measureDistance,
  measureAngle,
  measureSegmentAngle,
  measureSegmentLength,
  measurePerimeter,
  measureArea,
  measureRadius,
  checkTolerance,
  closestPointOnSegment,
  distanceToSegment,
  formatMeasurement,
  measureBoundingBox
}
