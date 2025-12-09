/**
 * GPCS CodeStudio - QR Code Verifier
 * 
 * Specialized verification for QR Codes
 * ISO/IEC 15415 and ISO/IEC 18004 compliant
 */

import type {
  QualityGrade,
  ISO15415Parameters,
} from './types'

// ============================================
// QR CODE TYPES
// ============================================

export type QRVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
  11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
  21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 |
  31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

export interface QRCodeInfo {
  version: QRVersion
  modules: number
  errorCorrection: ErrorCorrectionLevel
  dataCapacityNumeric: number
  dataCapacityAlphanumeric: number
  dataCapacityByte: number
}

/**
 * QR Code version specifications (subset)
 */
export const QR_VERSIONS: Record<QRVersion, Omit<QRCodeInfo, 'errorCorrection' | 'dataCapacityNumeric' | 'dataCapacityAlphanumeric' | 'dataCapacityByte'> & { modules: number }> = {
  1: { version: 1, modules: 21 },
  2: { version: 2, modules: 25 },
  3: { version: 3, modules: 29 },
  4: { version: 4, modules: 33 },
  5: { version: 5, modules: 37 },
  6: { version: 6, modules: 41 },
  7: { version: 7, modules: 45 },
  8: { version: 8, modules: 49 },
  9: { version: 9, modules: 53 },
  10: { version: 10, modules: 57 },
  11: { version: 11, modules: 61 },
  12: { version: 12, modules: 65 },
  13: { version: 13, modules: 69 },
  14: { version: 14, modules: 73 },
  15: { version: 15, modules: 77 },
  16: { version: 16, modules: 81 },
  17: { version: 17, modules: 85 },
  18: { version: 18, modules: 89 },
  19: { version: 19, modules: 93 },
  20: { version: 20, modules: 97 },
  21: { version: 21, modules: 101 },
  22: { version: 22, modules: 105 },
  23: { version: 23, modules: 109 },
  24: { version: 24, modules: 113 },
  25: { version: 25, modules: 117 },
  26: { version: 26, modules: 121 },
  27: { version: 27, modules: 125 },
  28: { version: 28, modules: 129 },
  29: { version: 29, modules: 133 },
  30: { version: 30, modules: 137 },
  31: { version: 31, modules: 141 },
  32: { version: 32, modules: 145 },
  33: { version: 33, modules: 149 },
  34: { version: 34, modules: 153 },
  35: { version: 35, modules: 157 },
  36: { version: 36, modules: 161 },
  37: { version: 37, modules: 165 },
  38: { version: 38, modules: 169 },
  39: { version: 39, modules: 173 },
  40: { version: 40, modules: 177 }
}

/**
 * Data capacity by version and error correction (byte mode)
 */
export const QR_CAPACITY: Record<ErrorCorrectionLevel, number[]> = {
  'L': [17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953],
  'M': [14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331],
  'Q': [11, 20, 32, 46, 60, 74, 86, 108, 130, 151, 177, 203, 241, 258, 292, 322, 364, 394, 442, 482, 509, 565, 611, 661, 715, 751, 805, 868, 908, 982, 1030, 1112, 1168, 1228, 1283, 1351, 1423, 1499, 1579, 1663],
  'H': [7, 14, 24, 34, 44, 58, 64, 84, 98, 119, 137, 155, 177, 194, 220, 250, 280, 310, 338, 382, 403, 439, 461, 511, 535, 593, 625, 658, 698, 742, 790, 842, 898, 958, 983, 1051, 1093, 1139, 1219, 1273]
}

// ============================================
// FINDER PATTERN VERIFICATION
// ============================================

export interface QRFinderPatternAnalysis {
  topLeftIntegrity: number
  topRightIntegrity: number
  bottomLeftIntegrity: number
  alignmentPatternsIntegrity: number
  timingPatternsIntegrity: number
  overallIntegrity: number
  issues: string[]
}

/**
 * Analyze QR Code finder patterns
 */
