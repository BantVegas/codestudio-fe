/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * GPCS CodeStudio - Auto-Trapping Engine
 * Color Layer Analysis Module (TODO 1)
 * 
 * Analyzes graphic objects and builds color adjacency map
 * for trapping decisions.
 */

import type {
  ColorDefinition,
  ColorType,
  CMYKColor,
  RGBColor,
  LABColor,
  GraphicObject,
  ColorRegion,
  AdjacentRegion,
  ColorAdjacencyMap,
  ContactType,
  BezierPath,
  Point,
  RiskFactors,
  DocumentLayer,
  TrappingDocument,
} from '../types/trappingTypes'

// ============================================
// COLOR UTILITIES
// ============================================

/**
 * Convert RGB to CMYK
 */
export function rgbToCmyk(rgb: RGBColor): CMYKColor {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const k = 1 - Math.max(r, g, b)
  
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 }
  }

  const c = ((1 - r - k) / (1 - k)) * 100
  const m = ((1 - g - k) / (1 - k)) * 100
  const y = ((1 - b - k) / (1 - k)) * 100

  return {
    c: Math.round(c),
    m: Math.round(m),
    y: Math.round(y),
    k: Math.round(k * 100)
  }
}

/**
 * Convert CMYK to RGB
 */
export function cmykToRgb(cmyk: CMYKColor): RGBColor {
  const c = cmyk.c / 100
  const m = cmyk.m / 100
  const y = cmyk.y / 100
  const k = cmyk.k / 100

  const r = 255 * (1 - c) * (1 - k)
  const g = 255 * (1 - m) * (1 - k)
  const b = 255 * (1 - y) * (1 - k)

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b)
  }
}

/**
 * Convert RGB to LAB (CIE L*a*b*)
 */
export function rgbToLab(rgb: RGBColor): LABColor {
  // First convert to XYZ
  let r = rgb.r / 255
  let g = rgb.g / 255
  let b = rgb.b / 255

  // sRGB to linear RGB
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92

  // RGB to XYZ (D65 illuminant)
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883

  // XYZ to LAB
  const f = (t: number) => t > 0.008856 ? Math.pow(t, 1/3) : (7.787 * t) + 16/116

  const fx = f(x)
  const fy = f(y)
  const fz = f(z)

  return {
    l: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  }
}

/**
 * Calculate optical density from CMYK
 * Used for trap direction decisions
 */
export function calculateOpticalDensity(cmyk: CMYKColor): number {
  // Simplified optical density calculation
  // Real implementation would use ICC profiles
  const totalInk = cmyk.c + cmyk.m + cmyk.y + cmyk.k
  
  // K has higher density weight
  const kWeight = 1.5
  const weightedDensity = (cmyk.c + cmyk.m + cmyk.y + cmyk.k * kWeight) / (300 + 100 * kWeight)
  
  return weightedDensity * 4 // Scale to 0-4 range
}

/**
 * Calculate neutral density (for trap priority)
 * Based on ANSI/CGATS TR 001 methodology
 */
export function calculateNeutralDensity(cmyk: CMYKColor): number {
  // Neutral density coefficients (approximate)
  const cDensity = cmyk.c * 0.0045
  const mDensity = cmyk.m * 0.0065
  const yDensity = cmyk.y * 0.0015
  const kDensity = cmyk.k * 0.018

  return cDensity + mDensity + yDensity + kDensity
}

/**
 * Calculate chroma (saturation) from LAB
 */
export function calculateChroma(lab: LABColor): number {
  return Math.sqrt(lab.a * lab.a + lab.b * lab.b)
}

/**
 * Determine color type from color definition
 */
export function determineColorType(color: ColorDefinition): ColorType {
  if (color.type) return color.type
  
  if (color.spot) {
    const name = color.spot.name.toLowerCase()
    if (name.includes('white')) return 'WHITE_UNDERPRINT'
    if (name.includes('silver') || name.includes('gold') || name.includes('metallic')) return 'METALLIC'
    if (name.includes('fluor') || name.includes('neon')) return 'FLUORESCENT'
    if (name.includes('varnish') || name.includes('coating')) return 'VARNISH'
    return 'SPOT_COLOR'
  }
  
  if (color.cmyk) {
    if (color.cmyk.c === 0 && color.cmyk.m === 0 && color.cmyk.y === 0 && color.cmyk.k === 0) {
      return 'TRANSPARENT'
    }
    return 'PROCESS_CMYK'
  }
  
  return 'PROCESS_CMYK'
}

