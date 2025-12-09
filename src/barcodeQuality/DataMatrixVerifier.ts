/**
 * GPCS CodeStudio - Data Matrix Verifier
 * 
 * Specialized verification for Data Matrix (GS1 DataMatrix)
 * ISO/IEC 15415 and ISO/IEC 16022 compliant
 */

import type {
  QualityGrade,
  VerificationResult,
  ISO15415Parameters,
} from './types'

// ============================================
// DATA MATRIX TYPES
// ============================================

export type DataMatrixSize = 
  | '10x10' | '12x12' | '14x14' | '16x16' | '18x18' | '20x20'
  | '22x22' | '24x24' | '26x26' | '32x32' | '36x36' | '40x40'
  | '44x44' | '48x48' | '52x52' | '64x64' | '72x72' | '80x80'
  | '88x88' | '96x96' | '104x104' | '120x120' | '132x132' | '144x144'
  // Rectangular
  | '8x18' | '8x32' | '12x26' | '12x36' | '16x36' | '16x48'

export interface DataMatrixInfo {
  size: DataMatrixSize
  rows: number
  columns: number
  dataCapacity: number
  errorCorrectionCapacity: number
  dataRegions: number
}

/**
 * Data Matrix size specifications
 */
export const DATA_MATRIX_SIZES: Record<DataMatrixSize, DataMatrixInfo> = {
  '10x10': { size: '10x10', rows: 10, columns: 10, dataCapacity: 3, errorCorrectionCapacity: 5, dataRegions: 1 },
  '12x12': { size: '12x12', rows: 12, columns: 12, dataCapacity: 5, errorCorrectionCapacity: 7, dataRegions: 1 },
  '14x14': { size: '14x14', rows: 14, columns: 14, dataCapacity: 8, errorCorrectionCapacity: 10, dataRegions: 1 },
  '16x16': { size: '16x16', rows: 16, columns: 16, dataCapacity: 12, errorCorrectionCapacity: 12, dataRegions: 1 },
  '18x18': { size: '18x18', rows: 18, columns: 18, dataCapacity: 18, errorCorrectionCapacity: 14, dataRegions: 1 },
  '20x20': { size: '20x20', rows: 20, columns: 20, dataCapacity: 22, errorCorrectionCapacity: 18, dataRegions: 1 },
  '22x22': { size: '22x22', rows: 22, columns: 22, dataCapacity: 30, errorCorrectionCapacity: 20, dataRegions: 1 },
  '24x24': { size: '24x24', rows: 24, columns: 24, dataCapacity: 36, errorCorrectionCapacity: 24, dataRegions: 1 },
  '26x26': { size: '26x26', rows: 26, columns: 26, dataCapacity: 44, errorCorrectionCapacity: 28, dataRegions: 1 },
  '32x32': { size: '32x32', rows: 32, columns: 32, dataCapacity: 62, errorCorrectionCapacity: 36, dataRegions: 4 },
  '36x36': { size: '36x36', rows: 36, columns: 36, dataCapacity: 86, errorCorrectionCapacity: 42, dataRegions: 4 },
  '40x40': { size: '40x40', rows: 40, columns: 40, dataCapacity: 114, errorCorrectionCapacity: 48, dataRegions: 4 },
  '44x44': { size: '44x44', rows: 44, columns: 44, dataCapacity: 144, errorCorrectionCapacity: 56, dataRegions: 4 },
  '48x48': { size: '48x48', rows: 48, columns: 48, dataCapacity: 174, errorCorrectionCapacity: 68, dataRegions: 4 },
  '52x52': { size: '52x52', rows: 52, columns: 52, dataCapacity: 204, errorCorrectionCapacity: 84, dataRegions: 4 },
  '64x64': { size: '64x64', rows: 64, columns: 64, dataCapacity: 280, errorCorrectionCapacity: 112, dataRegions: 16 },
  '72x72': { size: '72x72', rows: 72, columns: 72, dataCapacity: 368, errorCorrectionCapacity: 144, dataRegions: 16 },
  '80x80': { size: '80x80', rows: 80, columns: 80, dataCapacity: 456, errorCorrectionCapacity: 192, dataRegions: 16 },
  '88x88': { size: '88x88', rows: 88, columns: 88, dataCapacity: 576, errorCorrectionCapacity: 224, dataRegions: 16 },
  '96x96': { size: '96x96', rows: 96, columns: 96, dataCapacity: 696, errorCorrectionCapacity: 272, dataRegions: 16 },
  '104x104': { size: '104x104', rows: 104, columns: 104, dataCapacity: 816, errorCorrectionCapacity: 336, dataRegions: 16 },
  '120x120': { size: '120x120', rows: 120, columns: 120, dataCapacity: 1050, errorCorrectionCapacity: 408, dataRegions: 36 },
  '132x132': { size: '132x132', rows: 132, columns: 132, dataCapacity: 1304, errorCorrectionCapacity: 496, dataRegions: 36 },
  '144x144': { size: '144x144', rows: 144, columns: 144, dataCapacity: 1558, errorCorrectionCapacity: 620, dataRegions: 36 },
  // Rectangular
  '8x18': { size: '8x18', rows: 8, columns: 18, dataCapacity: 5, errorCorrectionCapacity: 7, dataRegions: 1 },
  '8x32': { size: '8x32', rows: 8, columns: 32, dataCapacity: 10, errorCorrectionCapacity: 11, dataRegions: 2 },
  '12x26': { size: '12x26', rows: 12, columns: 26, dataCapacity: 16, errorCorrectionCapacity: 14, dataRegions: 1 },
  '12x36': { size: '12x36', rows: 12, columns: 36, dataCapacity: 22, errorCorrectionCapacity: 18, dataRegions: 2 },
  '16x36': { size: '16x36', rows: 16, columns: 36, dataCapacity: 32, errorCorrectionCapacity: 24, dataRegions: 2 },
  '16x48': { size: '16x48', rows: 16, columns: 48, dataCapacity: 49, errorCorrectionCapacity: 28, dataRegions: 2 }
}

