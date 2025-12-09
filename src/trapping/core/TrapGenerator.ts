/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * GPCS CodeStudio - Auto-Trapping Engine
 * Trap Geometry Generator (TODO 3)
 * 
 * Generates trap geometry:
 * - Bezier curve offset (positive/negative)
 * - Corner handling (miter, round, bevel)
 * - Soft traps for bitmaps (feathering)
 * - Trap merging for overlapping areas
 */

import type {
  BezierPath,
  BezierPoint,
  Point,
  TrapObject,
  TrapDecision,
  TrapStyle,
  // TrapDirection - reserved for future use
  ColorDefinition,
  TrapSettings,
  ColorRegion,
  TrapLayer,
} from '../types/trappingTypes'

// ============================================
// VECTOR MATH UTILITIES
// ============================================

function addVectors(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y }
}

function subtractVectors(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

function scaleVector(v: Point, s: number): Point {
  return { x: v.x * s, y: v.y * s }
}

function normalizeVector(v: Point): Point {
  const len = Math.sqrt(v.x * v.x + v.y * v.y)
  if (len === 0) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

function perpendicularVector(v: Point): Point {
  return { x: -v.y, y: v.x }
}

function vectorLength(v: Point): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

function dotProduct(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _crossProduct(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t)
  }
}

// ============================================
// BEZIER CURVE UTILITIES
// ============================================

/**
 * Evaluate cubic Bezier curve at parameter t
 */
function evaluateBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const t2 = t * t
  const t3 = t2 * t
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  }
}

/**
 * Get tangent vector at parameter t on cubic Bezier
 */
function bezierTangent(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const t2 = t * t
  const mt = 1 - t
  const mt2 = mt * mt

  return {
    x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y)
  }
}

/**
 * Get normal vector at parameter t on cubic Bezier
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _bezierNormal(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const tangent = bezierTangent(p0, p1, p2, p3, t)
  const normal = perpendicularVector(tangent)
  return normalizeVector(normal)
}

/**
 * Approximate Bezier curve length
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _approximateBezierLength(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  segments: number = 10
): number {
  let length = 0
  let prevPoint = p0

  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const point = evaluateBezier(p0, p1, p2, p3, t)
    length += vectorLength(subtractVectors(point, prevPoint))
    prevPoint = point
  }

  return length
}

// ============================================
// PATH OFFSET ENGINE
// ============================================

export interface OffsetOptions {
  distance: number          // Offset distance in mm
  cornerStyle: 'MITER' | 'ROUND' | 'BEVEL'
  miterLimit: number        // Max miter length ratio
  stepSize: number          // Sampling step for curves
  direction: 'LEFT' | 'RIGHT'  // Offset direction
}

/**
 * Offset a Bezier path by a given distance
 */
