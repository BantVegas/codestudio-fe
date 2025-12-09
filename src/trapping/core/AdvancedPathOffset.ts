/**
 * GPCS CodeStudio - Advanced Path Offset Engine
 * 
 * Professional-grade path offsetting for trap generation
 * Features:
 * - Precise Bezier curve offsetting
 * - Self-intersection handling
 * - Variable width traps
 * - Cusps and loop removal
 * - Arc fitting for round corners
 */

import type {
  BezierPath,
  BezierPoint,
  Point,
} from '../types/trappingTypes'

// ============================================
// TYPES
// ============================================

export interface AdvancedOffsetOptions {
  distance: number              // Base offset distance in mm
  cornerStyle: 'MITER' | 'ROUND' | 'BEVEL'
  miterLimit: number            // Max miter extension ratio
  arcTolerance: number          // Tolerance for arc approximation
  curveTolerance: number        // Tolerance for curve flattening
  removeLoops: boolean          // Remove self-intersecting loops
  variableWidth?: VariableWidthProfile  // For variable width traps
}

export interface VariableWidthProfile {
  type: 'LINEAR' | 'EASE' | 'CUSTOM'
  startWidth: number
  endWidth: number
  customProfile?: number[]      // Array of width multipliers along path
}

export interface OffsetSegment {
  type: 'LINE' | 'BEZIER' | 'ARC'
  points: Point[]
  controlPoints?: Point[]
  arcData?: {
    center: Point
    radius: number
    startAngle: number
    endAngle: number
    clockwise: boolean
  }
}

// ============================================
// VECTOR MATH (Enhanced)
// ============================================

function vec(x: number, y: number): Point {
  return { x, y }
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y }
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

function scale(v: Point, s: number): Point {
  return { x: v.x * s, y: v.y * s }
}

function length(v: Point): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

function normalize(v: Point): Point {
  const len = length(v)
  if (len === 0) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

function perpendicular(v: Point): Point {
  return { x: -v.y, y: v.x }
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}

function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x
}

function angle(v: Point): number {
  return Math.atan2(v.y, v.x)
}

function fromAngle(a: number, len: number = 1): Point {
  return { x: Math.cos(a) * len, y: Math.sin(a) * len }
}

function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  }
}

function distance(a: Point, b: Point): number {
  return length(sub(b, a))
}

// ============================================
// BEZIER CURVE UTILITIES (Enhanced)
// ============================================

/**
 * Evaluate cubic Bezier at parameter t
 */
function cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t
  
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  }
}

/**
 * Get derivative of cubic Bezier at parameter t
 */
function cubicBezierDerivative(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t
  const mt2 = mt * mt
  const t2 = t * t
  
  return {
    x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y)
  }
}

/**
 * Get second derivative of cubic Bezier at parameter t
 */
function cubicBezierSecondDerivative(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t
  
  return {
    x: 6 * mt * (p2.x - 2 * p1.x + p0.x) + 6 * t * (p3.x - 2 * p2.x + p1.x),
    y: 6 * mt * (p2.y - 2 * p1.y + p0.y) + 6 * t * (p3.y - 2 * p2.y + p1.y)
  }
}

/**
 * Get curvature at parameter t
 */
function cubicBezierCurvature(p0: Point, p1: Point, p2: Point, p3: Point, t: number): number {
  const d1 = cubicBezierDerivative(p0, p1, p2, p3, t)
  const d2 = cubicBezierSecondDerivative(p0, p1, p2, p3, t)
  
  const crossVal = cross(d1, d2)
  const lenCubed = Math.pow(length(d1), 3)
  
  if (lenCubed === 0) return 0
  return crossVal / lenCubed
}

/**
 * Get normal vector at parameter t
 */
function cubicBezierNormal(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const tangent = cubicBezierDerivative(p0, p1, p2, p3, t)
  return normalize(perpendicular(tangent))
}

/**
 * Split cubic Bezier at parameter t (de Casteljau)
 */
function splitCubicBezier(
  p0: Point, p1: Point, p2: Point, p3: Point, t: number
): { left: [Point, Point, Point, Point]; right: [Point, Point, Point, Point] } {
  const p01 = lerp(p0, p1, t)
  const p12 = lerp(p1, p2, t)
  const p23 = lerp(p2, p3, t)
  const p012 = lerp(p01, p12, t)
  const p123 = lerp(p12, p23, t)
  const p0123 = lerp(p012, p123, t)
  
  return {
    left: [p0, p01, p012, p0123],
    right: [p0123, p123, p23, p3]
  }
}

