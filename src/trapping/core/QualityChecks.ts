/**
 * GPCS CodeStudio - Auto-Trapping Engine
 * Quality Control Checks (TODO 6)
 * 
 * Validates trapping decisions and warns about potential issues:
 * - Small text trapping
 * - Insufficient white underprint spread
 * - Missing traps on high-contrast edges
 * - Overprint conflicts
 */

import type {
  TrappingDocument,
  TrapLayer,
  TrapDecision,
  TrapWarning,
  TrapWarningType,
  ColorRegion,
  ColorAdjacencyMap,
  TrapSettings,
  GraphicObject,
  ColorDefinition,
} from '../types/trappingTypes'

// ============================================
// QC CHECK RESULT TYPES
// ============================================

export interface QCCheckResult {
  passed: boolean
  warnings: TrapWarning[]
  errors: TrapWarning[]
  info: TrapWarning[]
  summary: QCSummary
}

export interface QCSummary {
  totalChecks: number
  passedChecks: number
  failedChecks: number
  warningCount: number
  errorCount: number
  criticalIssues: string[]
}

// ============================================
// MAIN QC ENGINE
// ============================================

/**
 * Run all quality checks on document and trapping
 */
export function runQualityChecks(
  document: TrappingDocument,
  trapLayer: TrapLayer | null,
  adjacencyMap: ColorAdjacencyMap | null,
  settings: TrapSettings
): QCCheckResult {
  const warnings: TrapWarning[] = []
  const errors: TrapWarning[] = []
  const info: TrapWarning[] = []
  
  let totalChecks = 0
  let passedChecks = 0
  const criticalIssues: string[] = []

  // Check 1: Small text trapping
  totalChecks++
  const textCheck = checkSmallTextTrapping(document, trapLayer, settings)
  if (textCheck.passed) passedChecks++
  warnings.push(...textCheck.warnings)
  errors.push(...textCheck.errors)

  // Check 2: White underprint spread
  totalChecks++
  const whiteCheck = checkWhiteUnderprintSpread(document, trapLayer, settings)
  if (whiteCheck.passed) passedChecks++
  warnings.push(...whiteCheck.warnings)
  errors.push(...whiteCheck.errors)
  if (!whiteCheck.passed) {
    criticalIssues.push('White underprint spread may be insufficient')
  }

  // Check 3: High contrast edges without trapping
  totalChecks++
  const contrastCheck = checkHighContrastEdges(document, adjacencyMap, trapLayer)
  if (contrastCheck.passed) passedChecks++
  warnings.push(...contrastCheck.warnings)
  errors.push(...contrastCheck.errors)

  // Check 4: Overprint conflicts
  totalChecks++
  const overprintCheck = checkOverprintConflicts(document, trapLayer)
  if (overprintCheck.passed) passedChecks++
  warnings.push(...overprintCheck.warnings)
  errors.push(...overprintCheck.errors)

  // Check 5: Thin line trapping
  totalChecks++
  const lineCheck = checkThinLineTrapping(document, trapLayer, settings)
  if (lineCheck.passed) passedChecks++
  warnings.push(...lineCheck.warnings)
  info.push(...lineCheck.info)

  // Check 6: Metallic color adjacency
  totalChecks++
  const metallicCheck = checkMetallicAdjacency(document, adjacencyMap, trapLayer)
  if (metallicCheck.passed) passedChecks++
  warnings.push(...metallicCheck.warnings)
  info.push(...metallicCheck.info)

  // Check 7: Trap width consistency
  totalChecks++
  const widthCheck = checkTrapWidthConsistency(trapLayer, settings)
  if (widthCheck.passed) passedChecks++
  warnings.push(...widthCheck.warnings)
  info.push(...widthCheck.info)

  // Check 8: Complex geometry
  totalChecks++
  const geometryCheck = checkComplexGeometry(document, trapLayer)
  if (geometryCheck.passed) passedChecks++
  warnings.push(...geometryCheck.warnings)
  info.push(...geometryCheck.info)

  return {
    passed: errors.length === 0,
    warnings,
    errors,
    info,
    summary: {
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      warningCount: warnings.length,
      errorCount: errors.length,
      criticalIssues
    }
  }
}

// ============================================
// INDIVIDUAL CHECKS
// ============================================

interface CheckResult {
  passed: boolean
  warnings: TrapWarning[]
  errors: TrapWarning[]
  info: TrapWarning[]
}

