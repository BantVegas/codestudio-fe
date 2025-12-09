/**
 * GPCS CodeStudio - Barcode Verifier
 * 
 * Main verification engine for barcode quality analysis
 */

import type {
  BarcodeType,
  LinearBarcodeType,
  MatrixBarcodeType,
  QualityGrade,
  VerificationResult,
  VerificationOptions,
  ParameterResult,
  ScanLineResult,
  ISO15416Parameters,
  ISO15415Parameters,
} from './types'

import {
  DEFAULT_VERIFICATION_OPTIONS,
  QUIET_ZONE_REQUIREMENTS,
  APERTURE_SELECTION,
} from './types'

import {
  gradeISO15416Parameters,
  gradeISO15415Parameters,
  calculateOverallGrade,
  calculateAverageGrade,
  generateRecommendations,
  gradeToNumeric,
} from './QualityGrading'

// ============================================
// BARCODE VERIFIER CLASS
// ============================================

/**
 * Main barcode verification class
 */
export class BarcodeVerifier {
  private options: VerificationOptions
  
  constructor(options: Partial<VerificationOptions> = {}) {
    this.options = { ...DEFAULT_VERIFICATION_OPTIONS, ...options }
  }
  
  /**
   * Set verification options
   */
  setOptions(options: Partial<VerificationOptions>): void {
    this.options = { ...this.options, ...options }
  }
  
  /**
   * Get current options
   */
  getOptions(): VerificationOptions {
    return { ...this.options }
  }
  
  /**
   * Verify barcode from image data
   */
  async verifyFromImageData(
    imageData: ImageData,
    barcodeType: BarcodeType,
    xDimensionMm?: number
  ): Promise<VerificationResult> {
    // Determine if linear or 2D
    const isLinear = this.isLinearBarcode(barcodeType)
    
    // Select appropriate aperture based on X dimension
    if (xDimensionMm) {
      this.options.aperture = this.selectAperture(xDimensionMm)
    }
    
    if (isLinear) {
      return this.verifyLinearBarcode(imageData, barcodeType as LinearBarcodeType)
    } else {
      return this.verify2DBarcode(imageData, barcodeType as MatrixBarcodeType)
    }
  }
  
