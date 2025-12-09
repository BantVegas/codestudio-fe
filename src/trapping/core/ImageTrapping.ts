/**
 * GPCS CodeStudio - Image Trapping Engine
 * 
 * Handles trapping between raster images and vector elements
 * Features:
 * - Image edge detection
 * - Color sampling at boundaries
 * - Automatic trap direction based on image content
 * - Soft/feathered traps for smooth transitions
 */

import type {
  BezierPath,
  BezierPoint,
  Point,
  ColorDefinition,
  TrapObject,
  TrapDecision,
  TrapSettings,
  TrapDirection,
  CMYKColor,
} from '../types/trappingTypes'

// ============================================
// TYPES
// ============================================

export interface ImageRegion {
  id: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  // Image data for edge analysis
  imageData?: ImageData
  // Effective resolution
  dpi: number
  // Color space
  colorSpace: 'CMYK' | 'RGB' | 'GRAY'
  // Has alpha/transparency
  hasAlpha: boolean
  // Clipping path if any
  clippingPath?: BezierPath
}

export interface ImageEdge {
  path: BezierPath
  // Colors sampled along the edge (from image side)
  sampledColors: EdgeColorSample[]
  // Edge type
  type: 'HARD' | 'SOFT' | 'GRADIENT'
  // Average color along edge
  averageColor: CMYKColor
}

export interface EdgeColorSample {
  position: Point
  parameter: number  // 0-1 along edge
  color: CMYKColor
  alpha: number
}

export interface ImageTrapOptions {
  // Trap direction mode
  directionMode: 'AUTOMATIC' | 'TOWARDS_IMAGE' | 'TOWARDS_VECTOR'
  // Sampling resolution for edge colors
  samplingResolution: number  // samples per mm
  // Edge detection threshold
  edgeThreshold: number  // 0-1
  // Use soft trap for gradients
  softTrapForGradients: boolean
  // Feather amount for soft traps
  featherAmount: number  // mm
  // Minimum contrast for trapping
  minContrast: number  // Delta E
  // Extend image data for trap color
  extendImageData: boolean
}

export const DEFAULT_IMAGE_TRAP_OPTIONS: ImageTrapOptions = {
  directionMode: 'AUTOMATIC',
  samplingResolution: 10,
  edgeThreshold: 0.1,
  softTrapForGradients: true,
  featherAmount: 0.15,
  minContrast: 5,
  extendImageData: true
}

// ============================================
// IMAGE EDGE DETECTION
// ============================================

/**
 * Detect edges of an image region
 */
export function detectImageEdges(
  region: ImageRegion,
  options: ImageTrapOptions
): ImageEdge[] {
  const edges: ImageEdge[] = []
  
  // If image has clipping path, use that as edge
  if (region.clippingPath) {
    const edge = analyzeClippingPathEdge(region, region.clippingPath, options)
    edges.push(edge)
  } else {
    // Use bounding box as edge
    const bboxPath = createBoundingBoxPath(region.bounds)
    const edge = analyzeClippingPathEdge(region, bboxPath, options)
    edges.push(edge)
  }
  
  return edges
}

/**
 * Create bounding box path
 */
function createBoundingBoxPath(bounds: { x: number; y: number; width: number; height: number }): BezierPath {
  return {
    id: 'bbox_path',
    points: [
      { anchor: { x: bounds.x, y: bounds.y } },
      { anchor: { x: bounds.x + bounds.width, y: bounds.y } },
      { anchor: { x: bounds.x + bounds.width, y: bounds.y + bounds.height } },
      { anchor: { x: bounds.x, y: bounds.y + bounds.height } }
    ],
    closed: true
  }
}

/**
 * Analyze edge along clipping path
 */
function analyzeClippingPathEdge(
  region: ImageRegion,
  path: BezierPath,
  options: ImageTrapOptions
): ImageEdge {
  const sampledColors: EdgeColorSample[] = []
  
  // Sample colors along the path
  const pathLength = calculatePathLength(path)
  const numSamples = Math.max(10, Math.ceil(pathLength * options.samplingResolution))
  
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples
    const point = getPointAtParameter(path, t)
    
    // Sample color from image at this point (slightly inside)
    const color = sampleImageColorAtPoint(region, point, 0.5) // 0.5mm inside
    
    sampledColors.push({
      position: point,
      parameter: t,
      color,
      alpha: 1
    })
  }
  
  // Determine edge type based on color variation
  const edgeType = determineEdgeType(sampledColors, options.edgeThreshold)
  
  // Calculate average color
  const averageColor = calculateAverageColor(sampledColors)
  
  return {
    path,
    sampledColors,
    type: edgeType,
    averageColor
  }
}

