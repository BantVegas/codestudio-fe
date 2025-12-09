/**
 * GPCS CodeStudio - Barcode Quality Types
 * 
 * ISO/IEC 15416 (1D Linear) and ISO/IEC 15415 (2D Matrix) compliant types
 */

// ============================================
// QUALITY GRADES
// ============================================

/**
 * ISO/ANSI quality grade (4.0 scale)
 */
export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F'

/**
 * Numeric grade value (0.0 - 4.0)
 */
export type NumericGrade = 4.0 | 3.0 | 2.0 | 1.0 | 0.0

/**
 * Grade mapping
 */
export const GRADE_MAP: Record<QualityGrade, NumericGrade> = {
  'A': 4.0,
  'B': 3.0,
  'C': 2.0,
  'D': 1.0,
  'F': 0.0
}

export const NUMERIC_TO_GRADE: Record<NumericGrade, QualityGrade> = {
  4.0: 'A',
  3.0: 'B',
  2.0: 'C',
  1.0: 'D',
  0.0: 'F'
}

// ============================================
// BARCODE TYPES
// ============================================

export type LinearBarcodeType = 
  | 'CODE128'
  | 'EAN13'
  | 'EAN8'
  | 'UPCA'
  | 'UPCE'
  | 'ITF14'
  | 'CODE39'
  | 'CODE93'
  | 'CODABAR'
  | 'GS1128'
  | 'GS1DATABAR'

export type MatrixBarcodeType =
  | 'DATAMATRIX'
  | 'QR'
  | 'PDF417'
  | 'AZTEC'
  | 'MAXICODE'

export type BarcodeType = LinearBarcodeType | MatrixBarcodeType

// ============================================
// ISO 15416 - LINEAR BARCODE PARAMETERS
// ============================================

/**
 * ISO 15416 verification parameters for 1D barcodes
 */
export interface ISO15416Parameters {
  /** Symbol Contrast (SC) - minimum 20% for grade C */
  symbolContrast: number
  
  /** Minimum Reflectance (Rmin) */
  minReflectance: number
  
  /** Maximum Reflectance (Rmax) */
  maxReflectance: number
  
  /** Edge Contrast (ECmin) */
  edgeContrast: number
  
  /** Modulation (MOD) */
  modulation: number
  
  /** Defects */
  defects: number
  
  /** Decodability */
  decodability: number
  
  /** Decode - pass/fail */
  decode: boolean
  
  /** Quiet Zone compliance */
  quietZoneLeft: number
  quietZoneRight: number
  quietZoneCompliant: boolean
}

/**
 * ISO 15416 grade thresholds
 */
export const ISO15416_THRESHOLDS = {
  symbolContrast: {
    A: 70,
    B: 55,
    C: 40,
    D: 20,
    F: 0
  },
  edgeContrast: {
    A: 15,
    B: 15,
    C: 15,
    D: 15,
    F: 0
  },
  modulation: {
    A: 0.70,
    B: 0.60,
    C: 0.50,
    D: 0.40,
    F: 0
  },
  defects: {
    A: 0.15,
    B: 0.20,
    C: 0.25,
    D: 0.30,
    F: 1.0
  },
  decodability: {
    A: 0.62,
    B: 0.50,
    C: 0.37,
    D: 0.25,
    F: 0
  }
}

// ============================================
// ISO 15415 - 2D MATRIX PARAMETERS
// ============================================

/**
 * ISO 15415 verification parameters for 2D barcodes
 */
export interface ISO15415Parameters {
  /** Symbol Contrast */
  symbolContrast: number
  
  /** Modulation */
  modulation: number
  
  /** Axial Non-uniformity (for Data Matrix) */
  axialNonuniformity: number
  
  /** Grid Non-uniformity */
  gridNonuniformity: number
  
  /** Unused Error Correction */
  unusedErrorCorrection: number
  
  /** Fixed Pattern Damage */
  fixedPatternDamage: number
  
  /** Decode - pass/fail */
  decode: boolean
  
  /** Print Growth */
  printGrowth: number
  
  /** Quiet Zone compliance */
  quietZoneCompliant: boolean
}

/**
 * ISO 15415 grade thresholds
 */
export const ISO15415_THRESHOLDS = {
  symbolContrast: {
    A: 70,
    B: 55,
    C: 40,
    D: 20,
    F: 0
  },
  modulation: {
    A: 0.50,
    B: 0.40,
    C: 0.30,
    D: 0.20,
    F: 0
  },
  axialNonuniformity: {
    A: 0.06,
    B: 0.08,
    C: 0.10,
    D: 0.12,
    F: 1.0
  },
  gridNonuniformity: {
    A: 0.38,
    B: 0.50,
    C: 0.63,
    D: 0.75,
    F: 1.0
  },
  unusedErrorCorrection: {
    A: 0.62,
    B: 0.50,
    C: 0.37,
    D: 0.25,
    F: 0
  },
  fixedPatternDamage: {
    A: 0.87,
    B: 0.75,
    C: 0.62,
    D: 0.50,
    F: 0
  }
}