function createCheckResult(): CheckResult {
  return { passed: true, warnings: [], errors: [], info: [] }
}

/**
 * Check 1: Small text trapping issues
 */
function checkSmallTextTrapping(
  document: TrappingDocument,
  trapLayer: TrapLayer | null,
  settings: TrapSettings
): CheckResult {
  const result = createCheckResult()
  
  for (const [objId, obj] of document.objects) {
    if (obj.type !== 'TEXT') continue
    
    // Check if text is small
    const textHeight = obj.bounds.height
    const estimatedPt = textHeight / 0.352778 // mm to pt
    
    if (estimatedPt < settings.minTextSizePt) {
      // Check if this text has trapping
      const hasTrap = trapLayer?.traps.some(t => 
        t.sourceRegionId.includes(objId) || t.targetRegionId.includes(objId)
      )
      
      if (hasTrap) {
        result.warnings.push({
          type: 'SMALL_TEXT',
          severity: 'WARNING',
          message: `Text object "${obj.name || objId}" is ${estimatedPt.toFixed(1)}pt with trapping applied - may cause readability issues`,
          objectId: objId
        })
      }
    }
    
    if (estimatedPt < 4) {
      result.errors.push({
        type: 'SMALL_TEXT',
        severity: 'ERROR',
        message: `Text object "${obj.name || objId}" is extremely small (${estimatedPt.toFixed(1)}pt) - trapping not recommended`,
        objectId: objId
      })
      result.passed = false
    }
  }
  
  return result
}

/**
 * Check 2: White underprint spread adequacy
 */
function checkWhiteUnderprintSpread(
  document: TrappingDocument,
  trapLayer: TrapLayer | null,
  settings: TrapSettings
): CheckResult {
  const result = createCheckResult()
  
  // Find white underprint objects
  const whiteObjects: string[] = []
  for (const [objId, obj] of document.objects) {
    if (obj.fill?.type === 'WHITE_UNDERPRINT') {
      whiteObjects.push(objId)
    }
  }
  
  if (whiteObjects.length === 0) {
    return result // No white underprint, check passes
  }
  
  // Check spread settings
  if (settings.whiteSpreadMm < 0.15) {
    result.warnings.push({
      type: 'WHITE_UNDERPRINT_ISSUE',
      severity: 'WARNING',
      message: `White underprint spread (${settings.whiteSpreadMm}mm) may be too small for reliable coverage`
    })
  }
  
  if (settings.whiteSpreadMm < 0.1) {
    result.errors.push({
      type: 'WHITE_UNDERPRINT_ISSUE',
      severity: 'ERROR',
      message: `White underprint spread (${settings.whiteSpreadMm}mm) is below minimum recommended (0.1mm)`
    })
    result.passed = false
  }
  
  // Check if white objects have trapping
  if (trapLayer && settings.trapWhiteUnderprint) {
    for (const objId of whiteObjects) {
      const hasTrap = trapLayer.traps.some(t => 
        t.sourceRegionId.includes(objId) || t.targetRegionId.includes(objId)
      )
      
      if (!hasTrap) {
        result.warnings.push({
          type: 'WHITE_UNDERPRINT_ISSUE',
          severity: 'WARNING',
          message: `White underprint object "${objId}" has no trapping applied`,
          objectId: objId
        })
      }
    }
  }
  
  return result
}

/**
 * Check 3: High contrast edges without trapping
 */
function checkHighContrastEdges(
  document: TrappingDocument,
  adjacencyMap: ColorAdjacencyMap | null,
  trapLayer: TrapLayer | null
): CheckResult {
  const result = createCheckResult()
  
  if (!adjacencyMap) return result
  
  // Find high contrast adjacencies
  for (const [regionAId, adjacencies] of adjacencyMap.adjacencyMatrix) {
    const regionA = adjacencyMap.regions.get(regionAId)
    if (!regionA) continue
    
    for (const [regionBId, adjacency] of adjacencies) {
      const regionB = adjacencyMap.regions.get(regionBId)
      if (!regionB) continue
      
      // Calculate contrast
      const contrast = calculateColorContrast(regionA.color, regionB.color)
      
      if (contrast > 0.7) { // High contrast
        // Check if trap exists
        const hasTrap = trapLayer?.traps.some(t => 
          (t.sourceRegionId === regionAId && t.targetRegionId === regionBId) ||
          (t.sourceRegionId === regionBId && t.targetRegionId === regionAId)
        )
        
        if (!hasTrap && adjacency.trapRequired) {
          result.warnings.push({
            type: 'COLOR_MISMATCH',
            severity: 'WARNING',
            message: `High contrast edge between regions without trapping - may show registration errors`,
            regionId: regionAId
          })
        }
      }
    }
  }
  
  return result
}

