/**
 * GPCS CodeStudio - Auto-Trapping Engine
 * Trapping Rules Engine (TODO 2)
 * 
 * Implements professional trapping decision logic:
 * - Sliding trap (dark spreads into light)
 * - Centerline trap (equal optical weight)
 * - Chroma-based priority
 * - Special cases (metallic, white, fluorescent)
 */

import type {
  ColorDefinition,
  ColorType,
  ColorRegion,
  AdjacentRegion,
  TrapDirection,
  TrapStyle,
  TrapRule,
  TrapDecision,
  TrapWarning,
  TrapWarningType,
  TrapSettings,
  RiskFactors,
  PrintingTechnology,
} from '../types/trappingTypes'

// ============================================
// COLOR PRIORITY CALCULATION
// ============================================

/**
 * Calculate trap priority for a color
 * Higher priority = color should spread (be the trap color)
 * Based on neutral density method (industry standard)
 */
export function calculateColorPriority(
  color: ColorDefinition,
  method: 'NEUTRAL_DENSITY' | 'LUMINANCE' | 'CHROMA' | 'CUSTOM' = 'NEUTRAL_DENSITY'
): number {
  switch (method) {
    case 'NEUTRAL_DENSITY':
      return color.neutralDensity
    
    case 'LUMINANCE':
      // Invert luminance (darker = higher priority)
      return (100 - color.luminance) / 100
    
    case 'CHROMA':
      // Higher chroma = higher priority
      return color.chroma / 128
    
    case 'CUSTOM':
      // Weighted combination
      const nd = color.neutralDensity * 0.5
      const lum = ((100 - color.luminance) / 100) * 0.3
      const chr = (color.chroma / 128) * 0.2
      return nd + lum + chr
    
    default:
      return color.neutralDensity
  }
}

/**
 * Get special color priority adjustments
 */
function getSpecialColorPriority(colorType: ColorType): number {
  switch (colorType) {
    case 'WHITE_UNDERPRINT':
      return -1 // Always lowest priority (always spreads)
    case 'METALLIC':
      return 0.8 // High priority (usually chokes)
    case 'FLUORESCENT':
      return 0.3 // Medium-low priority
    case 'VARNISH':
      return -2 // Never traps
    case 'TRANSPARENT':
      return -2 // Never traps
    default:
      return 0 // No adjustment
  }
}

// ============================================
// TRAP DIRECTION RESOLUTION
// ============================================

/**
 * Resolve trap direction between two colors
 */
export function resolveTrapDirection(
  colorA: ColorDefinition,
  colorB: ColorDefinition,
  settings: TrapSettings
): TrapDirection {
  // Check for special cases first
  const specialDirection = resolveSpecialCaseDirection(colorA, colorB)
  if (specialDirection !== null) {
    return specialDirection
  }
  
  // Calculate priorities
  const priorityA = calculateColorPriority(colorA, settings.trapDirectionMethod) 
    + getSpecialColorPriority(colorA.type)
  const priorityB = calculateColorPriority(colorB, settings.trapDirectionMethod)
    + getSpecialColorPriority(colorB.type)
  
  // Determine direction based on priority difference
  const diff = Math.abs(priorityA - priorityB)
  
  // If very similar, use centerline
  if (diff < 0.1) {
    return 'CENTERLINE'
  }
  
  // Higher priority color chokes (darker chokes lighter)
  if (priorityA > priorityB) {
    return 'CHOKE' // A chokes B (B spreads into A)
  } else {
    return 'SPREAD' // A spreads into B (A is lighter)
  }
}

/**
 * Resolve special case trap directions
 */