// ============================================
// VERIFICATION RESULTS
// ============================================

/**
 * Individual parameter result
 */
export interface ParameterResult {
  name: string
  value: number
  grade: QualityGrade
  threshold: number
  unit?: string
  description?: string
}

/**
 * Scan line result (for linear barcodes)
 */
export interface ScanLineResult {
  lineNumber: number
  yPosition: number
  decode: boolean
  symbolContrast: number
  edgeContrast: number
  modulation: number
  defects: number
  decodability: number
  overallGrade: QualityGrade
}

/**
 * Complete verification result
 */
export interface VerificationResult {
  /** Barcode type */
  barcodeType: BarcodeType
  
  /** Decoded data */
  decodedData: string | null
  
  /** Overall grade */
  overallGrade: QualityGrade
  
  /** Numeric grade (0.0 - 4.0) */
  numericGrade: number
  
  /** Individual parameter results */
  parameters: ParameterResult[]
  
  /** Scan line results (for linear) */
  scanLines?: ScanLineResult[]
  
  /** ISO standard used */
  standard: 'ISO15416' | 'ISO15415'
  
  /** Verification timestamp */
  timestamp: Date
  
  /** Aperture used */
  aperture: number
  
  /** Light wavelength */
  wavelength: number
  
  /** Angle of incidence */
  angle: number
  
  /** Pass/Fail based on minimum grade */
  passed: boolean
  
  /** Minimum required grade */
  minimumGrade: QualityGrade
  
  /** Warnings */
  warnings: string[]
  
  /** Recommendations */
  recommendations: string[]
}

// ============================================
// VERIFICATION OPTIONS
// ============================================

/**
 * Aperture sizes (in mils - 1 mil = 0.0254mm)
 */
export type ApertureSize = 3 | 5 | 6 | 10 | 20

/**
 * Standard apertures for different X dimensions
 */
export const APERTURE_SELECTION: Record<string, ApertureSize> = {
  'X < 0.127mm': 3,
  '0.127mm <= X < 0.254mm': 5,
  '0.254mm <= X < 0.508mm': 6,
  '0.508mm <= X < 1.016mm': 10,
  'X >= 1.016mm': 20
}

/**
 * Verification options
 */
export interface VerificationOptions {
  /** Aperture size in mils */
  aperture: ApertureSize
  
  /** Light wavelength in nm (670nm standard) */
  wavelength: number
  
  /** Angle of incidence (45° standard) */
  angle: number
  
  /** Number of scan lines (10 standard for linear) */
  scanLines: number
  
  /** Minimum acceptable grade */
  minimumGrade: QualityGrade
  
  /** Check quiet zones */
  checkQuietZones: boolean
  
  /** GS1 compliance check */
  gs1Compliance: boolean
  
  /** Application identifier validation */
  validateAIs: boolean
}

/**
 * Default verification options
 */
export const DEFAULT_VERIFICATION_OPTIONS: VerificationOptions = {
  aperture: 6,
  wavelength: 670,
  angle: 45,
  scanLines: 10,
  minimumGrade: 'C',
  checkQuietZones: true,
  gs1Compliance: true,
  validateAIs: true
}

// ============================================
// QUIET ZONE REQUIREMENTS
// ============================================

/**
 * Quiet zone requirements by barcode type
 */
export const QUIET_ZONE_REQUIREMENTS: Record<LinearBarcodeType, { left: number; right: number }> = {
  'CODE128': { left: 10, right: 10 },      // 10X each side
  'EAN13': { left: 11, right: 7 },         // 11X left, 7X right
  'EAN8': { left: 7, right: 7 },           // 7X each side
  'UPCA': { left: 9, right: 9 },           // 9X each side
  'UPCE': { left: 9, right: 7 },           // 9X left, 7X right
  'ITF14': { left: 10, right: 10 },        // 10X each side
  'CODE39': { left: 10, right: 10 },       // 10X each side
  'CODE93': { left: 10, right: 10 },       // 10X each side
  'CODABAR': { left: 10, right: 10 },      // 10X each side
  'GS1128': { left: 10, right: 10 },       // 10X each side
  'GS1DATABAR': { left: 1, right: 1 }      // 1X each side (varies by type)
}