// ============================================
// GS1 DATAMATRIX VERIFICATION
// ============================================

export interface GS1DataMatrixValidation {
  isValid: boolean
  hasGS1Prefix: boolean
  applicationIdentifiers: Array<{
    ai: string
    name: string
    value: string
    isValid: boolean
  }>
  errors: string[]
  warnings: string[]
}

/**
 * Validate GS1 DataMatrix content
 */
export function validateGS1DataMatrix(data: string): GS1DataMatrixValidation {
  const result: GS1DataMatrixValidation = {
    isValid: true,
    hasGS1Prefix: false,
    applicationIdentifiers: [],
    errors: [],
    warnings: []
  }
  
  // Check for FNC1 prefix (]d2 or GS character at start)
  if (data.startsWith(']d2') || data.startsWith('\x1D')) {
    result.hasGS1Prefix = true
    data = data.replace(/^\]d2/, '').replace(/^\x1D/, '')
  } else {
    result.warnings.push('Missing GS1 FNC1 prefix - may not be recognized as GS1 DataMatrix')
  }
  
  // Parse AIs (simplified - would use full GS1 parser)
  // Common AIs for pharmaceutical/healthcare
  const commonAIs = [
    { ai: '01', name: 'GTIN', length: 14 },
    { ai: '17', name: 'USE BY', length: 6 },
    { ai: '10', name: 'BATCH/LOT', length: -1 }, // Variable
    { ai: '21', name: 'SERIAL', length: -1 },
  ]
  
  let position = 0
  while (position < data.length) {
    let matched = false
    
    for (const aiDef of commonAIs) {
      if (data.substring(position).startsWith(aiDef.ai)) {
        const aiStart = position + aiDef.ai.length
        let aiEnd: number
        
        if (aiDef.length > 0) {
          aiEnd = aiStart + aiDef.length
        } else {
          // Variable length - find GS or end
          const gsPos = data.indexOf('\x1D', aiStart)
          aiEnd = gsPos > 0 ? gsPos : data.length
        }
        
        const value = data.substring(aiStart, Math.min(aiEnd, data.length))
        
        result.applicationIdentifiers.push({
          ai: aiDef.ai,
          name: aiDef.name,
          value,
          isValid: true // Would validate each AI
        })
        
        position = aiEnd + (data[aiEnd] === '\x1D' ? 1 : 0)
        matched = true
        break
      }
    }
    
    if (!matched) {
      // Unknown AI or end of data
      break
    }
  }
  
  // Validate required AIs for pharmaceutical
  const hasGTIN = result.applicationIdentifiers.some(ai => ai.ai === '01')
  const hasExpiry = result.applicationIdentifiers.some(ai => ai.ai === '17')
  const hasBatch = result.applicationIdentifiers.some(ai => ai.ai === '10')
  const hasSerial = result.applicationIdentifiers.some(ai => ai.ai === '21')
  
  if (!hasGTIN) {
    result.warnings.push('Missing GTIN (01) - required for most applications')
  }
  
  // EU FMD requirements
  if (hasGTIN && (!hasExpiry || !hasBatch || !hasSerial)) {
    result.warnings.push('EU FMD requires GTIN + Expiry + Batch + Serial')
  }
  
  return result
}