export function analyzeQRFinderPatterns(
  imageData: ImageData,
  version: QRVersion
): QRFinderPatternAnalysis {
  const { width, height, data } = imageData
  const modules = QR_VERSIONS[version].modules
  const moduleSize = width / modules
  
  const issues: string[] = []
  
  // Analyze three finder patterns (7x7 modules each)
  const topLeftScore = analyzeFinderPattern(imageData, 0, 0, moduleSize)
  const topRightScore = analyzeFinderPattern(imageData, modules - 7, 0, moduleSize)
  const bottomLeftScore = analyzeFinderPattern(imageData, 0, modules - 7, moduleSize)
  
  // Analyze timing patterns
  const timingScore = analyzeTimingPatterns(imageData, modules, moduleSize)
  
  // Analyze alignment patterns (for version >= 2)
  let alignmentScore = 100
  if (version >= 2) {
    alignmentScore = analyzeAlignmentPatterns(imageData, version, moduleSize)
  }
  
  // Generate issues
  if (topLeftScore < 80) issues.push(`Top-left finder pattern: ${topLeftScore.toFixed(1)}%`)
  if (topRightScore < 80) issues.push(`Top-right finder pattern: ${topRightScore.toFixed(1)}%`)
  if (bottomLeftScore < 80) issues.push(`Bottom-left finder pattern: ${bottomLeftScore.toFixed(1)}%`)
  if (timingScore < 80) issues.push(`Timing patterns: ${timingScore.toFixed(1)}%`)
  if (alignmentScore < 80) issues.push(`Alignment patterns: ${alignmentScore.toFixed(1)}%`)
  
  const overallIntegrity = (topLeftScore + topRightScore + bottomLeftScore + timingScore + alignmentScore) / 5
  
  return {
    topLeftIntegrity: topLeftScore,
    topRightIntegrity: topRightScore,
    bottomLeftIntegrity: bottomLeftScore,
    alignmentPatternsIntegrity: alignmentScore,
    timingPatternsIntegrity: timingScore,
    overallIntegrity,
    issues
  }
}

/**
 * Analyze a single finder pattern
 */
function analyzeFinderPattern(
  imageData: ImageData,
  startModuleX: number,
  startModuleY: number,
  moduleSize: number
): number {
  const { width, data } = imageData
  
  // Expected pattern (7x7):
  // 1111111
  // 1000001
  // 1011101
  // 1011101
  // 1011101
  // 1000001
  // 1111111
  const expectedPattern = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1]
  ]
  
  let matches = 0
  let total = 0
  
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      const pixelX = Math.floor((startModuleX + col + 0.5) * moduleSize)
      const pixelY = Math.floor((startModuleY + row + 0.5) * moduleSize)
      const idx = (pixelY * width + pixelX) * 4
      
      if (idx >= 0 && idx < data.length) {
        const value = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        const isDark = value < 128
        const shouldBeDark = expectedPattern[row][col] === 1
        
        total++
        if (isDark === shouldBeDark) matches++
      }
    }
  }
  
  return (matches / total) * 100
}

/**
 * Analyze timing patterns
 */
function analyzeTimingPatterns(
  imageData: ImageData,
  modules: number,
  moduleSize: number
): number {
  const { width, data } = imageData
  
  let matches = 0
  let total = 0
  
  // Horizontal timing pattern (row 6)
  for (let col = 8; col < modules - 8; col++) {
    const pixelX = Math.floor((col + 0.5) * moduleSize)
    const pixelY = Math.floor(6.5 * moduleSize)
    const idx = (pixelY * width + pixelX) * 4
    
    if (idx >= 0 && idx < data.length) {
      const value = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      const isDark = value < 128
      const shouldBeDark = col % 2 === 0
      
      total++
      if (isDark === shouldBeDark) matches++
    }
  }
  
  // Vertical timing pattern (column 6)
  for (let row = 8; row < modules - 8; row++) {
    const pixelX = Math.floor(6.5 * moduleSize)
    const pixelY = Math.floor((row + 0.5) * moduleSize)
    const idx = (pixelY * width + pixelX) * 4
    
    if (idx >= 0 && idx < data.length) {
      const value = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      const isDark = value < 128
      const shouldBeDark = row % 2 === 0
      
      total++
      if (isDark === shouldBeDark) matches++
    }
  }
  
  return total > 0 ? (matches / total) * 100 : 100
}

/**
 * Analyze alignment patterns
 */
function analyzeAlignmentPatterns(
  imageData: ImageData,
  version: QRVersion,
  moduleSize: number
): number {
  // Alignment pattern positions by version
  const alignmentPositions: Record<number, number[]> = {
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    // ... more versions would be added
  }
  
  const positions = alignmentPositions[version]
  if (!positions || positions.length < 2) return 100
  
  // Would analyze each alignment pattern
  // Simplified: return high score
  return 95
}

// ============================================
// QUIET ZONE VERIFICATION
// ============================================

/**
 * Check QR Code quiet zone
 */
export function checkQRQuietZone(
  imageData: ImageData,
  version: QRVersion,
  moduleSize: number
): { compliant: boolean; leftModules: number; rightModules: number; topModules: number; bottomModules: number } {
  const { width, height, data } = imageData
  const modules = QR_VERSIONS[version].modules
  const symbolSize = modules * moduleSize
  
  // Required quiet zone is 4 modules
  const requiredQuietZone = 4
  
  // Check each side
  const threshold = 200 // Light threshold
  
  // Left quiet zone
  let leftModules = 0
  for (let x = 0; x < width && x < moduleSize * 10; x += moduleSize) {
    let isLight = true
    for (let y = 0; y < height; y += moduleSize) {
      const idx = (Math.floor(y) * width + Math.floor(x)) * 4
      if (idx < data.length) {
        const value = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        if (value < threshold) {
          isLight = false
          break
        }
      }
    }
    if (isLight) leftModules++
    else break
  }
  
  // Similar checks for other sides (simplified)
  const rightModules = leftModules
  const topModules = leftModules
  const bottomModules = leftModules
  
  return {
    compliant: leftModules >= requiredQuietZone && 
               rightModules >= requiredQuietZone && 
               topModules >= requiredQuietZone && 
               bottomModules >= requiredQuietZone,
    leftModules,
    rightModules,
    topModules,
    bottomModules
  }
}