/**
 * Build complete color definition with calculated properties
 */
export function buildColorDefinition(
  id: string,
  cmyk?: CMYKColor,
  rgb?: RGBColor,
  spot?: { name: string; tint: number },
  opacity: number = 1
): ColorDefinition {
  // Convert to common format
  let finalCmyk = cmyk
  let finalRgb = rgb
  
  if (cmyk && !rgb) {
    finalRgb = cmykToRgb(cmyk)
  } else if (rgb && !cmyk) {
    finalCmyk = rgbToCmyk(rgb)
  } else if (!cmyk && !rgb) {
    finalCmyk = { c: 0, m: 0, y: 0, k: 0 }
    finalRgb = { r: 255, g: 255, b: 255 }
  }

  const lab = rgbToLab(finalRgb!)
  
  const colorDef: ColorDefinition = {
    id,
    type: 'PROCESS_CMYK',
    space: spot ? 'SPOT' : 'CMYK',
    cmyk: finalCmyk,
    rgb: finalRgb,
    lab,
    opacity,
    opticalDensity: calculateOpticalDensity(finalCmyk!),
    luminance: lab.l,
    chroma: calculateChroma(lab),
    neutralDensity: calculateNeutralDensity(finalCmyk!)
  }

  if (spot) {
    colorDef.spot = {
      name: spot.name,
      alternateSpace: finalCmyk!,
      tint: spot.tint
    }
    colorDef.space = 'SPOT'
  }

  colorDef.type = determineColorType(colorDef)

  return colorDef
}

// ============================================
// RISK ASSESSMENT
// ============================================

/**
 * Analyze object for trapping risk factors
 */
export function analyzeRiskFactors(obj: GraphicObject): RiskFactors {
  const warnings: string[] = []
  
  // Check for small text
  const isSmallText = obj.type === 'TEXT' && checkSmallText(obj)
  if (isSmallText) {
    warnings.push('Text smaller than 6pt may have trapping issues')
  }
  
  // Check for thin lines
  const isThinLine = obj.stroke !== undefined && obj.stroke.width < 0.25
  if (isThinLine) {
    warnings.push('Stroke thinner than 0.25mm may have trapping issues')
  }
  
  // Check for sharp angles
  const hasSharpAngles = checkSharpAngles(obj.paths)
  if (hasSharpAngles) {
    warnings.push('Sharp angles (<30°) may cause trap artifacts')
  }
  
  // Check path complexity
  const isHighDetail = checkHighDetail(obj.paths)
  if (isHighDetail) {
    warnings.push('Complex path may require special trap handling')
  }

  return {
    isSmallText,
    isThinLine,
    hasSharpAngles,
    isHighDetail,
    requiresSpecialHandling: isSmallText || isThinLine || hasSharpAngles,
    warnings
  }
}

function checkSmallText(obj: GraphicObject): boolean {
  // Would check actual font size from text object
  // For now, estimate based on bounds
  if (obj.type !== 'TEXT') return false
  const height = obj.bounds.height
  // 6pt ≈ 2.1mm
  return height < 2.1
}

function checkSharpAngles(paths: BezierPath[]): boolean {
  for (const path of paths) {
    if (path.points.length < 3) continue
    
    for (let i = 0; i < path.points.length; i++) {
      const prev = path.points[(i - 1 + path.points.length) % path.points.length]
      const curr = path.points[i]
      const next = path.points[(i + 1) % path.points.length]
      
      const angle = calculateAngle(prev.anchor, curr.anchor, next.anchor)
      if (angle < 30) return true
    }
  }
  return false
}

function calculateAngle(p1: Point, p2: Point, p3: Point): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y }
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }
  
  const dot = v1.x * v2.x + v1.y * v2.y
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)
  
  if (mag1 === 0 || mag2 === 0) return 180
  
  const cos = dot / (mag1 * mag2)
  return Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI)
}

function checkHighDetail(paths: BezierPath[]): boolean {
  let totalPoints = 0
  for (const path of paths) {
    totalPoints += path.points.length
  }
  // More than 100 points is considered high detail
  return totalPoints > 100
}

// ============================================
// COLOR REGION EXTRACTION
// ============================================

/**
 * Extract color regions from a graphic object
 */
