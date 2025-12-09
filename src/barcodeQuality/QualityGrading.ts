/**
 * GPCS CodeStudio - Quality Grading System
 * 
 * ISO/IEC 15416 and 15415 compliant grading calculations
 */

import type {
  QualityGrade,
  NumericGrade,
  ParameterResult,
  ISO15416Parameters,
  ISO15415Parameters,
} from './types'

import {
  GRADE_MAP,
  NUMERIC_TO_GRADE,
  ISO15416_THRESHOLDS,
  ISO15415_THRESHOLDS,
} from './types'

// ============================================
// GRADE CALCULATION
// ============================================

/**
 * Calculate grade from numeric value and thresholds
 */
export function calculateGrade(
  value: number,
  thresholds: { A: number; B: number; C: number; D: number; F: number },
  higherIsBetter: boolean = true
): QualityGrade {
  if (higherIsBetter) {
    if (value >= thresholds.A) return 'A'
    if (value >= thresholds.B) return 'B'
    if (value >= thresholds.C) return 'C'
    if (value >= thresholds.D) return 'D'
    return 'F'
  } else {
    // Lower is better (e.g., defects)
    if (value <= thresholds.A) return 'A'
    if (value <= thresholds.B) return 'B'
    if (value <= thresholds.C) return 'C'
    if (value <= thresholds.D) return 'D'
    return 'F'
  }
}

/**
 * Convert letter grade to numeric
 */
export function gradeToNumeric(grade: QualityGrade): NumericGrade {
  return GRADE_MAP[grade]
}

/**
 * Convert numeric grade to letter
 */
export function numericToGrade(numeric: number): QualityGrade {
  if (numeric >= 3.5) return 'A'
  if (numeric >= 2.5) return 'B'
  if (numeric >= 1.5) return 'C'
  if (numeric >= 0.5) return 'D'
  return 'F'
}

/**
 * Calculate overall grade from parameter grades
 * Overall grade is the LOWEST individual grade (ISO standard)
 */
export function calculateOverallGrade(grades: QualityGrade[]): QualityGrade {
  if (grades.length === 0) return 'F'
  
  let lowestNumeric = 4.0
  
  for (const grade of grades) {
    const numeric = gradeToNumeric(grade)
    if (numeric < lowestNumeric) {
      lowestNumeric = numeric
    }
  }
  
  return numericToGrade(lowestNumeric)
}

/**
 * Calculate average numeric grade
 */
export function calculateAverageGrade(grades: QualityGrade[]): number {
  if (grades.length === 0) return 0
  
  let sum = 0
  for (const grade of grades) {
    sum += gradeToNumeric(grade)
  }
  
  return sum / grades.length
}

// ============================================
// ISO 15416 GRADING (LINEAR BARCODES)
// ============================================

/**
 * Grade ISO 15416 parameters
 */
export function gradeISO15416Parameters(params: ISO15416Parameters): ParameterResult[] {
  const results: ParameterResult[] = []
  
  // Decode (pass/fail)
  results.push({
    name: 'Decode',
    value: params.decode ? 1 : 0,
    grade: params.decode ? 'A' : 'F',
    threshold: 1,
    description: 'Barcode successfully decoded'
  })
  
  // Symbol Contrast
  results.push({
    name: 'Symbol Contrast',
    value: params.symbolContrast,
    grade: calculateGrade(params.symbolContrast, ISO15416_THRESHOLDS.symbolContrast, true),
    threshold: ISO15416_THRESHOLDS.symbolContrast.C,
    unit: '%',
    description: 'Difference between Rmax and Rmin'
  })
  
  // Edge Contrast
  results.push({
    name: 'Edge Contrast',
    value: params.edgeContrast,
    grade: calculateGrade(params.edgeContrast, ISO15416_THRESHOLDS.edgeContrast, true),
    threshold: ISO15416_THRESHOLDS.edgeContrast.C,
    unit: '%',
    description: 'Minimum edge transition contrast'
  })
  
  // Modulation
  results.push({
    name: 'Modulation',
    value: params.modulation,
    grade: calculateGrade(params.modulation, ISO15416_THRESHOLDS.modulation, true),
    threshold: ISO15416_THRESHOLDS.modulation.C,
    description: 'ECmin / Symbol Contrast ratio'
  })
  
  // Defects
  results.push({
    name: 'Defects',
    value: params.defects,
    grade: calculateGrade(params.defects, ISO15416_THRESHOLDS.defects, false),
    threshold: ISO15416_THRESHOLDS.defects.C,
    description: 'Maximum element reflectance non-uniformity'
  })
  
  // Decodability
  results.push({
    name: 'Decodability',
    value: params.decodability,
    grade: calculateGrade(params.decodability, ISO15416_THRESHOLDS.decodability, true),
    threshold: ISO15416_THRESHOLDS.decodability.C,
    description: 'Printing tolerance margin'
  })
  
  // Quiet Zones
  results.push({
    name: 'Quiet Zone',
    value: params.quietZoneCompliant ? 1 : 0,
    grade: params.quietZoneCompliant ? 'A' : 'F',
    threshold: 1,
    description: 'Quiet zone meets minimum requirements'
  })
  
  return results
}