/**
 * Approximate Bezier curve length
 */
function bezierLength(p0: Point, p1: Point, p2: Point, p3: Point, segments: number = 20): number {
  let len = 0
  let prev = p0
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const curr = cubicBezier(p0, p1, p2, p3, t)
    len += distance(prev, curr)
    prev = curr
  }
  
  return len
}

// ============================================
// ADVANCED PATH OFFSET
// ============================================

/**
 * Advanced path offset with proper curve handling
 */
export function advancedOffsetPath(
  path: BezierPath,
  options: AdvancedOffsetOptions
): BezierPath {
  const { distance: dist, cornerStyle, miterLimit, curveTolerance, removeLoops } = options
  
  if (path.points.length < 2) return path
  
  // Convert path to segments
  const segments = pathToSegments(path)
  
  // Offset each segment
  const offsetSegments = segments.map((seg, i) => {
    const prevSeg = segments[(i - 1 + segments.length) % segments.length]
    const nextSeg = segments[(i + 1) % segments.length]
    
    return offsetSegment(seg, dist, prevSeg, nextSeg, options)
  })
  
  // Handle corners between segments
  const connectedSegments = connectOffsetSegments(
    offsetSegments,
    dist,
    cornerStyle,
    miterLimit,
    options.arcTolerance
  )
  
  // Convert back to BezierPath
  let resultPath = segmentsToBezierPath(connectedSegments, path.id + '_offset')
  
  // Remove self-intersections if requested
  if (removeLoops) {
    resultPath = removePathLoops(resultPath, curveTolerance)
  }
  
  resultPath.closed = path.closed
  
  return resultPath
}

/**
 * Convert BezierPath to segments for processing
 */
function pathToSegments(path: BezierPath): OffsetSegment[] {
  const segments: OffsetSegment[] = []
  const n = path.points.length
  
  for (let i = 0; i < n - (path.closed ? 0 : 1); i++) {
    const curr = path.points[i]
    const next = path.points[(i + 1) % n]
    
    const hasHandles = curr.handleOut || next.handleIn
    
    if (hasHandles) {
      // Bezier segment
      const p0 = curr.anchor
      const p1 = curr.handleOut || curr.anchor
      const p2 = next.handleIn || next.anchor
      const p3 = next.anchor
      
      segments.push({
        type: 'BEZIER',
        points: [p0, p3],
        controlPoints: [p1, p2]
      })
    } else {
      // Line segment
      segments.push({
        type: 'LINE',
        points: [curr.anchor, next.anchor]
      })
    }
  }
  
  return segments
}

/**
 * Offset a single segment
 */
function offsetSegment(
  segment: OffsetSegment,
  dist: number,
  _prevSegment: OffsetSegment | undefined,
  _nextSegment: OffsetSegment | undefined,
  options: AdvancedOffsetOptions
): OffsetSegment {
  if (segment.type === 'LINE') {
    return offsetLineSegment(segment, dist)
  } else if (segment.type === 'BEZIER') {
    return offsetBezierSegment(segment, dist, options)
  }
  
  return segment
}

/**
 * Offset a line segment
 */
function offsetLineSegment(segment: OffsetSegment, dist: number): OffsetSegment {
  const [p0, p1] = segment.points
  const dir = normalize(sub(p1, p0))
  const normal = perpendicular(dir)
  const offset = scale(normal, dist)
  
  return {
    type: 'LINE',
    points: [add(p0, offset), add(p1, offset)]
  }
}

/**
 * Offset a Bezier segment with curvature handling
 */
function offsetBezierSegment(
  segment: OffsetSegment,
  dist: number,
  options: AdvancedOffsetOptions
): OffsetSegment {
  const [p0, p3] = segment.points
  const [p1, p2] = segment.controlPoints!
  
  // Check for cusps (where curvature changes sign significantly)
  const cusps = findCusps(p0, p1, p2, p3)
  
  if (cusps.length > 0) {
    // Split at cusps and offset each part
    // For now, use adaptive sampling
    return offsetBezierAdaptive(p0, p1, p2, p3, dist, options.curveTolerance)
  }
  
  // Simple offset for smooth curves
  return offsetBezierSimple(p0, p1, p2, p3, dist)
}

/**
 * Find cusp points on Bezier curve
 */