/**
 * Get point at parameter t along path
 */
function getPointAtParameter(path: BezierPath, t: number): Point {
  const n = path.points.length
  if (n === 0) return { x: 0, y: 0 }
  if (n === 1) return path.points[0].anchor
  
  // Find which segment t falls into
  const totalSegments = path.closed ? n : n - 1
  const segmentT = t * totalSegments
  const segmentIndex = Math.min(Math.floor(segmentT), totalSegments - 1)
  const localT = segmentT - segmentIndex
  
  const p0 = path.points[segmentIndex]
  const p1 = path.points[(segmentIndex + 1) % n]
  
  // Check if bezier or line
  if (p0.handleOut || p1.handleIn) {
    return evaluateCubicBezier(
      p0.anchor,
      p0.handleOut || p0.anchor,
      p1.handleIn || p1.anchor,
      p1.anchor,
      localT
    )
  } else {
    return lerpPoint(p0.anchor, p1.anchor, localT)
  }
}

/**
 * Evaluate cubic bezier
 */
function evaluateCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
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
 * Linear interpolation between points
 */
function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  }
}

/**
 * Calculate path length
 */
function calculatePathLength(path: BezierPath): number {
  let length = 0
  const n = path.points.length
  
  for (let i = 0; i < (path.closed ? n : n - 1); i++) {
    const p0 = path.points[i]
    const p1 = path.points[(i + 1) % n]
    
    if (p0.handleOut || p1.handleIn) {
      // Approximate bezier length
      length += approximateBezierLength(
        p0.anchor,
        p0.handleOut || p0.anchor,
        p1.handleIn || p1.anchor,
        p1.anchor
      )
    } else {
      length += distance(p0.anchor, p1.anchor)
    }
  }
  
  return length
}

/**
 * Approximate bezier curve length
 */
function approximateBezierLength(p0: Point, p1: Point, p2: Point, p3: Point, segments: number = 10): number {
  let length = 0
  let prev = p0
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const curr = evaluateCubicBezier(p0, p1, p2, p3, t)
    length += distance(prev, curr)
    prev = curr
  }
  
  return length
}

/**
 * Distance between two points
 */
function distance(a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Sample image color at a point
 */
function sampleImageColorAtPoint(
  region: ImageRegion,
  point: Point,
  insideOffset: number
): CMYKColor {
  // If we have actual image data, sample from it
  if (region.imageData) {
    return sampleFromImageData(region, point, insideOffset)
  }
  
  // Otherwise return a default/estimated color
  return { c: 0, m: 0, y: 0, k: 0 }
}

/**
 * Sample color from actual image data
 */
function sampleFromImageData(
  region: ImageRegion,
  point: Point,
  _insideOffset: number
): CMYKColor {
  const imageData = region.imageData!
  const { bounds } = region
  
  // Convert point to image coordinates
  const imgX = Math.floor(((point.x - bounds.x) / bounds.width) * imageData.width)
  const imgY = Math.floor(((point.y - bounds.y) / bounds.height) * imageData.height)
  
  // Clamp to image bounds
  const x = Math.max(0, Math.min(imageData.width - 1, imgX))
  const y = Math.max(0, Math.min(imageData.height - 1, imgY))
  
  // Get pixel data
  const idx = (y * imageData.width + x) * 4
  const r = imageData.data[idx] / 255
  const g = imageData.data[idx + 1] / 255
  const b = imageData.data[idx + 2] / 255
  
  // Convert RGB to CMYK
  return rgbToCmyk(r, g, b)
}

/**
 * Convert RGB to CMYK
 */
function rgbToCmyk(r: number, g: number, b: number): CMYKColor {
  const k = 1 - Math.max(r, g, b)
  
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 }
  }
  
  return {
    c: ((1 - r - k) / (1 - k)) * 100,
    m: ((1 - g - k) / (1 - k)) * 100,
    y: ((1 - b - k) / (1 - k)) * 100,
    k: k * 100
  }
}

/**
 * Determine edge type based on color variation
 */