/**
 * Calculate ISO 15416 overall grade
 */
export function calculateISO15416OverallGrade(params: ISO15416Parameters): QualityGrade {
  const results = gradeISO15416Parameters(params)
  const grades = results.map(r => r.grade)
  return calculateOverallGrade(grades)
}

// ============================================
// ISO 15415 GRADING (2D BARCODES)
// ============================================

/**
 * Grade ISO 15415 parameters
 */
export function gradeISO15415Parameters(params: ISO15415Parameters): ParameterResult[] {
  const results: ParameterResult[] = []
  
  // Decode (pass/fail)
  results.push({
    name: 'Decode',
    value: params.decode ? 1 : 0,
    grade: params.decode ? 'A' : 'F',
    threshold: 1,
    description: 'Symbol successfully decoded'
  })
  
  // Symbol Contrast
  results.push({
    name: 'Symbol Contrast',
    value: params.symbolContrast,
    grade: calculateGrade(params.symbolContrast, ISO15415_THRESHOLDS.symbolContrast, true),
    threshold: ISO15415_THRESHOLDS.symbolContrast.C,
    unit: '%',
    description: 'Difference between light and dark modules'
  })
  
  // Modulation
  results.push({
    name: 'Modulation',
    value: params.modulation,
    grade: calculateGrade(params.modulation, ISO15415_THRESHOLDS.modulation, true),
    threshold: ISO15415_THRESHOLDS.modulation.C,
    description: 'Module reflectance uniformity'
  })
  
  // Axial Non-uniformity
  results.push({
    name: 'Axial Non-uniformity',
    value: params.axialNonuniformity,
    grade: calculateGrade(params.axialNonuniformity, ISO15415_THRESHOLDS.axialNonuniformity, false),
    threshold: ISO15415_THRESHOLDS.axialNonuniformity.C,
    description: 'X/Y dimension ratio deviation'
  })
  
  // Grid Non-uniformity
  results.push({
    name: 'Grid Non-uniformity',
    value: params.gridNonuniformity,
    grade: calculateGrade(params.gridNonuniformity, ISO15415_THRESHOLDS.gridNonuniformity, false),
    threshold: ISO15415_THRESHOLDS.gridNonuniformity.C,
    description: 'Module position deviation from ideal grid'
  })
  
  // Unused Error Correction
  results.push({
    name: 'Unused Error Correction',
    value: params.unusedErrorCorrection,
    grade: calculateGrade(params.unusedErrorCorrection, ISO15415_THRESHOLDS.unusedErrorCorrection, true),
    threshold: ISO15415_THRESHOLDS.unusedErrorCorrection.C,
    unit: '%',
    description: 'Available error correction capacity'
  })
  
  // Fixed Pattern Damage
  results.push({
    name: 'Fixed Pattern Damage',
    value: params.fixedPatternDamage,
    grade: calculateGrade(params.fixedPatternDamage, ISO15415_THRESHOLDS.fixedPatternDamage, true),
    threshold: ISO15415_THRESHOLDS.fixedPatternDamage.C,
    description: 'Finder/timing pattern integrity'
  })
  
  // Print Growth
  results.push({
    name: 'Print Growth',
    value: params.printGrowth,
    grade: Math.abs(params.printGrowth) <= 0.5 ? 'A' : 
           Math.abs(params.printGrowth) <= 1.0 ? 'B' :
           Math.abs(params.printGrowth) <= 1.5 ? 'C' :
           Math.abs(params.printGrowth) <= 2.0 ? 'D' : 'F',
    threshold: 1.5,
    unit: 'cells',
    description: 'Module size deviation from nominal'
  })
  
  // Quiet Zone
  results.push({
    name: 'Quiet Zone',
    value: params.quietZoneCompliant ? 1 : 0,
    grade: params.quietZoneCompliant ? 'A' : 'F',
    threshold: 1,
    description: 'Quiet zone meets minimum requirements'
  })
  
  return results
}