/**
 * Check 4: Overprint conflicts
 */
function checkOverprintConflicts(
  document: TrappingDocument,
  trapLayer: TrapLayer | null
): CheckResult {
  const result = createCheckResult()
  
  for (const [objId, obj] of document.objects) {
    // Check for overprint on light colors (usually wrong)
    if (obj.overprint && obj.fill) {
      const isLight = obj.fill.luminance > 70
      
      if (isLight) {
        result.warnings.push({
          type: 'OVERPRINT_CONFLICT',
          severity: 'WARNING',
          message: `Light color object "${obj.name || objId}" has overprint enabled - may disappear on dark backgrounds`,
          objectId: objId
        })
      }
    }
    
    // Check for knockout on dark colors over light (may need trap)
    if (obj.knockout && obj.fill) {
      const isDark = obj.fill.luminance < 30
      
      if (isDark) {
        // Check if has trapping
        const hasTrap = trapLayer?.traps.some(t => 
          t.sourceRegionId.includes(objId) || t.targetRegionId.includes(objId)
        )
        
        if (!hasTrap) {
          result.info.push({
            type: 'OVERPRINT_CONFLICT',
            severity: 'INFO',
            message: `Dark knockout object "${obj.name || objId}" may benefit from trapping`,
            objectId: objId
          })
        }
      }
    }
  }
  
  return result
}

/**
 * Check 5: Thin line trapping
 */
function checkThinLineTrapping(
  document: TrappingDocument,
  trapLayer: TrapLayer | null,
  settings: TrapSettings
): CheckResult {
  const result = createCheckResult()
  
  for (const [objId, obj] of document.objects) {
    if (!obj.stroke) continue
    
    const strokeWidth = obj.stroke.width
    
    if (strokeWidth < 0.1) {
      result.warnings.push({
        type: 'THIN_LINE',
        severity: 'WARNING',
        message: `Hairline stroke (${strokeWidth}mm) on "${obj.name || objId}" - trapping may cause issues`,
        objectId: objId
      })
    } else if (strokeWidth < settings.minLineWidthMm) {
      result.info.push({
        type: 'THIN_LINE',
        severity: 'INFO',
        message: `Thin stroke (${strokeWidth}mm) on "${obj.name || objId}" - reduced trapping applied`,
        objectId: objId
      })
    }
  }
  
  return result
}

/**
 * Check 6: Metallic color adjacency
 */
function checkMetallicAdjacency(
  document: TrappingDocument,
  adjacencyMap: ColorAdjacencyMap | null,
  trapLayer: TrapLayer | null
): CheckResult {
  const result = createCheckResult()
  
  if (!adjacencyMap) return result
  
  // Find metallic regions
  const metallicRegions = new Set<string>()
  for (const [regionId, region] of adjacencyMap.regions) {
    if (region.color.type === 'METALLIC') {
      metallicRegions.add(regionId)
    }
  }
  
  if (metallicRegions.size === 0) return result
  
  // Check adjacencies
  for (const regionId of metallicRegions) {
    const adjacencies = adjacencyMap.adjacencyMatrix.get(regionId)
    if (!adjacencies) continue
    
    for (const [adjRegionId, adjacency] of adjacencies) {
      const adjRegion = adjacencyMap.regions.get(adjRegionId)
      if (!adjRegion) continue
      
      // Metallic adjacent to CMYK
      if (adjRegion.color.type === 'PROCESS_CMYK') {
        result.info.push({
          type: 'METALLIC_ADJACENT',
          severity: 'INFO',
          message: `Metallic color adjacent to CMYK - special trap handling applied`,
          regionId: regionId
        })
        
        // Check if trap exists
        const hasTrap = trapLayer?.traps.some(t => 
          (t.sourceRegionId === regionId && t.targetRegionId === adjRegionId) ||
          (t.sourceRegionId === adjRegionId && t.targetRegionId === regionId)
        )
        
        if (!hasTrap && adjacency.trapRequired) {
          result.warnings.push({
            type: 'METALLIC_ADJACENT',
            severity: 'WARNING',
            message: `Metallic/CMYK edge without trapping - may show registration issues`,
            regionId: regionId
          })
        }
      }
    }
  }
  
  return result
}