function resolveSpecialCaseDirection(
  colorA: ColorDefinition,
  colorB: ColorDefinition
): TrapDirection | null {
  // White underprint always spreads
  if (colorA.type === 'WHITE_UNDERPRINT') {
    return 'SPREAD'
  }
  if (colorB.type === 'WHITE_UNDERPRINT') {
    return 'CHOKE'
  }
  
  // Varnish/transparent - no trap
  if (colorA.type === 'VARNISH' || colorA.type === 'TRANSPARENT' ||
      colorB.type === 'VARNISH' || colorB.type === 'TRANSPARENT') {
    return 'NONE'
  }
  
  // Black always chokes (rich black or 100K)
  if (isBlackColor(colorA)) {
    return 'CHOKE'
  }
  if (isBlackColor(colorB)) {
    return 'SPREAD'
  }
  
  // Metallic colors - special handling
  if (colorA.type === 'METALLIC' && colorB.type !== 'METALLIC') {
    return 'CHOKE' // Metallic chokes CMYK
  }
  if (colorB.type === 'METALLIC' && colorA.type !== 'METALLIC') {
    return 'SPREAD' // CMYK spreads into metallic
  }
  
  return null // Use standard priority calculation
}

function isBlackColor(color: ColorDefinition): boolean {
  if (!color.cmyk) return false
  
  // Rich black or 100% K
  const isRichBlack = color.cmyk.c >= 40 && color.cmyk.m >= 30 && 
                      color.cmyk.y >= 30 && color.cmyk.k >= 90
  const isPureBlack = color.cmyk.k >= 95 && 
                      color.cmyk.c < 10 && color.cmyk.m < 10 && color.cmyk.y < 10
  
  return isRichBlack || isPureBlack
}

// ============================================
// TRAP WIDTH RESOLUTION
// ============================================

export interface GeometryInfo {
  edgeLength: number
  isSmallObject: boolean
  hasSharpAngles: boolean
  isThinLine: boolean
  isText: boolean
  textSizePt?: number
  strokeWidthMm?: number
}

/**
 * Resolve trap width based on colors and geometry
 */
export function resolveTrapWidth(
  colorA: ColorDefinition,
  colorB: ColorDefinition,
  geometry: GeometryInfo,
  settings: TrapSettings
): number {
  let width = settings.defaultWidthMm
  
  // Special color widths
  if (colorA.type === 'WHITE_UNDERPRINT' || colorB.type === 'WHITE_UNDERPRINT') {
    width = settings.whiteSpreadMm
  } else if (colorA.type === 'METALLIC' || colorB.type === 'METALLIC') {
    width = settings.metallicTrapWidthMm
  } else if (isBlackColor(colorA) || isBlackColor(colorB)) {
    width = settings.blackTrapWidthMm
  }
  
  // Technology-based adjustments
  width = adjustForTechnology(width, settings.technology)
  
  // Geometry-based adjustments
  width = adjustForGeometry(width, geometry, settings)
  
  // Clamp to min/max
  return Math.max(settings.minWidthMm, Math.min(settings.maxWidthMm, width))
}

function adjustForTechnology(width: number, technology: PrintingTechnology): number {
  switch (technology) {
    case 'FLEXO':
      return width * 1.2 // Flexo needs wider traps
    case 'OFFSET':
      return width * 1.0 // Standard
    case 'DIGITAL':
      return width * 0.8 // Digital is more precise
    case 'GRAVURE':
      return width * 1.1
    case 'SCREEN':
      return width * 1.5 // Screen printing needs wider traps
    default:
      return width
  }
}

function adjustForGeometry(
  width: number,
  geometry: GeometryInfo,
  settings: TrapSettings
): number {
  let adjusted = width
  
  // Reduce for small text
  if (geometry.isText && geometry.textSizePt !== undefined) {
    if (geometry.textSizePt < settings.minTextSizePt) {
      // Very small text - minimal or no trap
      adjusted *= 0.3
    } else if (geometry.textSizePt < 10) {
      // Small text - reduced trap
      adjusted *= settings.textTrapReduction
    }
  }
  
  // Reduce for thin lines
  if (geometry.isThinLine && geometry.strokeWidthMm !== undefined) {
    if (geometry.strokeWidthMm < settings.minLineWidthMm) {
      adjusted *= 0.5
    }
  }
  
  // Reduce for small objects
  if (geometry.isSmallObject) {
    adjusted *= 0.7
  }
  
  // Reduce for sharp angles (to prevent artifacts)
  if (geometry.hasSharpAngles) {
    adjusted *= 0.8
  }
  
  return adjusted
}