export function offsetPath(
  path: BezierPath,
  options: OffsetOptions
): BezierPath {
  const { distance, cornerStyle, miterLimit, direction } = options
  const sign = direction === 'LEFT' ? 1 : -1
  const offsetDist = distance * sign

  const offsetPoints: BezierPoint[] = []
  const n = path.points.length

  if (n < 2) return path

  for (let i = 0; i < n; i++) {
    const curr = path.points[i]
    const prev = path.points[(i - 1 + n) % n]
    const next = path.points[(i + 1) % n]

    // Get edge directions
    const dirIn = normalizeVector(subtractVectors(curr.anchor, prev.anchor))
    const dirOut = normalizeVector(subtractVectors(next.anchor, curr.anchor))

    // Get perpendicular (normal) directions
    const normIn = perpendicularVector(dirIn)
    const normOut = perpendicularVector(dirOut)

    // Calculate offset point based on corner style
    let offsetPoint: Point

    if (i === 0 && !path.closed) {
      // Start point - use outgoing normal
      offsetPoint = addVectors(curr.anchor, scaleVector(normOut, offsetDist))
    } else if (i === n - 1 && !path.closed) {
      // End point - use incoming normal
      offsetPoint = addVectors(curr.anchor, scaleVector(normIn, offsetDist))
    } else {
      // Interior point or closed path - handle corner
      offsetPoint = calculateCornerOffset(
        curr.anchor,
        normIn,
        normOut,
        offsetDist,
        cornerStyle,
        miterLimit
      )
    }

    // Create offset bezier point
    const offsetBezierPoint: BezierPoint = {
      anchor: offsetPoint
    }

    // Offset handles if present
    if (curr.handleIn) {
      const handleDir = normalizeVector(subtractVectors(curr.handleIn, curr.anchor))
      const handleNorm = perpendicularVector(handleDir)
      offsetBezierPoint.handleIn = addVectors(
        curr.handleIn,
        scaleVector(handleNorm, offsetDist)
      )
    }

    if (curr.handleOut) {
      const handleDir = normalizeVector(subtractVectors(curr.handleOut, curr.anchor))
      const handleNorm = perpendicularVector(handleDir)
      offsetBezierPoint.handleOut = addVectors(
        curr.handleOut,
        scaleVector(handleNorm, offsetDist)
      )
    }

    offsetPoints.push(offsetBezierPoint)
  }

  return {
    id: `${path.id}_offset`,
    points: offsetPoints,
    closed: path.closed
  }
}

/**
 * Calculate offset point at a corner
 */
function calculateCornerOffset(
  anchor: Point,
  normIn: Point,
  normOut: Point,
  distance: number,
  style: 'MITER' | 'ROUND' | 'BEVEL',
  miterLimit: number
): Point {
  // Average normal for simple offset
  const avgNorm = normalizeVector(addVectors(normIn, normOut))
  
  // Calculate miter length
  const dot = dotProduct(normIn, normOut)
  const miterLength = distance / Math.cos(Math.acos(Math.max(-1, Math.min(1, dot))) / 2)

  switch (style) {
    case 'MITER':
      // Check miter limit
      if (Math.abs(miterLength) <= distance * miterLimit) {
        return addVectors(anchor, scaleVector(avgNorm, miterLength))
      }
      // Fall through to bevel if miter limit exceeded
      // falls through
    case 'BEVEL':
      // Use average normal with standard distance
      return addVectors(anchor, scaleVector(avgNorm, distance))
      
    case 'ROUND':
      // For round corners, we'd need to add arc segments
      // Simplified: use average normal
      return addVectors(anchor, scaleVector(avgNorm, distance))
      
    default:
      return addVectors(anchor, scaleVector(avgNorm, distance))
  }
}

// ============================================
// TRAP GEOMETRY GENERATION
// ============================================

/**
 * Generate trap geometry between two regions
 */
export function generateTrap(
  regionA: ColorRegion,
  regionB: ColorRegion,
  decision: TrapDecision,
  settings: TrapSettings
): TrapObject | null {
  if (decision.direction === 'NONE') {
    return null
  }

  // Determine which region provides the trap path
  const sourceRegion = decision.direction === 'SPREAD' ? regionA : regionB
  const targetRegion = decision.direction === 'SPREAD' ? regionB : regionA

  // Get the shared edge or use source contour
  const trapPath = generateTrapPath(
    sourceRegion,
    targetRegion,
    decision,
    settings
  )

  if (!trapPath) return null

  // Determine trap color
  const trapColor = determineTrapColor(
    sourceRegion.color,
    targetRegion.color,
    decision
  )

  return {
    id: `trap_${regionA.id}_${regionB.id}`,
    sourceRegionId: sourceRegion.id,
    targetRegionId: targetRegion.id,
    path: trapPath,
    widthMm: decision.widthMm,
    style: decision.style,
    featherAmount: decision.style === 'FEATHERED' ? decision.widthMm * 0.5 : undefined,
    color: trapColor,
    overprint: true,
    decision,
    generatedAt: new Date()
  }
}

/**
 * Generate the actual trap path geometry
 */