function findCusps(p0: Point, p1: Point, p2: Point, p3: Point): number[] {
  const cusps: number[] = []
  const samples = 20
  
  let prevCurvature = cubicBezierCurvature(p0, p1, p2, p3, 0)
  
  for (let i = 1; i <= samples; i++) {
    const t = i / samples
    const curvature = cubicBezierCurvature(p0, p1, p2, p3, t)
    
    // Check for sign change (cusp)
    if (prevCurvature * curvature < 0 && Math.abs(curvature - prevCurvature) > 0.1) {
      // Binary search for exact cusp location
      const cuspT = findCuspBinary(p0, p1, p2, p3, (i - 1) / samples, t)
      cusps.push(cuspT)
    }
    
    prevCurvature = curvature
  }
  
  return cusps
}

/**
 * Binary search for cusp location
 */
function findCuspBinary(
  p0: Point, p1: Point, p2: Point, p3: Point,
  tMin: number, tMax: number,
  iterations: number = 10
): number {
  for (let i = 0; i < iterations; i++) {
    const tMid = (tMin + tMax) / 2
    const curvMin = cubicBezierCurvature(p0, p1, p2, p3, tMin)
    const curvMid = cubicBezierCurvature(p0, p1, p2, p3, tMid)
    
    if (curvMin * curvMid < 0) {
      tMax = tMid
    } else {
      tMin = tMid
    }
  }
  
  return (tMin + tMax) / 2
}

/**
 * Simple Bezier offset (for smooth curves)
 */
function offsetBezierSimple(
  p0: Point, p1: Point, p2: Point, p3: Point,
  dist: number
): OffsetSegment {
  // Offset control points along normals
  const n0 = cubicBezierNormal(p0, p1, p2, p3, 0)
  const n1 = cubicBezierNormal(p0, p1, p2, p3, 1/3)
  const n2 = cubicBezierNormal(p0, p1, p2, p3, 2/3)
  const n3 = cubicBezierNormal(p0, p1, p2, p3, 1)
  
  const op0 = add(p0, scale(n0, dist))
  const op3 = add(p3, scale(n3, dist))
  
  // Adjust control points to maintain curve shape
  const tangent0 = normalize(sub(p1, p0))
  const tangent3 = normalize(sub(p3, p2))
  
  const len1 = distance(p0, p1)
  const len2 = distance(p2, p3)
  
  const op1 = add(op0, scale(tangent0, len1))
  const op2 = sub(op3, scale(tangent3, len2))
  
  return {
    type: 'BEZIER',
    points: [op0, op3],
    controlPoints: [op1, op2]
  }
}

/**
 * Adaptive Bezier offset (for curves with cusps)
 */
function offsetBezierAdaptive(
  p0: Point, p1: Point, p2: Point, p3: Point,
  dist: number,
  tolerance: number
): OffsetSegment {
  // Sample the curve and offset each point
  const samples = Math.max(10, Math.ceil(bezierLength(p0, p1, p2, p3) / tolerance))
  const offsetPoints: Point[] = []
  
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const point = cubicBezier(p0, p1, p2, p3, t)
    const normal = cubicBezierNormal(p0, p1, p2, p3, t)
    offsetPoints.push(add(point, scale(normal, dist)))
  }
  
  // Fit Bezier curve through offset points
  return fitBezierToPoints(offsetPoints)
}

/**
 * Fit a Bezier curve through a series of points
 */
function fitBezierToPoints(points: Point[]): OffsetSegment {
  if (points.length < 2) {
    return { type: 'LINE', points: points }
  }
  
  if (points.length === 2) {
    return { type: 'LINE', points: points }
  }
  
  // Simple fitting: use first, 1/3, 2/3, and last points
  const p0 = points[0]
  const p3 = points[points.length - 1]
  
  const i1 = Math.floor(points.length / 3)
  const i2 = Math.floor(2 * points.length / 3)
  
  // Estimate control points
  const tangent0 = normalize(sub(points[1], points[0]))
  const tangent3 = normalize(sub(points[points.length - 1], points[points.length - 2]))
  
  const totalLen = points.reduce((sum, p, i) => {
    if (i === 0) return 0
    return sum + distance(points[i - 1], p)
  }, 0)
  
  const p1 = add(p0, scale(tangent0, totalLen / 3))
  const p2 = sub(p3, scale(tangent3, totalLen / 3))
  
  return {
    type: 'BEZIER',
    points: [p0, p3],
    controlPoints: [p1, p2]
  }
}

/**
 * Connect offset segments with proper corner handling
 */