// ============================================
// TRAP STYLE RESOLUTION
// ============================================

/**
 * Resolve trap style based on colors and context
 */
export function resolveTrapStyle(
  colorA: ColorDefinition,
  colorB: ColorDefinition,
  direction: TrapDirection,
  geometry: GeometryInfo
): TrapStyle {
  // Centerline for equal priority
  if (direction === 'CENTERLINE') {
    return 'ABUTTED'
  }
  
  // Feathered for images/gradients
  if (colorA.type === 'PROCESS_CMYK' && colorB.type === 'PROCESS_CMYK') {
    // Check if either color is part of a gradient (would need more context)
    // For now, use normal
  }
  
  // Sliding trap for significant color difference
  const priorityDiff = Math.abs(
    calculateColorPriority(colorA, 'NEUTRAL_DENSITY') -
    calculateColorPriority(colorB, 'NEUTRAL_DENSITY')
  )
  
  if (priorityDiff > 0.5) {
    return 'SLIDING'
  }
  
  // Keepaway for very dark colors
  if (isBlackColor(colorA) || isBlackColor(colorB)) {
    return 'KEEPAWAY'
  }
  
  return 'NORMAL'
}

// ============================================
// SPECIAL CASE HANDLING
// ============================================

export interface SpecialCaseResult {
  handled: boolean
  direction?: TrapDirection
  width?: number
  style?: TrapStyle
  warnings: TrapWarning[]
}

/**
 * Handle special trapping cases
 */
export function resolveSpecialCase(
  colorA: ColorDefinition,
  colorB: ColorDefinition,
  geometry: GeometryInfo,
  settings: TrapSettings
): SpecialCaseResult {
  const warnings: TrapWarning[] = []
  
  // Case 1: Metallic vs CMYK
  if ((colorA.type === 'METALLIC' && colorB.type === 'PROCESS_CMYK') ||
      (colorB.type === 'METALLIC' && colorA.type === 'PROCESS_CMYK')) {
    warnings.push({
      type: 'METALLIC_ADJACENT',
      severity: 'INFO',
      message: 'Metallic color adjacent to CMYK - using special trap handling'
    })
    
    return {
      handled: true,
      direction: colorA.type === 'METALLIC' ? 'CHOKE' : 'SPREAD',
      width: settings.metallicTrapWidthMm,
      style: 'NORMAL',
      warnings
    }
  }
  
  // Case 2: White underprint spread
  if (colorA.type === 'WHITE_UNDERPRINT' || colorB.type === 'WHITE_UNDERPRINT') {
    const isWhiteA = colorA.type === 'WHITE_UNDERPRINT'
    
    if (settings.whiteSpreadMm < 0.2) {
      warnings.push({
        type: 'WHITE_UNDERPRINT_ISSUE',
        severity: 'WARNING',
        message: 'White underprint spread may be too small for reliable coverage'
      })
    }
    
    return {
      handled: true,
      direction: isWhiteA ? 'SPREAD' : 'CHOKE',
      width: settings.whiteSpreadMm,
      style: 'NORMAL',
      warnings
    }
  }
  
  // Case 3: Fluorescent colors
  if (colorA.type === 'FLUORESCENT' || colorB.type === 'FLUORESCENT') {
    warnings.push({
      type: 'COLOR_MISMATCH',
      severity: 'INFO',
      message: 'Fluorescent color detected - verify trap appearance on proof'
    })
    
    return {
      handled: true,
      direction: resolveTrapDirection(colorA, colorB, settings),
      width: settings.defaultWidthMm * 1.2, // Slightly wider for fluorescent
      style: 'NORMAL',
      warnings
    }
  }
  
  // Case 4: Small text
  if (geometry.isText && geometry.textSizePt !== undefined && 
      geometry.textSizePt < settings.minTextSizePt) {
    warnings.push({
      type: 'SMALL_TEXT',
      severity: 'WARNING',
      message: `Text size ${geometry.textSizePt}pt is below minimum ${settings.minTextSizePt}pt - trap reduced`
    })
    
    return {
      handled: true,
      direction: 'NONE', // No trap for very small text
      warnings
    }
  }
  
  // Case 5: Thin lines
  if (geometry.isThinLine && geometry.strokeWidthMm !== undefined &&
      geometry.strokeWidthMm < settings.minLineWidthMm) {
    warnings.push({
      type: 'THIN_LINE',
      severity: 'WARNING',
      message: `Line width ${geometry.strokeWidthMm}mm is below minimum - trap may cause issues`
    })
    
    if (!settings.trapThinLines) {
      return {
        handled: true,
        direction: 'NONE',
        warnings
      }
    }
  }
  
  return { handled: false, warnings }
}