function generateTrapPath(
  sourceRegion: ColorRegion,
  _targetRegion: ColorRegion,
  decision: TrapDecision,
  settings: TrapSettings
): BezierPath | null {
  const width = decision.widthMm

  // For SPREAD: offset source outward
  // For CHOKE: offset target inward
  // For CENTERLINE: offset both by half width
  
  let offsetDistance: number
  let offsetDirection: 'LEFT' | 'RIGHT'

  switch (decision.direction) {
    case 'SPREAD':
      offsetDistance = width
      offsetDirection = 'LEFT' // Outward
      break
    case 'CHOKE':
      offsetDistance = width
      offsetDirection = 'RIGHT' // Inward
      break
    case 'CENTERLINE':
      offsetDistance = width / 2
      offsetDirection = 'LEFT'
      break
    default:
      return null
  }

  const offsetOptions: OffsetOptions = {
    distance: offsetDistance,
    cornerStyle: settings.cornerStyle,
    miterLimit: settings.miterLimit,
    stepSize: settings.stepLimitMm,
    direction: offsetDirection
  }

  // Create trap stroke path
  const innerPath = sourceRegion.contour
  const outerPath = offsetPath(innerPath, offsetOptions)

  // Combine into closed trap region
  return createTrapRegion(innerPath, outerPath, decision.style)
}

/**
 * Create closed trap region from inner and outer paths
 */
function createTrapRegion(
  innerPath: BezierPath,
  outerPath: BezierPath,
  _style: TrapStyle
): BezierPath {
  // For a proper trap, we need to create a closed region
  // between the inner and outer paths
  
  const trapPoints: BezierPoint[] = []

  // Add outer path points
  for (const point of outerPath.points) {
    trapPoints.push({ ...point })
  }

  // Add reversed inner path points to close the region
  for (let i = innerPath.points.length - 1; i >= 0; i--) {
    const point = innerPath.points[i]
    trapPoints.push({
      anchor: point.anchor,
      handleIn: point.handleOut,
      handleOut: point.handleIn
    })
  }

  return {
    id: `trap_region_${innerPath.id}`,
    points: trapPoints,
    closed: true
  }
}

/**
 * Determine the color for the trap
 */
function determineTrapColor(
  sourceColor: ColorDefinition,
  targetColor: ColorDefinition,
  decision: TrapDecision
): ColorDefinition {
  // For SPREAD: use source color (lighter color spreading)
  // For CHOKE: use target color (darker color)
  // For CENTERLINE: blend colors
  
  switch (decision.direction) {
    case 'SPREAD':
      return { ...sourceColor, id: `trap_${sourceColor.id}` }
    
    case 'CHOKE':
      return { ...targetColor, id: `trap_${targetColor.id}` }
    
    case 'CENTERLINE':
      // Blend the two colors
      return blendColors(sourceColor, targetColor)
    
    default:
      return sourceColor
  }
}

/**
 * Blend two colors for centerline trap
 */
function blendColors(colorA: ColorDefinition, colorB: ColorDefinition): ColorDefinition {
  const cmykA = colorA.cmyk || { c: 0, m: 0, y: 0, k: 0 }
  const cmykB = colorB.cmyk || { c: 0, m: 0, y: 0, k: 0 }

  // Take maximum of each channel (simulates overprint)
  const blendedCmyk = {
    c: Math.max(cmykA.c, cmykB.c),
    m: Math.max(cmykA.m, cmykB.m),
    y: Math.max(cmykA.y, cmykB.y),
    k: Math.max(cmykA.k, cmykB.k)
  }

  return {
    ...colorA,
    id: `trap_blend_${colorA.id}_${colorB.id}`,
    cmyk: blendedCmyk,
    // Recalculate derived properties would be needed here
  }
}

// ============================================
// SOFT TRAP (FEATHERED) GENERATION
// ============================================

export interface SoftTrapOptions {
  featherWidth: number    // Feather distance in mm
  steps: number           // Number of gradient steps
  opacity: number         // Base opacity
}