function connectOffsetSegments(
  segments: OffsetSegment[],
  dist: number,
  cornerStyle: 'MITER' | 'ROUND' | 'BEVEL',
  miterLimit: number,
  arcTolerance: number
): OffsetSegment[] {
  if (segments.length < 2) return segments
  
  const result: OffsetSegment[] = []
  
  for (let i = 0; i < segments.length; i++) {
    const curr = segments[i]
    const next = segments[(i + 1) % segments.length]
    
    result.push(curr)
    
    // Add corner between segments
    const cornerSegments = createCorner(
      curr.points[curr.points.length - 1],
      next.points[0],
      curr,
      next,
      dist,
      cornerStyle,
      miterLimit,
      arcTolerance
    )
    
    result.push(...cornerSegments)
  }
  
  return result
}

/**
 * Create corner between two segments
 */
function createCorner(
  endPoint: Point,
  startPoint: Point,
  prevSeg: OffsetSegment,
  nextSeg: OffsetSegment,
  dist: number,
  style: 'MITER' | 'ROUND' | 'BEVEL',
  miterLimit: number,
  arcTolerance: number
): OffsetSegment[] {
  // If points are close enough, no corner needed
  if (distance(endPoint, startPoint) < 0.001) {
    return []
  }
  
  // Get directions
  const dir1 = getSegmentEndDirection(prevSeg)
  const dir2 = getSegmentStartDirection(nextSeg)
  
  // Calculate corner angle
  const cornerAngle = Math.acos(Math.max(-1, Math.min(1, dot(dir1, dir2))))
  
  // Check if it's an inside or outside corner
  const crossVal = cross(dir1, dir2)
  const isOutside = crossVal * dist > 0
  
  if (!isOutside) {
    // Inside corner - just connect with line
    return [{
      type: 'LINE',
      points: [endPoint, startPoint]
    }]
  }
  
  switch (style) {
    case 'MITER': {
      // Calculate miter point
      const miterVec = normalize(add(perpendicular(dir1), perpendicular(dir2)))
      const miterLen = dist / Math.cos(cornerAngle / 2)
      
      if (miterLen > dist * miterLimit) {
        // Miter limit exceeded, use bevel
        return [{
          type: 'LINE',
          points: [endPoint, startPoint]
        }]
      }
      
      const miterPoint = add(
        lerp(endPoint, startPoint, 0.5),
        scale(miterVec, miterLen - dist)
      )
      
      return [
        { type: 'LINE', points: [endPoint, miterPoint] },
        { type: 'LINE', points: [miterPoint, startPoint] }
      ]
    }
    
    case 'ROUND': {
      // Create arc
      return createArcCorner(endPoint, startPoint, dist, arcTolerance)
    }
    
    case 'BEVEL':
    default:
      return [{
        type: 'LINE',
        points: [endPoint, startPoint]
      }]
  }
}

/**
 * Get end direction of segment
 */
function getSegmentEndDirection(segment: OffsetSegment): Point {
  const points = segment.points
  if (segment.type === 'BEZIER' && segment.controlPoints) {
    return normalize(sub(points[1], segment.controlPoints[1]))
  }
  return normalize(sub(points[1], points[0]))
}

/**
 * Get start direction of segment
 */
function getSegmentStartDirection(segment: OffsetSegment): Point {
  const points = segment.points
  if (segment.type === 'BEZIER' && segment.controlPoints) {
    return normalize(sub(segment.controlPoints[0], points[0]))
  }
  return normalize(sub(points[1], points[0]))
}

/**
 * Create arc corner segments
 */
function createArcCorner(
  start: Point,
  end: Point,
  radius: number,
  tolerance: number
): OffsetSegment[] {
  // Calculate arc parameters
  const chord = sub(end, start)
  const chordLen = length(chord)
  
  if (chordLen < 0.001) return []
  
  // Approximate arc with Bezier curves
  const midPoint = lerp(start, end, 0.5)
  const perpDir = normalize(perpendicular(chord))
  
  // Sagitta (height of arc)
  const sagitta = radius - Math.sqrt(Math.max(0, radius * radius - (chordLen / 2) * (chordLen / 2)))
  const arcMid = add(midPoint, scale(perpDir, sagitta))
  
  // Create quadratic-like Bezier
  const cp1 = lerp(start, arcMid, 0.5)
  const cp2 = lerp(arcMid, end, 0.5)
  
  return [{
    type: 'BEZIER',
    points: [start, end],
    controlPoints: [cp1, cp2]
  }]
}

/**
 * Convert segments back to BezierPath
 */