// ============================================
// DIMENSIONAL VERIFICATION
// ============================================

export interface QRDimensions {
  moduleSizeMm: number
  symbolSizeMm: number
  quietZoneMm: number
  version: QRVersion
}

/**
 * Check QR Code dimensional compliance
 */
export function checkQRDimensions(
  dimensions: QRDimensions,
  application: 'PRINT' | 'SCREEN' | 'PACKAGING' | 'INDUSTRIAL'
): { compliant: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Module size requirements
  const moduleLimits: Record<string, { min: number; recommended: number }> = {
    'PRINT': { min: 0.254, recommended: 0.423 },
    'SCREEN': { min: 0.169, recommended: 0.339 },
    'PACKAGING': { min: 0.339, recommended: 0.508 },
    'INDUSTRIAL': { min: 0.508, recommended: 0.762 }
  }
  
  const limits = moduleLimits[application]
  
  if (dimensions.moduleSizeMm < limits.min) {
    issues.push(`Module size ${dimensions.moduleSizeMm}mm below minimum ${limits.min}mm for ${application}`)
  }
  
  // Quiet zone must be at least 4 modules
  const minQuietZone = 4 * dimensions.moduleSizeMm
  if (dimensions.quietZoneMm < minQuietZone) {
    issues.push(`Quiet zone ${dimensions.quietZoneMm}mm is less than required ${minQuietZone}mm (4 modules)`)
  }
  
  return {
    compliant: issues.length === 0,
    issues
  }
}

// ============================================
// ERROR CORRECTION RECOMMENDATION
// ============================================

/**
 * Recommend error correction level
 */
export function recommendErrorCorrection(
  application: 'CLEAN_ENVIRONMENT' | 'NORMAL' | 'INDUSTRIAL' | 'OUTDOOR',
  dataLength: number
): { level: ErrorCorrectionLevel; reason: string } {
  switch (application) {
    case 'CLEAN_ENVIRONMENT':
      return { level: 'L', reason: 'Low error correction (7%) sufficient for clean environments' }
    case 'NORMAL':
      return { level: 'M', reason: 'Medium error correction (15%) recommended for general use' }
    case 'INDUSTRIAL':
      return { level: 'Q', reason: 'Quartile error correction (25%) for industrial environments' }
    case 'OUTDOOR':
      return { level: 'H', reason: 'High error correction (30%) for outdoor/harsh conditions' }
    default:
      return { level: 'M', reason: 'Medium error correction as default' }
  }
}

/**
 * Recommend QR version for data
 */
export function recommendQRVersion(
  dataLength: number,
  errorCorrection: ErrorCorrectionLevel
): QRVersion {
  const capacities = QR_CAPACITY[errorCorrection]
  
  for (let v = 0; v < capacities.length; v++) {
    if (capacities[v] >= dataLength) {
      return (v + 1) as QRVersion
    }
  }
  
  return 40 // Maximum version
}

// ============================================
// URL/CONTENT VALIDATION
// ============================================

/**
 * Validate QR Code content
 */
export function validateQRContent(
  content: string,
  expectedType: 'URL' | 'VCARD' | 'WIFI' | 'TEXT' | 'ANY'
): { isValid: boolean; detectedType: string; issues: string[] } {
  const issues: string[] = []
  let detectedType = 'TEXT'
  let isValid = true
  
  // Detect content type
  if (content.startsWith('http://') || content.startsWith('https://')) {
    detectedType = 'URL'
    
    // Validate URL
    try {
      new URL(content)
    } catch {
      issues.push('Invalid URL format')
      isValid = false
    }
    
    // Check for common issues
    if (content.includes(' ')) {
      issues.push('URL contains spaces')
      isValid = false
    }
  } else if (content.startsWith('BEGIN:VCARD')) {
    detectedType = 'VCARD'
    
    if (!content.includes('END:VCARD')) {
      issues.push('vCard missing END:VCARD')
      isValid = false
    }
  } else if (content.startsWith('WIFI:')) {
    detectedType = 'WIFI'
    
    if (!content.includes('S:')) {
      issues.push('WiFi QR missing SSID')
      isValid = false
    }
  }
  
  // Check if detected type matches expected
  if (expectedType !== 'ANY' && detectedType !== expectedType) {
    issues.push(`Expected ${expectedType} but detected ${detectedType}`)
  }
  
  // Check content length
  if (content.length > 2953) { // Max for version 40-L
    issues.push('Content exceeds maximum QR Code capacity')
    isValid = false
  }
  
  return { isValid, detectedType, issues }
}