/**
 * Generate soft trap for bitmap edges
 */
export function generateSoftTrap(
  region: ColorRegion,
  options: SoftTrapOptions
): TrapObject[] {
  const traps: TrapObject[] = []
  const { featherWidth, steps, opacity } = options

  // Generate multiple offset paths with decreasing opacity
  for (let i = 0; i < steps; i++) {
    const stepDistance = (featherWidth / steps) * (i + 1)
    const stepOpacity = opacity * (1 - i / steps)

    const offsetOptions: OffsetOptions = {
      distance: stepDistance,
      cornerStyle: 'ROUND',
      miterLimit: 2,
      stepSize: 0.1,
      direction: 'LEFT'
    }

    const offsetPathResult = offsetPath(region.contour, offsetOptions)
    
    // Create trap object for this step
    const trapColor: ColorDefinition = {
      ...region.color,
      id: `soft_trap_${region.id}_${i}`,
      opacity: stepOpacity
    }

    traps.push({
      id: `soft_trap_${region.id}_${i}`,
      sourceRegionId: region.id,
      targetRegionId: region.id,
      path: offsetPathResult,
      widthMm: stepDistance,
      style: 'FEATHERED',
      featherAmount: featherWidth,
      color: trapColor,
      overprint: true,
      decision: {
        regionAId: region.id,
        regionBId: region.id,
        direction: 'SPREAD',
        widthMm: featherWidth,
        style: 'FEATHERED',
        appliedRule: {
          id: 'soft_trap',
          name: 'Soft Trap Rule',
          priority: 0,
          sourceColorTypes: ['PROCESS_CMYK'],
          targetColorTypes: ['PROCESS_CMYK'],
          direction: 'SPREAD',
          widthMm: featherWidth,
          style: 'FEATHERED',
          applyToText: false,
          minTextSizePt: 6,
          applyToThinLines: false,
          minLineWidthMm: 0.25
        },
        colorPriorityA: 0,
        colorPriorityB: 0,
        warnings: []
      },
      generatedAt: new Date()
    })
  }

  return traps
}

// ============================================
// TRAP MERGING
// ============================================

/**
 * Merge overlapping traps into single objects
 */
export function mergeOverlappingTraps(traps: TrapObject[]): TrapObject[] {
  if (traps.length < 2) return traps

  const merged: TrapObject[] = []
  const processed = new Set<string>()

  for (const trap of traps) {
    if (processed.has(trap.id)) continue

    // Find all traps that overlap with this one
    const overlapping = traps.filter(t => 
      !processed.has(t.id) && 
      t.id !== trap.id && 
      trapsOverlap(trap, t)
    )

    if (overlapping.length === 0) {
      merged.push(trap)
    } else {
      // Merge all overlapping traps
      const mergedTrap = mergeTraps([trap, ...overlapping])
      merged.push(mergedTrap)
      
      // Mark all as processed
      overlapping.forEach(t => processed.add(t.id))
    }

    processed.add(trap.id)
  }

  return merged
}

/**
 * Check if two traps overlap
 */
function trapsOverlap(trapA: TrapObject, trapB: TrapObject): boolean {
  // Simple bounding box check
  const boundsA = getPathBounds(trapA.path)
  const boundsB = getPathBounds(trapB.path)

  return !(
    boundsA.x + boundsA.width < boundsB.x ||
    boundsB.x + boundsB.width < boundsA.x ||
    boundsA.y + boundsA.height < boundsB.y ||
    boundsB.y + boundsB.height < boundsA.y
  )
}