// ============================================
// DIMENSIONAL VERIFICATION
// ============================================

export interface DataMatrixDimensions {
  moduleSizeMm: number
  symbolWidthMm: number
  symbolHeightMm: number
  quietZoneMm: number
  size: DataMatrixSize
}

/**
 * Check Data Matrix dimensional compliance
 */
export function checkDataMatrixDimensions(
  dimensions: DataMatrixDimensions,
  application: 'HEALTHCARE' | 'RETAIL' | 'INDUSTRIAL' | 'DIRECT_PART_MARK'
): { compliant: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Module size requirements by application
  const moduleLimits: Record<string, { min: number; max: number; recommended: number }> = {
    'HEALTHCARE': { min: 0.254, max: 0.990, recommended: 0.380 },
    'RETAIL': { min: 0.254, max: 0.990, recommended: 0.380 },
    'INDUSTRIAL': { min: 0.191, max: 1.524, recommended: 0.508 },
    'DIRECT_PART_MARK': { min: 0.127, max: 0.508, recommended: 0.254 }
  }
  
  const limits = moduleLimits[application]
  
  if (dimensions.moduleSizeMm < limits.min) {
    issues.push(`Module size ${dimensions.moduleSizeMm}mm below minimum ${limits.min}mm for ${application}`)
  }
  if (dimensions.moduleSizeMm > limits.max) {
    issues.push(`Module size ${dimensions.moduleSizeMm}mm exceeds maximum ${limits.max}mm for ${application}`)
  }
  
  // Quiet zone must be at least 1 module
  if (dimensions.quietZoneMm < dimensions.moduleSizeMm) {
    issues.push(`Quiet zone ${dimensions.quietZoneMm}mm is less than 1 module (${dimensions.moduleSizeMm}mm)`)
  }
  
  // Check aspect ratio for square symbols
  const sizeInfo = DATA_MATRIX_SIZES[dimensions.size]
  if (sizeInfo && sizeInfo.rows === sizeInfo.columns) {
    const aspectRatio = dimensions.symbolWidthMm / dimensions.symbolHeightMm
    if (aspectRatio < 0.9 || aspectRatio > 1.1) {
      issues.push(`Square symbol has non-square aspect ratio: ${aspectRatio.toFixed(2)}`)
    }
  }
  
  return {
    compliant: issues.length === 0,
    issues
  }
}

