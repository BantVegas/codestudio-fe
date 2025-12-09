/**
 * GPCS CodeStudio - Linear Barcode Verifier
 * 
 * Specialized verification for 1D linear barcodes
 * ISO/IEC 15416 compliant
 */

import type {
  LinearBarcodeType,
  QualityGrade,
  VerificationResult,
  VerificationOptions,
  ScanLineResult,
} from './types'

import { BarcodeVerifier } from './BarcodeVerifier'
import {
  QUIET_ZONE_REQUIREMENTS,
  GS1_APPLICATION_IDENTIFIERS,
} from './types'

// ============================================
// GS1-128 SPECIFIC VERIFICATION
// ============================================

export interface GS1ValidationResult {
  isValid: boolean
  applicationIdentifiers: ParsedAI[]
  errors: string[]
  warnings: string[]
}

export interface ParsedAI {
  ai: string
  name: string
  value: string
  isValid: boolean
  error?: string
}

/**
 * Parse and validate GS1-128 data
 */
export function parseGS1128(data: string): GS1ValidationResult {
  const result: GS1ValidationResult = {
    isValid: true,
    applicationIdentifiers: [],
    errors: [],
    warnings: []
  }
  
  // Remove FNC1 characters (often represented as ]C1 or GS char)
  let cleanData = data.replace(/\]C1/g, '').replace(/\x1D/g, '')
  
  let position = 0
  
  while (position < cleanData.length) {
    // Try to match AI (2, 3, or 4 digits)
    let matched = false
    
    for (const aiDef of GS1_APPLICATION_IDENTIFIERS) {
      if (cleanData.substring(position).startsWith(aiDef.ai)) {
        const aiLength = aiDef.ai.length
        const dataStart = position + aiLength
        
        let dataEnd: number
        if (aiDef.isFixedLength) {
          dataEnd = dataStart + aiDef.maxLength
        } else {
          // Variable length - find FNC1 or end
          const fnc1Pos = cleanData.indexOf('\x1D', dataStart)
          dataEnd = fnc1Pos > 0 ? fnc1Pos : cleanData.length
        }
        
        const value = cleanData.substring(dataStart, Math.min(dataEnd, cleanData.length))
        
        // Validate value
        const validation = validateAIValue(aiDef.ai, value, aiDef)
        
        result.applicationIdentifiers.push({
          ai: aiDef.ai,
          name: aiDef.name,
          value,
          isValid: validation.isValid,
          error: validation.error
        })
        
        if (!validation.isValid) {
          result.isValid = false
          result.errors.push(`AI (${aiDef.ai}) ${aiDef.name}: ${validation.error}`)
        }
        
        position = dataEnd
        matched = true
        break
      }
    }
    
    if (!matched) {
      result.isValid = false
      result.errors.push(`Unknown AI at position ${position}: ${cleanData.substring(position, position + 4)}`)
      break
    }
  }
  
  // Check for required AIs in certain contexts
  checkRequiredAIs(result)
  
  return result
}

/**
 * Validate AI value
 */
function validateAIValue(
  ai: string,
  value: string,
  definition: { format: string; minLength: number; maxLength: number }
): { isValid: boolean; error?: string } {
  // Check length
  if (value.length < definition.minLength) {
    return { isValid: false, error: `Value too short (min ${definition.minLength})` }
  }
  if (value.length > definition.maxLength) {
    return { isValid: false, error: `Value too long (max ${definition.maxLength})` }
  }
  
  // Check format
  if (definition.format.startsWith('N')) {
    // Numeric only
    if (!/^\d+$/.test(value)) {
      return { isValid: false, error: 'Must be numeric' }
    }
  }
  
  // Specific validations
  switch (ai) {
    case '01': // GTIN
      if (!validateGTIN(value)) {
        return { isValid: false, error: 'Invalid GTIN check digit' }
      }
      break
    case '00': // SSCC
      if (!validateSSCC(value)) {
        return { isValid: false, error: 'Invalid SSCC check digit' }
      }
      break
    case '11':
    case '13':
    case '15':
    case '17': // Dates
      if (!validateDate(value)) {
        return { isValid: false, error: 'Invalid date format (YYMMDD)' }
      }
      break
  }
  
  return { isValid: true }
}

/**
 * Validate GTIN check digit
 */
export function validateGTIN(gtin: string): boolean {
  if (gtin.length !== 14 && gtin.length !== 13 && gtin.length !== 12 && gtin.length !== 8) {
    return false
  }
  
  // Pad to 14 digits
  const padded = gtin.padStart(14, '0')
  
  let sum = 0
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(padded[i], 10)
    sum += digit * (i % 2 === 0 ? 3 : 1)
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === parseInt(padded[13], 10)
}