function getPathBounds(path: BezierPath): { x: number; y: number; width: number; height: number } {
  if (path.points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  for (const point of path.points) {
    minX = Math.min(minX, point.anchor.x)
    minY = Math.min(minY, point.anchor.y)
    maxX = Math.max(maxX, point.anchor.x)
    maxY = Math.max(maxY, point.anchor.y)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

/**
 * Merge multiple traps into one
 */
function mergeTraps(traps: TrapObject[]): TrapObject {
  // For now, just combine all paths
  // A proper implementation would use boolean union
  
  const allPoints: BezierPoint[] = []
  
  for (const trap of traps) {
    allPoints.push(...trap.path.points)
  }

  const mergedPath: BezierPath = {
    id: `merged_${traps.map(t => t.id).join('_')}`,
    points: allPoints,
    closed: true
  }

  // Use the first trap as base
  return {
    ...traps[0],
    id: `merged_trap_${Date.now()}`,
    path: mergedPath
  }
}

// ============================================
// TRAP LAYER BUILDER
// ============================================

import { 
  resolveTrapTag, 
  applyTrapTagDirection, 
  applyTrapTagWidth,
  shouldTrapObject 
} from './TrapRuleEngine'
import type { TrapTag } from '../types/trappingTypes'

/**
 * Build complete trap layer from decisions
 * Now supports TrapTags for selective trapping
 */
export function buildTrapLayer(
  documentId: string,
  decisions: TrapDecision[],
  regions: Map<string, ColorRegion>,
  settings: TrapSettings,
  trapTags: TrapTag[] = []
): TrapLayer {
  const startTime = Date.now()
  const traps: TrapObject[] = []

  for (const decision of decisions) {
    if (decision.direction === 'NONE') continue

    const regionA = regions.get(decision.regionAId)
    const regionB = regions.get(decision.regionBId)

    if (!regionA || !regionB) continue

    // Check TrapTags for both regions
    const tagA = resolveTrapTag(decision.regionAId, trapTags)
    const tagB = resolveTrapTag(decision.regionBId, trapTags)
    
    // Skip if either region has NEVER mode
    if (!shouldTrapObject(decision.regionAId, trapTags) || 
        !shouldTrapObject(decision.regionBId, trapTags)) {
      continue
    }
    
    // Apply TrapTag overrides to decision
    let modifiedDecision = { ...decision }
    
    // Apply direction override from TrapTag (prefer tagA if both exist)
    if (tagA) {
      modifiedDecision.direction = applyTrapTagDirection(tagA, decision.direction)
    } else if (tagB) {
      // Reverse direction for tagB
      const reversedDir = decision.direction === 'SPREAD' ? 'CHOKE' : 
                          decision.direction === 'CHOKE' ? 'SPREAD' : decision.direction
      modifiedDecision.direction = applyTrapTagDirection(tagB, reversedDir)
    }
    
    // Apply width override from TrapTag
    const customWidth = applyTrapTagWidth(tagA, 0) || applyTrapTagWidth(tagB, 0)
    if (customWidth > 0) {
      modifiedDecision.widthMm = customWidth
    }

    const trap = generateTrap(regionA, regionB, modifiedDecision, settings)
    if (trap) {
      // Add TrapTag info to trap metadata
      if (tagA || tagB) {
        trap.metadata = {
          ...trap.metadata,
          trapTagApplied: true,
          trapTagId: tagA?.id || tagB?.id
        }
      }
      traps.push(trap)
    }
  }

  // Merge overlapping traps
  const mergedTraps = mergeOverlappingTraps(traps)

  // Calculate statistics
  let totalArea = 0
  for (const trap of mergedTraps) {
    totalArea += calculatePathArea(trap.path)
  }

  return {
    id: `trap_layer_${documentId}`,
    documentId,
    name: 'Auto Trapping',
    traps: mergedTraps,
    totalTrapCount: mergedTraps.length,
    totalTrapAreaMm2: totalArea,
    settings,
    generatedAt: new Date(),
    generationTimeMs: Date.now() - startTime
  }
}

function calculatePathArea(path: BezierPath): number {
  let area = 0
  const n = path.points.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += path.points[i].anchor.x * path.points[j].anchor.y
    area -= path.points[j].anchor.x * path.points[i].anchor.y
  }

  return Math.abs(area) / 2
}