function determineEdgeType(
  samples: EdgeColorSample[],
  threshold: number
): 'HARD' | 'SOFT' | 'GRADIENT' {
  if (samples.length < 2) return 'HARD'
  
  // Calculate color variance along edge
  let totalVariance = 0
  
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1].color
    const curr = samples[i].color
    
    const deltaC = Math.abs(curr.c - prev.c)
    const deltaM = Math.abs(curr.m - prev.m)
    const deltaY = Math.abs(curr.y - prev.y)
    const deltaK = Math.abs(curr.k - prev.k)
    
    totalVariance += (deltaC + deltaM + deltaY + deltaK) / 4
  }
  
  const avgVariance = totalVariance / (samples.length - 1)
  
  if (avgVariance < threshold * 10) {
    return 'HARD'
  } else if (avgVariance < threshold * 50) {
    return 'SOFT'
  } else {
    return 'GRADIENT'
  }
}

/**
 * Calculate average color from samples
 */
function calculateAverageColor(samples: EdgeColorSample[]): CMYKColor {
  if (samples.length === 0) {
    return { c: 0, m: 0, y: 0, k: 0 }
  }
  
  let totalC = 0, totalM = 0, totalY = 0, totalK = 0
  
  for (const sample of samples) {
    totalC += sample.color.c
    totalM += sample.color.m
    totalY += sample.color.y
    totalK += sample.color.k
  }
  
  const n = samples.length
  return {
    c: totalC / n,
    m: totalM / n,
    y: totalY / n,
    k: totalK / n
  }
}

// ============================================
// IMAGE TRAP GENERATION
// ============================================

/**
 * Generate trap between image and vector
 */
export function generateImageToVectorTrap(
  imageRegion: ImageRegion,
  vectorPath: BezierPath,
  vectorColor: ColorDefinition,
  settings: TrapSettings,
  options: ImageTrapOptions = DEFAULT_IMAGE_TRAP_OPTIONS
): TrapObject | null {
  // Detect image edges
  const imageEdges = detectImageEdges(imageRegion, options)
  
  if (imageEdges.length === 0) return null
  
  // Find intersection/adjacency between image edge and vector path
  const adjacentEdge = findAdjacentEdge(imageEdges, vectorPath)
  
  if (!adjacentEdge) return null
  
  // Determine trap direction
  const direction = determineImageTrapDirection(
    adjacentEdge,
    vectorColor,
    options
  )
  
  if (direction === 'NONE') return null
  
  // Generate trap path
  const trapPath = generateImageTrapPath(
    adjacentEdge,
    vectorPath,
    direction,
    settings,
    options
  )
  
  if (!trapPath) return null
  
  // Determine trap color
  const trapColor = determineImageTrapColor(
    adjacentEdge,
    vectorColor,
    direction,
    options
  )
  
  // Create trap decision
  const decision: TrapDecision = {
    regionAId: imageRegion.id,
    regionBId: vectorPath.id,
    direction,
    widthMm: settings.intoImageMm,
    style: adjacentEdge.type === 'GRADIENT' && options.softTrapForGradients ? 'FEATHERED' : 'NORMAL',
    appliedRule: {
      id: 'image_trap',
      name: 'Image Trap Rule',
      priority: 80,
      sourceColorTypes: ['PROCESS_CMYK'],
      targetColorTypes: ['PROCESS_CMYK'],
      direction,
      widthMm: settings.intoImageMm,
      style: 'NORMAL',
      applyToText: false,
      minTextSizePt: 6,
      applyToThinLines: false,
      minLineWidthMm: 0.25
    },
    colorPriorityA: calculateColorPriority(adjacentEdge.averageColor),
    colorPriorityB: vectorColor.neutralDensity,
    warnings: []
  }
  
  return {
    id: `image_trap_${imageRegion.id}_${vectorPath.id}`,
    sourceRegionId: imageRegion.id,
    targetRegionId: vectorPath.id,
    path: trapPath,
    widthMm: settings.intoImageMm,
    style: decision.style,
    featherAmount: options.softTrapForGradients ? options.featherAmount : undefined,
    color: trapColor,
    overprint: true,
    decision,
    generatedAt: new Date()
  }
}

/**
 * Find adjacent edge between image and vector
 */
function findAdjacentEdge(
  imageEdges: ImageEdge[],
  vectorPath: BezierPath
): ImageEdge | null {
  // For now, return the first edge
  // Full implementation would find actual intersection/adjacency
  return imageEdges[0] || null
}