export function extractColorRegions(
  obj: GraphicObject,
  colors: Map<string, ColorDefinition>
): ColorRegion[] {
  const regions: ColorRegion[] = []
  
  // Extract fill region
  if (obj.fill && obj.fill.opacity > 0) {
    const fillRegion = createColorRegion(obj, obj.fill, 'fill', colors)
    if (fillRegion) regions.push(fillRegion)
  }
  
  // Extract stroke region (if significant width)
  if (obj.stroke && obj.stroke.width >= 0.1 && obj.stroke.color.opacity > 0) {
    const strokeRegion = createColorRegion(obj, obj.stroke.color, 'stroke', colors)
    if (strokeRegion) regions.push(strokeRegion)
  }
  
  return regions
}

function createColorRegion(
  obj: GraphicObject,
  color: ColorDefinition,
  source: 'fill' | 'stroke',
  colors: Map<string, ColorDefinition>
): ColorRegion | null {
  // Ensure color is in the map
  if (!colors.has(color.id)) {
    colors.set(color.id, color)
  }
  
  // Get or create contour path
  const contour = obj.paths[0] // Simplified - would need proper contour extraction
  if (!contour) return null
  
  return {
    id: `${obj.id}_${source}`,
    objectId: obj.id,
    colorId: color.id,
    color,
    contour,
    area: calculatePathArea(contour),
    adjacentRegions: [] // Will be filled by adjacency analysis
  }
}

function calculatePathArea(path: BezierPath): number {
  // Shoelace formula for polygon area
  let area = 0
  const n = path.points.length
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += path.points[i].anchor.x * path.points[j].anchor.y
    area -= path.points[j].anchor.x * path.points[i].anchor.y
  }
  
  return Math.abs(area) / 2
}

// ============================================
// ADJACENCY DETECTION
// ============================================

/**
 * Detect if two regions are adjacent
 */
export function detectAdjacency(
  regionA: ColorRegion,
  regionB: ColorRegion,
  tolerance: number = 0.1 // mm
): AdjacentRegion | null {
  // Skip if same color
  if (regionA.colorId === regionB.colorId) return null
  
  // Quick bounding box check
  if (!boundingBoxesOverlap(regionA.contour, regionB.contour, tolerance)) {
    return null
  }
  
  // Find shared edge
  const sharedEdge = findSharedEdge(regionA.contour, regionB.contour, tolerance)
  if (!sharedEdge || sharedEdge.points.length < 2) return null
  
  // Determine contact type
  const contactType = determineContactType(regionA, regionB)
  
  // Check if trap is required
  const trapRequired = shouldTrap(regionA, regionB, contactType)
  
  return {
    regionId: regionB.id,
    colorId: regionB.colorId,
    sharedEdge,
    edgeLength: calculatePathLength(sharedEdge),
    contactType,
    trapRequired
  }
}