/**
 * Check 7: Trap width consistency
 */
function checkTrapWidthConsistency(
  trapLayer: TrapLayer | null,
  settings: TrapSettings
): CheckResult {
  const result = createCheckResult()
  
  if (!trapLayer || trapLayer.traps.length === 0) return result
  
  const widths = trapLayer.traps.map(t => t.widthMm)
  const minWidth = Math.min(...widths)
  const maxWidth = Math.max(...widths)
  const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length
  
  // Check for extreme variation
  if (maxWidth > minWidth * 3) {
    result.warnings.push({
      type: 'COMPLEX_GEOMETRY',
      severity: 'WARNING',
      message: `Large trap width variation (${minWidth.toFixed(3)}mm - ${maxWidth.toFixed(3)}mm) - verify consistency`
    })
  }
  
  // Check for traps outside normal range
  const outsideRange = trapLayer.traps.filter(t => 
    t.widthMm < settings.minWidthMm || t.widthMm > settings.maxWidthMm
  )
  
  if (outsideRange.length > 0) {
    result.info.push({
      type: 'COMPLEX_GEOMETRY',
      severity: 'INFO',
      message: `${outsideRange.length} traps adjusted to fit within min/max range`
    })
  }
  
  return result
}

/**
 * Check 8: Complex geometry warnings
 */
function checkComplexGeometry(
  document: TrappingDocument,
  trapLayer: TrapLayer | null
): CheckResult {
  const result = createCheckResult()
  
  for (const [objId, obj] of document.objects) {
    // Check for very complex paths
    let totalPoints = 0
    for (const path of obj.paths) {
      totalPoints += path.points.length
    }
    
    if (totalPoints > 500) {
      result.info.push({
        type: 'COMPLEX_GEOMETRY',
        severity: 'INFO',
        message: `Complex object "${obj.name || objId}" (${totalPoints} points) - trapping may take longer`,
        objectId: objId
      })
    }
    
    // Check for sharp angles
    if (obj.riskFactors.hasSharpAngles) {
      result.info.push({
        type: 'COMPLEX_GEOMETRY',
        severity: 'INFO',
        message: `Object "${obj.name || objId}" has sharp angles - trap corners adjusted`,
        objectId: objId
      })
    }
  }
  
  return result
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateColorContrast(colorA: ColorDefinition, colorB: ColorDefinition): number {
  // Simple luminance-based contrast
  const lumA = colorA.luminance / 100
  const lumB = colorB.luminance / 100
  
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  
  return (lighter - darker)
}

// ============================================
// QC REPORT GENERATION
// ============================================

/**
 * Generate human-readable QC report
 */
export function generateQCReport(result: QCCheckResult): string {
  const lines: string[] = []
  
  lines.push('═══════════════════════════════════════════')
  lines.push('       GPCS CodeStudio - QC Report         ')
  lines.push('═══════════════════════════════════════════')
  lines.push('')
  
  // Summary
  lines.push(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`)
  lines.push(`Checks: ${result.summary.passedChecks}/${result.summary.totalChecks} passed`)
  lines.push(`Errors: ${result.summary.errorCount}`)
  lines.push(`Warnings: ${result.summary.warningCount}`)
  lines.push('')
  
  // Critical issues
  if (result.summary.criticalIssues.length > 0) {
    lines.push('⚠️ CRITICAL ISSUES:')
    for (const issue of result.summary.criticalIssues) {
      lines.push(`  • ${issue}`)
    }
    lines.push('')
  }
  
  // Errors
  if (result.errors.length > 0) {
    lines.push('❌ ERRORS:')
    for (const error of result.errors) {
      lines.push(`  • ${error.message}`)
    }
    lines.push('')
  }
  
  // Warnings
  if (result.warnings.length > 0) {
    lines.push('⚠️ WARNINGS:')
    for (const warning of result.warnings) {
      lines.push(`  • ${warning.message}`)
    }
    lines.push('')
  }
  
  // Info
  if (result.info.length > 0) {
    lines.push('ℹ️ INFO:')
    for (const info of result.info) {
      lines.push(`  • ${info.message}`)
    }
    lines.push('')
  }
  
  lines.push('═══════════════════════════════════════════')
  lines.push(`Generated: ${new Date().toISOString()}`)
  
  return lines.join('\n')
}