/**
 * Determine trap direction for image-vector boundary
 */
function determineImageTrapDirection(
  imageEdge: ImageEdge,
  vectorColor: ColorDefinition,
  options: ImageTrapOptions
): TrapDirection {
  switch (options.directionMode) {
    case 'TOWARDS_IMAGE':
      return 'SPREAD' // Vector spreads into image
    
    case 'TOWARDS_VECTOR':
      return 'CHOKE' // Image spreads into vector (vector chokes)
    
    case 'AUTOMATIC':
    default:
      // Compare luminance/density
      const imagePriority = calculateColorPriority(imageEdge.averageColor)
      const vectorPriority = vectorColor.neutralDensity
      
      // Check contrast
      const contrast = Math.abs(imagePriority - vectorPriority)
      if (contrast < options.minContrast / 100) {
        return 'NONE' // Not enough contrast
      }
      
      // Darker color holds edge
      if (imagePriority > vectorPriority) {
        return 'SPREAD' // Vector is lighter, spreads into image
      } else {
        return 'CHOKE' // Image is lighter, spreads into vector
      }
  }
}

/**
 * Calculate color priority from CMYK
 */
function calculateColorPriority(cmyk: CMYKColor): number {
  // Neutral density approximation
  return (cmyk.c * 0.0045 + cmyk.m * 0.0065 + cmyk.y * 0.0015 + cmyk.k * 0.018) / 100
}

/**
 * Generate trap path for image-vector boundary
 */
function generateImageTrapPath(
  imageEdge: ImageEdge,
  vectorPath: BezierPath,
  direction: TrapDirection,
  settings: TrapSettings,
  options: ImageTrapOptions
): BezierPath | null {
  const width = settings.intoImageMm
  
  // Use the shared boundary (simplified: use image edge)
  const basePath = imageEdge.path
  
  // Offset based on direction
  const offsetDirection = direction === 'SPREAD' ? 'outward' : 'inward'
  
  // Create offset path
  const offsetPoints: BezierPoint[] = []
  
  for (let i = 0; i < basePath.points.length; i++) {
    const curr = basePath.points[i]
    const prev = basePath.points[(i - 1 + basePath.points.length) % basePath.points.length]
    const next = basePath.points[(i + 1) % basePath.points.length]
    
    // Calculate normal at this point
    const dirIn = normalize(sub(curr.anchor, prev.anchor))
    const dirOut = normalize(sub(next.anchor, curr.anchor))
    const avgDir = normalize(add(dirIn, dirOut))
    const normal = perpendicular(avgDir)
    
    // Offset point
    const sign = offsetDirection === 'outward' ? 1 : -1
    const offsetPoint: Point = {
      x: curr.anchor.x + normal.x * width * sign,
      y: curr.anchor.y + normal.y * width * sign
    }
    
    offsetPoints.push({
      anchor: offsetPoint,
      handleIn: curr.handleIn ? {
        x: curr.handleIn.x + normal.x * width * sign,
        y: curr.handleIn.y + normal.y * width * sign
      } : undefined,
      handleOut: curr.handleOut ? {
        x: curr.handleOut.x + normal.x * width * sign,
        y: curr.handleOut.y + normal.y * width * sign
      } : undefined
    })
  }
  
  // Create closed trap region
  const trapPoints: BezierPoint[] = [
    ...offsetPoints,
    ...basePath.points.slice().reverse().map(p => ({
      anchor: p.anchor,
      handleIn: p.handleOut,
      handleOut: p.handleIn
    }))
  ]
  
  return {
    id: `image_trap_path_${basePath.id}`,
    points: trapPoints,
    closed: true
  }
}

/**
 * Helper functions
 */
function normalize(v: Point): Point {
  const len = Math.sqrt(v.x * v.x + v.y * v.y)
  if (len === 0) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y }
}

function perpendicular(v: Point): Point {
  return { x: -v.y, y: v.x }
}

/**
 * Determine trap color for image-vector boundary
 */