// ============================================
// TRAP DECISION GENERATOR
// ============================================

/**
 * Generate complete trap decision for two adjacent regions
 */
export function generateTrapDecision(
  regionA: ColorRegion,
  regionB: ColorRegion,
  adjacency: AdjacentRegion,
  riskFactorsA: RiskFactors,
  riskFactorsB: RiskFactors,
  settings: TrapSettings
): TrapDecision {
  const warnings: TrapWarning[] = []
  
  // Build geometry info
  const geometry: GeometryInfo = {
    edgeLength: adjacency.edgeLength,
    isSmallObject: regionA.area < 10 || regionB.area < 10, // < 10mm²
    hasSharpAngles: riskFactorsA.hasSharpAngles || riskFactorsB.hasSharpAngles,
    isThinLine: riskFactorsA.isThinLine || riskFactorsB.isThinLine,
    isText: riskFactorsA.isSmallText || riskFactorsB.isSmallText
  }
  
  // Check special cases first
  const specialCase = resolveSpecialCase(
    regionA.color,
    regionB.color,
    geometry,
    settings
  )
  
  warnings.push(...specialCase.warnings)
  
  if (specialCase.handled && specialCase.direction === 'NONE') {
    return {
      regionAId: regionA.id,
      regionBId: regionB.id,
      direction: 'NONE',
      widthMm: 0,
      style: 'NORMAL',
      appliedRule: createDefaultRule(),
      colorPriorityA: calculateColorPriority(regionA.color, settings.trapDirectionMethod),
      colorPriorityB: calculateColorPriority(regionB.color, settings.trapDirectionMethod),
      warnings
    }
  }
  
  // Resolve direction
  const direction = specialCase.direction || 
    resolveTrapDirection(regionA.color, regionB.color, settings)
  
  // Resolve width
  const width = specialCase.width ||
    resolveTrapWidth(regionA.color, regionB.color, geometry, settings)
  
  // Resolve style
  const style = specialCase.style ||
    resolveTrapStyle(regionA.color, regionB.color, direction, geometry)
  
  // Add risk warnings
  if (riskFactorsA.warnings.length > 0 || riskFactorsB.warnings.length > 0) {
    for (const w of [...riskFactorsA.warnings, ...riskFactorsB.warnings]) {
      warnings.push({
        type: 'COMPLEX_GEOMETRY',
        severity: 'INFO',
        message: w
      })
    }
  }
  
  // Check for overprint conflicts
  if (adjacency.contactType === 'OVERPRINT' && direction !== 'NONE') {
    warnings.push({
      type: 'OVERPRINT_CONFLICT',
      severity: 'WARNING',
      message: 'Overprint detected but trap was requested - verify intent'
    })
  }
  
  return {
    regionAId: regionA.id,
    regionBId: regionB.id,
    direction,
    widthMm: width,
    style,
    appliedRule: createDefaultRule(),
    colorPriorityA: calculateColorPriority(regionA.color, settings.trapDirectionMethod),
    colorPriorityB: calculateColorPriority(regionB.color, settings.trapDirectionMethod),
    warnings
  }
}