/**
 * Calculate ISO 15415 overall grade
 */
export function calculateISO15415OverallGrade(params: ISO15415Parameters): QualityGrade {
  const results = gradeISO15415Parameters(params)
  const grades = results.map(r => r.grade)
  return calculateOverallGrade(grades)
}

// ============================================
// GRADE DISPLAY UTILITIES
// ============================================

/**
 * Get grade color for display
 */
export function getGradeColor(grade: QualityGrade): string {
  switch (grade) {
    case 'A': return '#22c55e' // Green
    case 'B': return '#84cc16' // Lime
    case 'C': return '#eab308' // Yellow
    case 'D': return '#f97316' // Orange
    case 'F': return '#ef4444' // Red
    default: return '#6b7280' // Gray
  }
}

/**
 * Get grade description
 */
export function getGradeDescription(grade: QualityGrade): string {
  switch (grade) {
    case 'A': return 'Excellent - Exceeds requirements'
    case 'B': return 'Good - Meets requirements with margin'
    case 'C': return 'Acceptable - Meets minimum requirements'
    case 'D': return 'Poor - Below requirements, may fail'
    case 'F': return 'Fail - Does not meet requirements'
    default: return 'Unknown'
  }
}

/**
 * Get pass/fail status based on minimum grade
 */
export function isPassingGrade(grade: QualityGrade, minimumGrade: QualityGrade): boolean {
  return gradeToNumeric(grade) >= gradeToNumeric(minimumGrade)
}

/**
 * Format grade for display
 */
export function formatGrade(grade: QualityGrade, numeric?: number): string {
  if (numeric !== undefined) {
    return `${grade} (${numeric.toFixed(1)})`
  }
  return grade
}

// ============================================
// RECOMMENDATIONS
// ============================================

/**
 * Generate recommendations based on parameter results
 */
export function generateRecommendations(results: ParameterResult[]): string[] {
  const recommendations: string[] = []
  
  for (const result of results) {
    if (result.grade === 'D' || result.grade === 'F') {
      switch (result.name) {
        case 'Symbol Contrast':
          recommendations.push('Increase contrast between bars and spaces. Check ink density and substrate reflectance.')
          break
        case 'Edge Contrast':
          recommendations.push('Improve edge sharpness. Check print resolution and ink spread.')
          break
        case 'Modulation':
          recommendations.push('Ensure consistent bar/space widths. Check print head alignment and ink flow.')
          break
        case 'Defects':
          recommendations.push('Reduce print defects. Check for voids, spots, and contamination.')
          break
        case 'Decodability':
          recommendations.push('Improve dimensional accuracy. Verify X-dimension and bar width reduction settings.')
          break
        case 'Quiet Zone':
          recommendations.push('Increase quiet zone size. Ensure minimum clear area around barcode.')
          break
        case 'Axial Non-uniformity':
          recommendations.push('Check for distortion in print direction. Verify substrate tension and print speed.')
          break
        case 'Grid Non-uniformity':
          recommendations.push('Improve module positioning accuracy. Check print registration and resolution.')
          break
        case 'Unused Error Correction':
          recommendations.push('Symbol has significant damage. Reduce defects or increase error correction level.')
          break
        case 'Fixed Pattern Damage':
          recommendations.push('Finder/timing patterns are damaged. Check print quality in these areas.')
          break
        case 'Print Growth':
          recommendations.push('Adjust bar width reduction (BWR) to compensate for ink spread.')
          break
      }
    }
  }
  
  // Remove duplicates
  return [...new Set(recommendations)]
}