function boundingBoxesOverlap(
  pathA: BezierPath,
  pathB: BezierPath,
  tolerance: number
): boolean {
  const boundsA = getPathBounds(pathA)
  const boundsB = getPathBounds(pathB)
  
  return !(
    boundsA.x + boundsA.width + tolerance < boundsB.x ||
    boundsB.x + boundsB.width + tolerance < boundsA.x ||
    boundsA.y + boundsA.height + tolerance < boundsB.y ||
    boundsB.y + boundsB.height + tolerance < boundsA.y
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

function findSharedEdge(
  pathA: BezierPath,
  pathB: BezierPath,
  tolerance: number
): BezierPath | null {
  // Simplified edge detection - find points that are close
  const sharedPoints: { anchor: Point }[] = []
  
  for (const pointA of pathA.points) {
    for (const pointB of pathB.points) {
      const dist = distance(pointA.anchor, pointB.anchor)
      if (dist <= tolerance) {
        sharedPoints.push({ anchor: pointA.anchor })
        break
      }
    }
  }
  
  if (sharedPoints.length < 2) return null
  
  return {
    id: `shared_${pathA.id}_${pathB.id}`,
    points: sharedPoints,
    closed: false
  }
}

function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
}

function calculatePathLength(path: BezierPath): number {
  let length = 0
  for (let i = 0; i < path.points.length - 1; i++) {
    length += distance(path.points[i].anchor, path.points[i + 1].anchor)
  }
  return length
}

function determineContactType(regionA: ColorRegion, regionB: ColorRegion): ContactType {
  // Check overprint status from parent objects
  // This would need access to the original objects
  
  // For now, assume edge-to-edge contact
  return 'EDGE_TO_EDGE'
}

function shouldTrap(regionA: ColorRegion, regionB: ColorRegion, contactType: ContactType): boolean {
  // Don't trap if overprinting
  if (contactType === 'OVERPRINT') return false
  
  // Don't trap transparent colors
  if (regionA.color.type === 'TRANSPARENT' || regionB.color.type === 'TRANSPARENT') return false
  
  // Don't trap varnish
  if (regionA.color.type === 'VARNISH' || regionB.color.type === 'VARNISH') return false
  
  // Always trap white underprint
  if (regionA.color.type === 'WHITE_UNDERPRINT' || regionB.color.type === 'WHITE_UNDERPRINT') return true
  
  // Trap if colors are different enough
  const colorDiff = calculateColorDifference(regionA.color, regionB.color)
  return colorDiff > 10 // Delta E threshold
}

function calculateColorDifference(colorA: ColorDefinition, colorB: ColorDefinition): number {
  // CIE Delta E 2000 (simplified)
  if (!colorA.lab || !colorB.lab) return 100
  
  const dL = colorA.lab.l - colorB.lab.l
  const da = colorA.lab.a - colorB.lab.a
  const db = colorA.lab.b - colorB.lab.b
  
  // Simplified Delta E (CIE76)
  return Math.sqrt(dL * dL + da * da + db * db)
}

// ============================================
// COLOR ADJACENCY MAP BUILDER
// ============================================

/**
 * Build complete color adjacency map for a document
 */
export function buildColorAdjacencyMap(
  document: TrappingDocument
): ColorAdjacencyMap {
  const regions = new Map<string, ColorRegion>()
  const adjacencyMatrix = new Map<string, Map<string, AdjacentRegion>>()
  const colorToRegions = new Map<string, string[]>()
  const objectToRegions = new Map<string, string[]>()
  
  // Extract all color regions from objects
  for (const [objId, obj] of document.objects) {
    const objRegions = extractColorRegions(obj, document.colors)
    
    for (const region of objRegions) {
      regions.set(region.id, region)
      
      // Update color -> regions map
      const colorRegions = colorToRegions.get(region.colorId) || []
      colorRegions.push(region.id)
      colorToRegions.set(region.colorId, colorRegions)
      
      // Update object -> regions map
      const objRegionIds = objectToRegions.get(objId) || []
      objRegionIds.push(region.id)
      objectToRegions.set(objId, objRegionIds)
    }
  }
  
  // Build adjacency matrix
  const regionIds = Array.from(regions.keys())
  
  for (let i = 0; i < regionIds.length; i++) {
    const regionA = regions.get(regionIds[i])!
    const adjacencies = new Map<string, AdjacentRegion>()
    
    for (let j = 0; j < regionIds.length; j++) {
      if (i === j) continue
      
      const regionB = regions.get(regionIds[j])!
      const adjacency = detectAdjacency(regionA, regionB)
      
      if (adjacency) {
        adjacencies.set(regionIds[j], adjacency)
        regionA.adjacentRegions.push(adjacency)
      }
    }
    
    adjacencyMatrix.set(regionIds[i], adjacencies)
  }
  
  return {
    documentId: document.id,
    regions,
    adjacencyMatrix,
    colorToRegions,
    objectToRegions
  }
}

/**
 * Get all regions adjacent to a specific color
 */
export function getAdjacentToColor(
  map: ColorAdjacencyMap,
  colorId: string
): AdjacentRegion[] {
  const results: AdjacentRegion[] = []
  const regionIds = map.colorToRegions.get(colorId) || []
  
  for (const regionId of regionIds) {
    const adjacencies = map.adjacencyMatrix.get(regionId)
    if (adjacencies) {
      for (const adj of adjacencies.values()) {
        results.push(adj)
      }
    }
  }
  
  return results
}

/**
 * Get all trap-required adjacencies in the document
 */
export function getTrapRequiredAdjacencies(
  map: ColorAdjacencyMap
): { regionA: ColorRegion; regionB: ColorRegion; adjacency: AdjacentRegion }[] {
  const results: { regionA: ColorRegion; regionB: ColorRegion; adjacency: AdjacentRegion }[] = []
  const processed = new Set<string>()
  
  for (const [regionAId, adjacencies] of map.adjacencyMatrix) {
    for (const [regionBId, adjacency] of adjacencies) {
      if (!adjacency.trapRequired) continue
      
      // Avoid duplicates (A->B and B->A)
      const key = [regionAId, regionBId].sort().join('_')
      if (processed.has(key)) continue
      processed.add(key)
      
      const regionA = map.regions.get(regionAId)!
      const regionB = map.regions.get(regionBId)!
      
      results.push({ regionA, regionB, adjacency })
    }
  }
  
  return results
}