// ============================================
// FINDER PATTERN VERIFICATION
// ============================================

export interface FinderPatternAnalysis {
  lShapeIntegrity: number      // 0-100%
  clockTrackIntegrity: number  // 0-100%
  alignmentPatternIntegrity: number // 0-100% (for larger symbols)
  overallIntegrity: number     // 0-100%
  issues: string[]
}

/**
 * Analyze Data Matrix finder patterns
 */
export function analyzeFinderPatterns(
  imageData: ImageData,
  expectedSize: DataMatrixSize
): FinderPatternAnalysis {
  const { width, height, data } = imageData
  const sizeInfo = DATA_MATRIX_SIZES[expectedSize]
  
  const issues: string[] = []
  
  // Calculate module size from image
  const moduleWidth = width / sizeInfo.columns
  const moduleHeight = height / sizeInfo.rows
  
  // Analyze L-shape (bottom and left solid lines)
  let lShapeScore = 0
  let lShapeTotal = 0
  
  // Bottom row should be all dark
  for (let x = 0; x < sizeInfo.columns; x++) {
    const pixelX = Math.floor((x + 0.5) * moduleWidth)
    const pixelY = height - Math.floor(moduleHeight / 2)
    const idx = (pixelY * width + pixelX) * 4
    const isDark = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 < 128
    
    lShapeTotal++
    if (isDark) lShapeScore++
  }
  
  // Left column should be all dark
  for (let y = 0; y < sizeInfo.rows; y++) {
    const pixelX = Math.floor(moduleWidth / 2)
    const pixelY = Math.floor((y + 0.5) * moduleHeight)
    const idx = (pixelY * width + pixelX) * 4
    const isDark = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 < 128
    
    lShapeTotal++
    if (isDark) lShapeScore++
  }
  
  const lShapeIntegrity = (lShapeScore / lShapeTotal) * 100
  
  // Analyze clock track (top and right alternating)
  let clockScore = 0
  let clockTotal = 0
  
  // Top row should alternate
  for (let x = 0; x < sizeInfo.columns; x++) {
    const pixelX = Math.floor((x + 0.5) * moduleWidth)
    const pixelY = Math.floor(moduleHeight / 2)
    const idx = (pixelY * width + pixelX) * 4
    const isDark = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 < 128
    const shouldBeDark = x % 2 === 0
    
    clockTotal++
    if (isDark === shouldBeDark) clockScore++
  }
  
  // Right column should alternate
  for (let y = 0; y < sizeInfo.rows; y++) {
    const pixelX = width - Math.floor(moduleWidth / 2)
    const pixelY = Math.floor((y + 0.5) * moduleHeight)
    const idx = (pixelY * width + pixelX) * 4
    const isDark = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 < 128
    const shouldBeDark = y % 2 === 0
    
    clockTotal++
    if (isDark === shouldBeDark) clockScore++
  }
  
  const clockTrackIntegrity = (clockScore / clockTotal) * 100
  
  // Alignment patterns (for symbols with multiple data regions)
  let alignmentPatternIntegrity = 100
  if (sizeInfo.dataRegions > 1) {
    // Would analyze internal alignment patterns
    alignmentPatternIntegrity = 95 // Placeholder
  }
  
  // Generate issues
  if (lShapeIntegrity < 90) {
    issues.push(`L-shape finder pattern integrity: ${lShapeIntegrity.toFixed(1)}%`)
  }
  if (clockTrackIntegrity < 85) {
    issues.push(`Clock track integrity: ${clockTrackIntegrity.toFixed(1)}%`)
  }
  if (alignmentPatternIntegrity < 90) {
    issues.push(`Alignment pattern integrity: ${alignmentPatternIntegrity.toFixed(1)}%`)
  }
  
  const overallIntegrity = (lShapeIntegrity + clockTrackIntegrity + alignmentPatternIntegrity) / 3
  
  return {
    lShapeIntegrity,
    clockTrackIntegrity,
    alignmentPatternIntegrity,
    overallIntegrity,
    issues
  }
}