function determineImageTrapColor(
  imageEdge: ImageEdge,
  vectorColor: ColorDefinition,
  direction: TrapDirection,
  options: ImageTrapOptions
): ColorDefinition {
  if (options.extendImageData && direction === 'SPREAD') {
    // Use image edge color
    return {
      id: 'image_trap_color',
      type: 'PROCESS_CMYK',
      space: 'CMYK',
      cmyk: imageEdge.averageColor,
      opacity: 1,
      opticalDensity: calculateColorPriority(imageEdge.averageColor) * 4,
      luminance: 100 - (imageEdge.averageColor.k + (imageEdge.averageColor.c + imageEdge.averageColor.m + imageEdge.averageColor.y) / 3) / 2,
      chroma: Math.sqrt(
        Math.pow(imageEdge.averageColor.c - imageEdge.averageColor.m, 2) +
        Math.pow(imageEdge.averageColor.m - imageEdge.averageColor.y, 2)
      ),
      neutralDensity: calculateColorPriority(imageEdge.averageColor)
    }
  } else {
    // Use vector color
    return { ...vectorColor, id: 'image_trap_color' }
  }
}

// ============================================
// GRADIENT TRAP (SOFT TRAP)
// ============================================

/**
 * Generate soft trap for gradient edges
 */
export function generateGradientTrap(
  imageEdge: ImageEdge,
  vectorPath: BezierPath,
  vectorColor: ColorDefinition,
  settings: TrapSettings,
  options: ImageTrapOptions
): TrapObject[] {
  const traps: TrapObject[] = []
  const steps = 5 // Number of gradient steps
  
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const width = settings.intoImageMm * (1 - t * 0.5) // Decreasing width
    const opacity = 1 - t * 0.8 // Decreasing opacity
    
    // Interpolate color between image and vector
    const blendedColor = blendColors(
      imageEdge.averageColor,
      vectorColor.cmyk || { c: 0, m: 0, y: 0, k: 0 },
      t
    )
    
    const trapColor: ColorDefinition = {
      id: `gradient_trap_color_${i}`,
      type: 'PROCESS_CMYK',
      space: 'CMYK',
      cmyk: blendedColor,
      opacity,
      opticalDensity: 1,
      luminance: 50,
      chroma: 0,
      neutralDensity: 0.5
    }
    
    // Generate trap path at this step
    const trapPath = generateOffsetPath(imageEdge.path, width * (i + 1) / steps)
    
    if (trapPath) {
      traps.push({
        id: `gradient_trap_${i}`,
        sourceRegionId: 'image',
        targetRegionId: vectorPath.id,
        path: trapPath,
        widthMm: width,
        style: 'FEATHERED',
        featherAmount: options.featherAmount,
        color: trapColor,
        overprint: true,
        decision: {
          regionAId: 'image',
          regionBId: vectorPath.id,
          direction: 'SPREAD',
          widthMm: width,
          style: 'FEATHERED',
          appliedRule: {
            id: 'gradient_trap',
            name: 'Gradient Trap Rule',
            priority: 75,
            sourceColorTypes: ['PROCESS_CMYK'],
            targetColorTypes: ['PROCESS_CMYK'],
            direction: 'SPREAD',
            widthMm: width,
            style: 'FEATHERED',
            applyToText: false,
            minTextSizePt: 6,
            applyToThinLines: false,
            minLineWidthMm: 0.25
          },
          colorPriorityA: 0.5,
          colorPriorityB: 0.5,
          warnings: []
        },
        generatedAt: new Date()
      })
    }
  }
  
  return traps
}

/**
 * Blend two CMYK colors
 */
function blendColors(a: CMYKColor, b: CMYKColor, t: number): CMYKColor {
  return {
    c: a.c + (b.c - a.c) * t,
    m: a.m + (b.m - a.m) * t,
    y: a.y + (b.y - a.y) * t,
    k: a.k + (b.k - a.k) * t
  }
}

/**
 * Generate simple offset path
 */
function generateOffsetPath(path: BezierPath, distance: number): BezierPath {
  const offsetPoints: BezierPoint[] = []
  const n = path.points.length
  
  for (let i = 0; i < n; i++) {
    const curr = path.points[i]
    const prev = path.points[(i - 1 + n) % n]
    const next = path.points[(i + 1) % n]
    
    const dirIn = normalize(sub(curr.anchor, prev.anchor))
    const dirOut = normalize(sub(next.anchor, curr.anchor))
    const avgDir = normalize(add(dirIn, dirOut))
    const normal = perpendicular(avgDir)
    
    offsetPoints.push({
      anchor: {
        x: curr.anchor.x + normal.x * distance,
        y: curr.anchor.y + normal.y * distance
      }
    })
  }
  
  return {
    id: `${path.id}_offset_${distance}`,
    points: offsetPoints,
    closed: path.closed
  }
}