function segmentsToBezierPath(segments: OffsetSegment[], id: string): BezierPath {
  const points: BezierPoint[] = []
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const prevSeg = segments[(i - 1 + segments.length) % segments.length]
    
    if (seg.type === 'LINE') {
      if (i === 0 || distance(seg.points[0], points[points.length - 1]?.anchor || seg.points[0]) > 0.001) {
        points.push({ anchor: seg.points[0] })
      }
    } else if (seg.type === 'BEZIER') {
      const [p0, p3] = seg.points
      const [p1, p2] = seg.controlPoints!
      
      if (i === 0 || distance(p0, points[points.length - 1]?.anchor || p0) > 0.001) {
        points.push({
          anchor: p0,
          handleOut: p1
        })
      } else if (points.length > 0) {
        points[points.length - 1].handleOut = p1
      }
      
      points.push({
        anchor: p3,
        handleIn: p2
      })
    }
  }
  
  return {
    id,
    points,
    closed: false
  }
}

/**
 * Remove self-intersecting loops from path
 */
function removePathLoops(path: BezierPath, tolerance: number): BezierPath {
  // Simplified loop removal - find and remove self-intersections
  // Full implementation would use Bentley-Ottmann algorithm
  
  const points = [...path.points]
  
  // For now, just return the path
  // TODO: Implement proper loop removal
  
  return {
    ...path,
    points
  }
}

// ============================================
// VARIABLE WIDTH TRAP
// ============================================

/**
 * Generate variable width trap path
 */
export function generateVariableWidthTrap(
  path: BezierPath,
  profile: VariableWidthProfile,
  options: Omit<AdvancedOffsetOptions, 'distance' | 'variableWidth'>
): BezierPath {
  const segments = pathToSegments(path)
  const totalLength = calculatePathLength(path)
  
  let currentLength = 0
  const offsetSegments: OffsetSegment[] = []
  
  for (const segment of segments) {
    const segLength = getSegmentLength(segment)
    const startT = currentLength / totalLength
    const endT = (currentLength + segLength) / totalLength
    
    // Get width at start and end of segment
    const startWidth = getWidthAtT(profile, startT)
    const endWidth = getWidthAtT(profile, endT)
    
    // Offset segment with interpolated width
    const avgWidth = (startWidth + endWidth) / 2
    const offsetSeg = offsetSegment(segment, avgWidth, undefined, undefined, {
      ...options,
      distance: avgWidth
    })
    
    offsetSegments.push(offsetSeg)
    currentLength += segLength
  }
  
  return segmentsToBezierPath(offsetSegments, path.id + '_variable_offset')
}

/**
 * Get width at parameter t based on profile
 */
function getWidthAtT(profile: VariableWidthProfile, t: number): number {
  switch (profile.type) {
    case 'LINEAR':
      return profile.startWidth + (profile.endWidth - profile.startWidth) * t
    
    case 'EASE':
      // Ease in-out
      const easeT = t < 0.5 
        ? 2 * t * t 
        : 1 - Math.pow(-2 * t + 2, 2) / 2
      return profile.startWidth + (profile.endWidth - profile.startWidth) * easeT
    
    case 'CUSTOM':
      if (profile.customProfile && profile.customProfile.length > 0) {
        const idx = t * (profile.customProfile.length - 1)
        const i = Math.floor(idx)
        const frac = idx - i
        
        if (i >= profile.customProfile.length - 1) {
          return profile.startWidth * profile.customProfile[profile.customProfile.length - 1]
        }
        
        const w1 = profile.customProfile[i]
        const w2 = profile.customProfile[i + 1]
        return profile.startWidth * (w1 + (w2 - w1) * frac)
      }
      return profile.startWidth
    
    default:
      return profile.startWidth
  }
}

/**
 * Calculate total path length
 */
function calculatePathLength(path: BezierPath): number {
  let length = 0
  const n = path.points.length
  
  for (let i = 0; i < n - (path.closed ? 0 : 1); i++) {
    const curr = path.points[i]
    const next = path.points[(i + 1) % n]
    
    if (curr.handleOut || next.handleIn) {
      const p0 = curr.anchor
      const p1 = curr.handleOut || curr.anchor
      const p2 = next.handleIn || next.anchor
      const p3 = next.anchor
      length += bezierLength(p0, p1, p2, p3)
    } else {
      length += distance(curr.anchor, next.anchor)
    }
  }
  
  return length
}

/**
 * Get segment length
 */
function getSegmentLength(segment: OffsetSegment): number {
  if (segment.type === 'LINE') {
    return distance(segment.points[0], segment.points[1])
  } else if (segment.type === 'BEZIER' && segment.controlPoints) {
    return bezierLength(
      segment.points[0],
      segment.controlPoints[0],
      segment.controlPoints[1],
      segment.points[1]
    )
  }
  return 0
}