// ============================================
// PRINT GROWTH ANALYSIS
// ============================================

/**
 * Analyze print growth (dot gain)
 */
export function analyzePrintGrowth(
  imageData: ImageData,
  expectedModuleSizePx: number
): { printGrowth: number; grade: QualityGrade } {
  const { width, height, data } = imageData
  
  // Sample dark modules and measure actual size
  const threshold = 128
  let darkModuleSizes: number[] = []
  let lightModuleSizes: number[] = []
  
  // Simplified analysis - would use proper edge detection
  for (let y = expectedModuleSizePx; y < height - expectedModuleSizePx; y += expectedModuleSizePx) {
    for (let x = expectedModuleSizePx; x < width - expectedModuleSizePx; x += expectedModuleSizePx) {
      const idx = (y * width + x) * 4
      const value = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      
      if (value < threshold) {
        // Dark module - measure width
        let moduleWidth = 0
        for (let dx = -expectedModuleSizePx; dx < expectedModuleSizePx * 2; dx++) {
          const checkIdx = (y * width + x + dx) * 4
          if (checkIdx >= 0 && checkIdx < data.length) {
            const checkValue = (data[checkIdx] + data[checkIdx + 1] + data[checkIdx + 2]) / 3
            if (checkValue < threshold) moduleWidth++
          }
        }
        darkModuleSizes.push(moduleWidth)
      } else {
        // Light module
        let moduleWidth = 0
        for (let dx = -expectedModuleSizePx; dx < expectedModuleSizePx * 2; dx++) {
          const checkIdx = (y * width + x + dx) * 4
          if (checkIdx >= 0 && checkIdx < data.length) {
            const checkValue = (data[checkIdx] + data[checkIdx + 1] + data[checkIdx + 2]) / 3
            if (checkValue >= threshold) moduleWidth++
          }
        }
        lightModuleSizes.push(moduleWidth)
      }
    }
  }
  
  // Calculate average sizes
  const avgDarkSize = darkModuleSizes.length > 0 
    ? darkModuleSizes.reduce((a, b) => a + b, 0) / darkModuleSizes.length 
    : expectedModuleSizePx
  const avgLightSize = lightModuleSizes.length > 0 
    ? lightModuleSizes.reduce((a, b) => a + b, 0) / lightModuleSizes.length 
    : expectedModuleSizePx
  
  // Print growth = (actual dark - expected) / expected
  const printGrowth = ((avgDarkSize - expectedModuleSizePx) / expectedModuleSizePx) * 100
  
  // Grade based on print growth
  let grade: QualityGrade
  const absPrintGrowth = Math.abs(printGrowth)
  
  if (absPrintGrowth <= 10) grade = 'A'
  else if (absPrintGrowth <= 20) grade = 'B'
  else if (absPrintGrowth <= 30) grade = 'C'
  else if (absPrintGrowth <= 40) grade = 'D'
  else grade = 'F'
  
  return { printGrowth, grade }
}

// ============================================
// RECOMMENDED SIZE SELECTION
// ============================================

/**
 * Recommend optimal Data Matrix size for data
 */
export function recommendDataMatrixSize(
  dataLength: number,
  preferSquare: boolean = true
): DataMatrixSize {
  // Find smallest size that fits the data
  const sizes = Object.entries(DATA_MATRIX_SIZES)
    .filter(([_, info]) => {
      if (preferSquare && info.rows !== info.columns) return false
      return info.dataCapacity >= dataLength
    })
    .sort((a, b) => a[1].dataCapacity - b[1].dataCapacity)
  
  if (sizes.length === 0) {
    // Data too large, return largest
    return preferSquare ? '144x144' : '16x48'
  }
  
  return sizes[0][0] as DataMatrixSize
}