  /**
   * Verify barcode from canvas element
   */
  async verifyFromCanvas(
    canvas: HTMLCanvasElement,
    barcodeType: BarcodeType,
    xDimensionMm?: number
  ): Promise<VerificationResult> {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not get canvas context')
    }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return this.verifyFromImageData(imageData, barcodeType, xDimensionMm)
  }
  
  /**
   * Check if barcode type is linear
   */
  private isLinearBarcode(type: BarcodeType): boolean {
    const linearTypes: LinearBarcodeType[] = [
      'CODE128', 'EAN13', 'EAN8', 'UPCA', 'UPCE', 
      'ITF14', 'CODE39', 'CODE93', 'CODABAR', 'GS1128', 'GS1DATABAR'
    ]
    return linearTypes.includes(type as LinearBarcodeType)
  }
  
  /**
   * Select aperture based on X dimension
   */
  private selectAperture(xDimensionMm: number): 3 | 5 | 6 | 10 | 20 {
    if (xDimensionMm < 0.127) return 3
    if (xDimensionMm < 0.254) return 5
    if (xDimensionMm < 0.508) return 6
    if (xDimensionMm < 1.016) return 10
    return 20
  }
  
  // ============================================
  // LINEAR BARCODE VERIFICATION (ISO 15416)
  // ============================================
  
  /**
   * Verify linear barcode
   */
  private async verifyLinearBarcode(
    imageData: ImageData,
    barcodeType: LinearBarcodeType
  ): Promise<VerificationResult> {
    const scanLines: ScanLineResult[] = []
    const height = imageData.height
    
    // Perform multiple scan lines
    for (let i = 0; i < this.options.scanLines; i++) {
      const yPosition = Math.floor((height / (this.options.scanLines + 1)) * (i + 1))
      const scanResult = this.analyzeScanLine(imageData, yPosition, barcodeType)
      scanLines.push({
        lineNumber: i + 1,
        yPosition,
        ...scanResult
      })
    }
    
    // Calculate average parameters
    const avgParams = this.averageScanLineResults(scanLines)
    
    // Grade parameters
    const parameterResults = gradeISO15416Parameters(avgParams)
    
    // Calculate overall grade
    const grades = parameterResults.map(p => p.grade)
    const overallGrade = calculateOverallGrade(grades)
    const numericGrade = calculateAverageGrade(grades)
    
    // Generate recommendations
    const recommendations = generateRecommendations(parameterResults)
    
    // Check if passed
    const passed = gradeToNumeric(overallGrade) >= gradeToNumeric(this.options.minimumGrade)
    
    // Decode data (simplified - would use actual decoder)
    const decodedData = avgParams.decode ? this.extractDecodedData(scanLines) : null
    
    // Generate warnings
    const warnings = this.generateWarnings(parameterResults, barcodeType)
    
    return {
      barcodeType,
      decodedData,
      overallGrade,
      numericGrade,
      parameters: parameterResults,
      scanLines,
      standard: 'ISO15416',
      timestamp: new Date(),
      aperture: this.options.aperture,
      wavelength: this.options.wavelength,
      angle: this.options.angle,
      passed,
      minimumGrade: this.options.minimumGrade,
      warnings,
      recommendations
    }
  }
  
  /**
   * Analyze a single scan line
   */
  private analyzeScanLine(
    imageData: ImageData,
    yPosition: number,
    barcodeType: LinearBarcodeType
  ): Omit<ScanLineResult, 'lineNumber' | 'yPosition'> {
    const { width, data } = imageData
    const reflectanceProfile: number[] = []
    
    // Extract reflectance values along scan line
    for (let x = 0; x < width; x++) {
      const idx = (yPosition * width + x) * 4
      // Convert RGB to grayscale reflectance (0-100%)
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const reflectance = ((r * 0.299 + g * 0.587 + b * 0.114) / 255) * 100
      reflectanceProfile.push(reflectance)
    }
    
    // Calculate parameters
    const rMin = Math.min(...reflectanceProfile)
    const rMax = Math.max(...reflectanceProfile)
    const symbolContrast = rMax - rMin
    
    // Calculate edge contrast (minimum edge transition)
    const edgeContrast = this.calculateEdgeContrast(reflectanceProfile)
    
    // Calculate modulation
    const modulation = symbolContrast > 0 ? edgeContrast / symbolContrast : 0
    
    // Calculate defects
    const defects = this.calculateDefects(reflectanceProfile, rMin, rMax)
    
    // Calculate decodability (simplified)
    const decodability = this.calculateDecodability(reflectanceProfile)
    
    // Check quiet zones
    const quietZoneReq = QUIET_ZONE_REQUIREMENTS[barcodeType]
    const quietZoneCompliant = this.checkQuietZones(reflectanceProfile, quietZoneReq)
    
    // Attempt decode (simplified)
    const decode = symbolContrast >= 20 && modulation >= 0.4
    
    // Calculate overall grade for this scan line
    const params: ISO15416Parameters = {
      symbolContrast,
      minReflectance: rMin,
      maxReflectance: rMax,
      edgeContrast,
      modulation,
      defects,
      decodability,
      decode,
      quietZoneLeft: 10,
      quietZoneRight: 10,
      quietZoneCompliant
    }
    
    const grades = gradeISO15416Parameters(params).map(p => p.grade)
    const overallGrade = calculateOverallGrade(grades)
    
    return {
      decode,
      symbolContrast,
      edgeContrast,
      modulation,
      defects,
      decodability,
      overallGrade
    }
  }
  
  /**
   * Calculate edge contrast
   */
  private calculateEdgeContrast(profile: number[]): number {
    let minEdge = Infinity
    
    for (let i = 1; i < profile.length; i++) {
      const edge = Math.abs(profile[i] - profile[i - 1])
      if (edge > 5) { // Only consider significant edges
        minEdge = Math.min(minEdge, edge)
      }
    }
    
    return minEdge === Infinity ? 0 : minEdge
  }
  
  /**
   * Calculate defects
   */
  private calculateDefects(profile: number[], rMin: number, rMax: number): number {
    const globalThreshold = (rMin + rMax) / 2
    let maxDefect = 0
    
    // Find maximum deviation within elements
    let inBar = profile[0] < globalThreshold
    let elementStart = 0
    
    for (let i = 1; i < profile.length; i++) {
      const currentInBar = profile[i] < globalThreshold
      
      if (currentInBar !== inBar) {
        // End of element - calculate defect
        const elementValues = profile.slice(elementStart, i)
        const expectedValue = inBar ? rMin : rMax
        
        for (const val of elementValues) {
          const defect = Math.abs(val - expectedValue) / (rMax - rMin)
          maxDefect = Math.max(maxDefect, defect)
        }
        
        inBar = currentInBar
        elementStart = i
      }
    }
    
    return maxDefect
  }
  
  /**
   * Calculate decodability
   */
  private calculateDecodability(profile: number[]): number {
    // Simplified decodability calculation
    // Full implementation would analyze element widths vs. reference
    const edges = this.findEdges(profile)
    
    if (edges.length < 4) return 0
    
    // Calculate width consistency
    const widths: number[] = []
    for (let i = 1; i < edges.length; i++) {
      widths.push(edges[i] - edges[i - 1])
    }
    
    const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length
    let maxDeviation = 0
    
    for (const width of widths) {
      const deviation = Math.abs(width - avgWidth) / avgWidth
      maxDeviation = Math.max(maxDeviation, deviation)
    }
    
    return Math.max(0, 1 - maxDeviation)
  }
  
  /**
   * Find edges in reflectance profile
   */
  private findEdges(profile: number[]): number[] {
    const edges: number[] = []
    const threshold = (Math.min(...profile) + Math.max(...profile)) / 2
    
    let wasAbove = profile[0] > threshold
    
    for (let i = 1; i < profile.length; i++) {
      const isAbove = profile[i] > threshold
      if (isAbove !== wasAbove) {
        edges.push(i)
        wasAbove = isAbove
      }
    }
    
    return edges
  }
  
  /**
   * Check quiet zones
   */
  private checkQuietZones(
    profile: number[],
    requirements: { left: number; right: number }
  ): boolean {
    // Simplified check - would need X dimension for proper calculation
    const threshold = (Math.min(...profile) + Math.max(...profile)) / 2
    
    // Check left quiet zone
    let leftClear = 0
    for (let i = 0; i < profile.length && profile[i] > threshold; i++) {
      leftClear++
    }
    
    // Check right quiet zone
    let rightClear = 0
    for (let i = profile.length - 1; i >= 0 && profile[i] > threshold; i--) {
      rightClear++
    }
    
    // Simplified: assume 10 pixels = 1X
    return leftClear >= requirements.left * 10 && rightClear >= requirements.right * 10
  }
  
  /**
   * Average scan line results
   */
  private averageScanLineResults(scanLines: ScanLineResult[]): ISO15416Parameters {
    const n = scanLines.length
    
    return {
      symbolContrast: scanLines.reduce((sum, s) => sum + s.symbolContrast, 0) / n,
      minReflectance: Math.min(...scanLines.map(s => s.symbolContrast)),
      maxReflectance: Math.max(...scanLines.map(s => s.symbolContrast)),
      edgeContrast: scanLines.reduce((sum, s) => sum + s.edgeContrast, 0) / n,
      modulation: scanLines.reduce((sum, s) => sum + s.modulation, 0) / n,
      defects: Math.max(...scanLines.map(s => s.defects)),
      decodability: scanLines.reduce((sum, s) => sum + s.decodability, 0) / n,
      decode: scanLines.every(s => s.decode),
      quietZoneLeft: 10,
      quietZoneRight: 10,
      quietZoneCompliant: true
    }
  }
  
  /**
   * Extract decoded data from scan lines
   */
  private extractDecodedData(scanLines: ScanLineResult[]): string | null {
    // Would use actual decoder library
    return null
  }
  
  // ============================================
  // 2D BARCODE VERIFICATION (ISO 15415)
  // ============================================
  
  /**
   * Verify 2D barcode
   */
  private async verify2DBarcode(
    imageData: ImageData,
    barcodeType: MatrixBarcodeType
  ): Promise<VerificationResult> {
    // Analyze 2D symbol
    const params = this.analyze2DSymbol(imageData, barcodeType)
    
    // Grade parameters
    const parameterResults = gradeISO15415Parameters(params)
    
    // Calculate overall grade
    const grades = parameterResults.map(p => p.grade)
    const overallGrade = calculateOverallGrade(grades)
    const numericGrade = calculateAverageGrade(grades)
    
    // Generate recommendations
    const recommendations = generateRecommendations(parameterResults)
    
    // Check if passed
    const passed = gradeToNumeric(overallGrade) >= gradeToNumeric(this.options.minimumGrade)
    
    // Decode data (simplified)
    const decodedData = params.decode ? null : null // Would use actual decoder
    
    // Generate warnings
    const warnings = this.generate2DWarnings(parameterResults, barcodeType)
    
    return {
      barcodeType,
      decodedData,
      overallGrade,
      numericGrade,
      parameters: parameterResults,
      standard: 'ISO15415',
      timestamp: new Date(),
      aperture: this.options.aperture,
      wavelength: this.options.wavelength,
      angle: this.options.angle,
      passed,
      minimumGrade: this.options.minimumGrade,
      warnings,
      recommendations
    }
  }
  
  /**
   * Analyze 2D symbol
   */
  private analyze2DSymbol(
    imageData: ImageData,
    barcodeType: MatrixBarcodeType
  ): ISO15415Parameters {
    const { width, height, data } = imageData
    
    // Calculate reflectance values
    const reflectances: number[] = []
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      reflectances.push((r * 0.299 + g * 0.587 + b * 0.114) / 255 * 100)
    }
    
    const rMin = Math.min(...reflectances)
    const rMax = Math.max(...reflectances)
    const symbolContrast = rMax - rMin
    
    // Calculate modulation (simplified)
    const threshold = (rMin + rMax) / 2
    let darkModules: number[] = []
    let lightModules: number[] = []
    
    for (const r of reflectances) {
      if (r < threshold) {
        darkModules.push(r)
      } else {
        lightModules.push(r)
      }
    }
    
    const avgDark = darkModules.length > 0 
      ? darkModules.reduce((a, b) => a + b, 0) / darkModules.length 
      : rMin
    const avgLight = lightModules.length > 0 
      ? lightModules.reduce((a, b) => a + b, 0) / lightModules.length 
      : rMax
    
    const modulation = symbolContrast > 0 
      ? (avgLight - avgDark) / symbolContrast 
      : 0
    
    // Simplified calculations for other parameters
    const axialNonuniformity = 0.05 // Would measure actual X/Y ratio
    const gridNonuniformity = 0.3 // Would measure module positions
    const unusedErrorCorrection = 0.8 // Would calculate from error correction
    const fixedPatternDamage = 0.9 // Would analyze finder patterns
    const printGrowth = 0 // Would measure module size deviation
    
    return {
      symbolContrast,
      modulation,
      axialNonuniformity,
      gridNonuniformity,
      unusedErrorCorrection,
      fixedPatternDamage,
      decode: symbolContrast >= 20,
      printGrowth,
      quietZoneCompliant: true
    }
  }
  
  // ============================================
  // WARNINGS
  // ============================================
  
  /**
   * Generate warnings for linear barcodes
   */
  private generateWarnings(
    results: ParameterResult[],
    barcodeType: LinearBarcodeType
  ): string[] {
    const warnings: string[] = []
    
    for (const result of results) {
      if (result.grade === 'C') {
        warnings.push(`${result.name} is at minimum acceptable level`)
      } else if (result.grade === 'D') {
        warnings.push(`${result.name} is below acceptable level`)
      }
    }
    
    return warnings
  }
  
  /**
   * Generate warnings for 2D barcodes
   */
  private generate2DWarnings(
    results: ParameterResult[],
    barcodeType: MatrixBarcodeType
  ): string[] {
    const warnings: string[] = []
    
    for (const result of results) {
      if (result.grade === 'C') {
        warnings.push(`${result.name} is at minimum acceptable level`)
      } else if (result.grade === 'D') {
        warnings.push(`${result.name} is below acceptable level`)
      }
    }
    
    if (barcodeType === 'DATAMATRIX') {
      const uec = results.find(r => r.name === 'Unused Error Correction')
      if (uec && uec.value < 0.5) {
        warnings.push('Low error correction capacity remaining - symbol may be vulnerable to damage')
      }
    }
    
    return warnings
  }
}

// Export singleton
export const barcodeVerifier = new BarcodeVerifier()