/**
 * Validate SSCC check digit
 */
export function validateSSCC(sscc: string): boolean {
  if (sscc.length !== 18) return false
  
  let sum = 0
  for (let i = 0; i < 17; i++) {
    const digit = parseInt(sscc[i], 10)
    sum += digit * (i % 2 === 0 ? 3 : 1)
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === parseInt(sscc[17], 10)
}

/**
 * Validate date format YYMMDD
 */
export function validateDate(date: string): boolean {
  if (date.length !== 6) return false
  
  const year = parseInt(date.substring(0, 2), 10)
  const month = parseInt(date.substring(2, 4), 10)
  const day = parseInt(date.substring(4, 6), 10)
  
  if (month < 1 || month > 12) return false
  if (day < 0 || day > 31) return false // 00 is valid for "any day"
  
  return true
}

/**
 * Check for required AIs
 */
function checkRequiredAIs(result: GS1ValidationResult): void {
  const ais = result.applicationIdentifiers.map(a => a.ai)
  
  // If GTIN is present, certain combinations are expected
  if (ais.includes('01')) {
    // GTIN should typically have batch/lot or serial
    if (!ais.includes('10') && !ais.includes('21')) {
      result.warnings.push('GTIN present but no batch/lot (10) or serial (21) number')
    }
  }
  
  // If serial is present, GTIN should be present
  if (ais.includes('21') && !ais.includes('01')) {
    result.warnings.push('Serial number (21) present without GTIN (01)')
  }
}

// ============================================
// EAN/UPC SPECIFIC VERIFICATION
// ============================================

/**
 * Verify EAN-13 structure
 */
export function verifyEAN13Structure(data: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (data.length !== 13) {
    errors.push(`Invalid length: ${data.length} (expected 13)`)
    return { isValid: false, errors }
  }
  
  if (!/^\d{13}$/.test(data)) {
    errors.push('EAN-13 must contain only digits')
    return { isValid: false, errors }
  }
  
  // Validate check digit
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(data[i], 10) * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10
  
  if (checkDigit !== parseInt(data[12], 10)) {
    errors.push(`Invalid check digit: expected ${checkDigit}, got ${data[12]}`)
    return { isValid: false, errors }
  }
  
  return { isValid: true, errors: [] }
}

/**
 * Verify UPC-A structure
 */
export function verifyUPCAStructure(data: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (data.length !== 12) {
    errors.push(`Invalid length: ${data.length} (expected 12)`)
    return { isValid: false, errors }
  }
  
  if (!/^\d{12}$/.test(data)) {
    errors.push('UPC-A must contain only digits')
    return { isValid: false, errors }
  }
  
  // Validate check digit
  let sum = 0
  for (let i = 0; i < 11; i++) {
    sum += parseInt(data[i], 10) * (i % 2 === 0 ? 3 : 1)
  }
  const checkDigit = (10 - (sum % 10)) % 10
  
  if (checkDigit !== parseInt(data[11], 10)) {
    errors.push(`Invalid check digit: expected ${checkDigit}, got ${data[11]}`)
    return { isValid: false, errors }
  }
  
  return { isValid: true, errors: [] }
}

/**
 * Verify ITF-14 structure
 */
export function verifyITF14Structure(data: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (data.length !== 14) {
    errors.push(`Invalid length: ${data.length} (expected 14)`)
    return { isValid: false, errors }
  }
  
  if (!/^\d{14}$/.test(data)) {
    errors.push('ITF-14 must contain only digits')
    return { isValid: false, errors }
  }
  
  // First digit should be 0-8 (packaging indicator)
  const indicator = parseInt(data[0], 10)
  if (indicator > 8) {
    errors.push(`Invalid packaging indicator: ${indicator} (should be 0-8)`)
  }
  
  // Validate check digit (same as GTIN-14)
  if (!validateGTIN(data)) {
    errors.push('Invalid check digit')
    return { isValid: false, errors }
  }
  
  return { isValid: errors.length === 0, errors }
}

// ============================================
// DIMENSIONAL VERIFICATION
// ============================================

export interface DimensionalCheck {
  xDimensionMm: number
  barHeightMm: number
  quietZoneLeftMm: number
  quietZoneRightMm: number
  totalWidthMm: number
  magnification: number
}

/**
 * Check dimensional compliance
 */
export function checkDimensionalCompliance(
  barcodeType: LinearBarcodeType,
  dimensions: DimensionalCheck
): { compliant: boolean; issues: string[] } {
  const issues: string[] = []
  
  // X dimension limits by type
  const xDimLimits: Record<LinearBarcodeType, { min: number; max: number; nominal: number }> = {
    'CODE128': { min: 0.250, max: 1.016, nominal: 0.330 },
    'EAN13': { min: 0.264, max: 0.660, nominal: 0.330 },
    'EAN8': { min: 0.264, max: 0.660, nominal: 0.330 },
    'UPCA': { min: 0.264, max: 0.660, nominal: 0.330 },
    'UPCE': { min: 0.264, max: 0.660, nominal: 0.330 },
    'ITF14': { min: 0.495, max: 1.016, nominal: 0.635 },
    'CODE39': { min: 0.191, max: 1.270, nominal: 0.330 },
    'CODE93': { min: 0.191, max: 1.270, nominal: 0.330 },
    'CODABAR': { min: 0.191, max: 1.270, nominal: 0.330 },
    'GS1128': { min: 0.250, max: 1.016, nominal: 0.495 },
    'GS1DATABAR': { min: 0.264, max: 0.660, nominal: 0.330 }
  }
  
  const limits = xDimLimits[barcodeType]
  
  if (dimensions.xDimensionMm < limits.min) {
    issues.push(`X dimension ${dimensions.xDimensionMm}mm is below minimum ${limits.min}mm`)
  }
  if (dimensions.xDimensionMm > limits.max) {
    issues.push(`X dimension ${dimensions.xDimensionMm}mm exceeds maximum ${limits.max}mm`)
  }
  
  // Check magnification
  const magnification = (dimensions.xDimensionMm / limits.nominal) * 100
  if (magnification < 80) {
    issues.push(`Magnification ${magnification.toFixed(0)}% is below minimum 80%`)
  }
  if (magnification > 200) {
    issues.push(`Magnification ${magnification.toFixed(0)}% exceeds maximum 200%`)
  }
  
  // Check quiet zones
  const qzReq = QUIET_ZONE_REQUIREMENTS[barcodeType]
  const minLeftQZ = qzReq.left * dimensions.xDimensionMm
  const minRightQZ = qzReq.right * dimensions.xDimensionMm
  
  if (dimensions.quietZoneLeftMm < minLeftQZ) {
    issues.push(`Left quiet zone ${dimensions.quietZoneLeftMm.toFixed(2)}mm is below minimum ${minLeftQZ.toFixed(2)}mm`)
  }
  if (dimensions.quietZoneRightMm < minRightQZ) {
    issues.push(`Right quiet zone ${dimensions.quietZoneRightMm.toFixed(2)}mm is below minimum ${minRightQZ.toFixed(2)}mm`)
  }
  
  // Check bar height (minimum 15% of width or 6.35mm, whichever is greater)
  const minHeight = Math.max(dimensions.totalWidthMm * 0.15, 6.35)
  if (dimensions.barHeightMm < minHeight) {
    issues.push(`Bar height ${dimensions.barHeightMm.toFixed(2)}mm is below minimum ${minHeight.toFixed(2)}mm`)
  }
  
  return {
    compliant: issues.length === 0,
    issues
  }
}

// ============================================
// BAR WIDTH REDUCTION CALCULATION
// ============================================

/**
 * Calculate recommended bar width reduction
 */
export function calculateBWR(
  printingTechnology: 'FLEXO' | 'OFFSET' | 'DIGITAL' | 'GRAVURE' | 'LETTERPRESS',
  substrate: 'COATED' | 'UNCOATED' | 'FILM' | 'CORRUGATED',
  xDimensionMm: number
): { bwrMm: number; bwrPercent: number; notes: string[] } {
  // Base BWR values by technology
  const baseBWR: Record<string, number> = {
    'FLEXO': 0.025,
    'OFFSET': 0.015,
    'DIGITAL': 0.010,
    'GRAVURE': 0.020,
    'LETTERPRESS': 0.030
  }
  
  // Substrate adjustment
  const substrateMultiplier: Record<string, number> = {
    'COATED': 1.0,
    'UNCOATED': 1.3,
    'FILM': 0.8,
    'CORRUGATED': 1.5
  }
  
  const base = baseBWR[printingTechnology] || 0.020
  const multiplier = substrateMultiplier[substrate] || 1.0
  
  const bwrMm = base * multiplier
  const bwrPercent = (bwrMm / xDimensionMm) * 100
  
  const notes: string[] = []
  
  if (bwrPercent > 15) {
    notes.push('BWR exceeds 15% - consider increasing X dimension')
  }
  
  if (printingTechnology === 'FLEXO' && substrate === 'CORRUGATED') {
    notes.push('High ink spread expected - verify with print test')
  }
  
  return { bwrMm, bwrPercent, notes }
}