function createDefaultRule(): TrapRule {
  return {
    id: 'default',
    name: 'Default Trap Rule',
    priority: 0,
    sourceColorTypes: ['PROCESS_CMYK', 'SPOT_COLOR'],
    targetColorTypes: ['PROCESS_CMYK', 'SPOT_COLOR'],
    direction: 'SPREAD',
    widthMm: 0.15,
    style: 'NORMAL',
    applyToText: true,
    minTextSizePt: 6,
    applyToThinLines: false,
    minLineWidthMm: 0.25
  }
}

// ============================================
// RULE ENGINE CLASS
// ============================================

export class TrapRuleEngine {
  private settings: TrapSettings
  private customRules: TrapRule[]
  
  constructor(settings: TrapSettings) {
    this.settings = settings
    this.customRules = settings.customRules || []
  }
  
  /**
   * Update settings
   */
  updateSettings(settings: Partial<TrapSettings>): void {
    this.settings = { ...this.settings, ...settings }
    if (settings.customRules) {
      this.customRules = settings.customRules
    }
  }
  
  /**
   * Add custom rule
   */
  addRule(rule: TrapRule): void {
    this.customRules.push(rule)
    this.customRules.sort((a, b) => b.priority - a.priority)
  }
  
  /**
   * Remove custom rule
   */
  removeRule(ruleId: string): void {
    this.customRules = this.customRules.filter(r => r.id !== ruleId)
  }
  
  /**
   * Find matching custom rule for two colors
   */
  findMatchingRule(colorA: ColorDefinition, colorB: ColorDefinition): TrapRule | null {
    for (const rule of this.customRules) {
      if (this.ruleMatches(rule, colorA, colorB)) {
        return rule
      }
    }
    return null
  }
  
  private ruleMatches(rule: TrapRule, colorA: ColorDefinition, colorB: ColorDefinition): boolean {
    const aMatches = rule.sourceColorTypes.includes(colorA.type)
    const bMatches = rule.targetColorTypes.includes(colorB.type)
    return aMatches && bMatches
  }
  
  /**
   * Generate trap decision using rules
   */
  decide(
    regionA: ColorRegion,
    regionB: ColorRegion,
    adjacency: AdjacentRegion,
    riskFactorsA: RiskFactors,
    riskFactorsB: RiskFactors
  ): TrapDecision {
    // Check for custom rule first
    const customRule = this.findMatchingRule(regionA.color, regionB.color)
    
    if (customRule) {
      return this.applyCustomRule(customRule, regionA, regionB, adjacency)
    }
    
    // Use default decision logic
    return generateTrapDecision(
      regionA,
      regionB,
      adjacency,
      riskFactorsA,
      riskFactorsB,
      this.settings
    )
  }
  
  private applyCustomRule(
    rule: TrapRule,
    regionA: ColorRegion,
    regionB: ColorRegion,
    adjacency: AdjacentRegion
  ): TrapDecision {
    return {
      regionAId: regionA.id,
      regionBId: regionB.id,
      direction: rule.direction,
      widthMm: rule.widthMm,
      style: rule.style,
      appliedRule: rule,
      colorPriorityA: calculateColorPriority(regionA.color, this.settings.trapDirectionMethod),
      colorPriorityB: calculateColorPriority(regionB.color, this.settings.trapDirectionMethod),
      warnings: []
    }
  }
  
  /**
   * Get current settings
   */
  getSettings(): TrapSettings {
    return { ...this.settings }
  }
}