// ============================================
// GS1 APPLICATION IDENTIFIERS
// ============================================

/**
 * GS1 Application Identifier definition
 */
export interface ApplicationIdentifier {
  ai: string
  name: string
  format: string
  minLength: number
  maxLength: number
  isFixedLength: boolean
  fnc1Required: boolean
}

/**
 * Common GS1 Application Identifiers
 */
export const GS1_APPLICATION_IDENTIFIERS: ApplicationIdentifier[] = [
  { ai: '00', name: 'SSCC', format: 'N18', minLength: 18, maxLength: 18, isFixedLength: true, fnc1Required: false },
  { ai: '01', name: 'GTIN', format: 'N14', minLength: 14, maxLength: 14, isFixedLength: true, fnc1Required: false },
  { ai: '02', name: 'CONTENT', format: 'N14', minLength: 14, maxLength: 14, isFixedLength: true, fnc1Required: false },
  { ai: '10', name: 'BATCH/LOT', format: 'X..20', minLength: 1, maxLength: 20, isFixedLength: false, fnc1Required: true },
  { ai: '11', name: 'PROD DATE', format: 'N6', minLength: 6, maxLength: 6, isFixedLength: true, fnc1Required: false },
  { ai: '13', name: 'PACK DATE', format: 'N6', minLength: 6, maxLength: 6, isFixedLength: true, fnc1Required: false },
  { ai: '15', name: 'BEST BEFORE', format: 'N6', minLength: 6, maxLength: 6, isFixedLength: true, fnc1Required: false },
  { ai: '17', name: 'USE BY', format: 'N6', minLength: 6, maxLength: 6, isFixedLength: true, fnc1Required: false },
  { ai: '20', name: 'VARIANT', format: 'N2', minLength: 2, maxLength: 2, isFixedLength: true, fnc1Required: false },
  { ai: '21', name: 'SERIAL', format: 'X..20', minLength: 1, maxLength: 20, isFixedLength: false, fnc1Required: true },
  { ai: '22', name: 'CPV', format: 'X..20', minLength: 1, maxLength: 20, isFixedLength: false, fnc1Required: true },
  { ai: '30', name: 'VAR COUNT', format: 'N..8', minLength: 1, maxLength: 8, isFixedLength: false, fnc1Required: true },
  { ai: '37', name: 'COUNT', format: 'N..8', minLength: 1, maxLength: 8, isFixedLength: false, fnc1Required: true },
  { ai: '240', name: 'ADDITIONAL ID', format: 'X..30', minLength: 1, maxLength: 30, isFixedLength: false, fnc1Required: true },
  { ai: '241', name: 'CUST PART NO', format: 'X..30', minLength: 1, maxLength: 30, isFixedLength: false, fnc1Required: true },
  { ai: '250', name: 'SECONDARY SERIAL', format: 'X..30', minLength: 1, maxLength: 30, isFixedLength: false, fnc1Required: true },
  { ai: '310', name: 'NET WEIGHT (kg)', format: 'N6', minLength: 6, maxLength: 6, isFixedLength: true, fnc1Required: false },
  { ai: '320', name: 'NET WEIGHT (lb)', format: 'N6', minLength: 6, maxLength: 6, isFixedLength: true, fnc1Required: false },
  { ai: '400', name: 'ORDER NUMBER', format: 'X..30', minLength: 1, maxLength: 30, isFixedLength: false, fnc1Required: true },
  { ai: '410', name: 'SHIP TO LOC', format: 'N13', minLength: 13, maxLength: 13, isFixedLength: true, fnc1Required: false },
  { ai: '414', name: 'LOC No', format: 'N13', minLength: 13, maxLength: 13, isFixedLength: true, fnc1Required: false },
  { ai: '420', name: 'SHIP TO POST', format: 'X..20', minLength: 1, maxLength: 20, isFixedLength: false, fnc1Required: true },
  { ai: '8020', name: 'REF No', format: 'X..25', minLength: 1, maxLength: 25, isFixedLength: false, fnc1Required: true }
]

// ============================================
// REPORT TYPES
// ============================================

/**
 * Verification report format
 */
export type ReportFormat = 'PDF' | 'HTML' | 'JSON' | 'CSV'

/**
 * Report options
 */
export interface ReportOptions {
  format: ReportFormat
  includeImage: boolean
  includeReflectanceProfile: boolean
  includeScanLines: boolean
  includeRecommendations: boolean
  companyName?: string
  companyLogo?: string
  operatorName?: string
  jobReference?: string
}

/**
 * Default report options
 */
export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  format: 'PDF',
  includeImage: true,
  includeReflectanceProfile: true,
  includeScanLines: true,
  includeRecommendations: true
}
