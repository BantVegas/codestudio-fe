/**
 * GPCS CodeStudio - Color Extractor
 * 
 * Extracts and analyzes colors from PDF content
 * Handles CMYK, RGB, LAB, Spot colors, and DeviceN
 */

import type { PDFPageProxy, OPS } from 'pdfjs-dist'
import type {
  SpotColorInfo,
  SpotColorType,
  CMYKValues,
  LABValues,
  ExtendedColor,
  ColorSpaceType,
  SpotColorLibraryMatch,
  ObjectColorAnalysis,
} from '../types/PrepressTypes'

// Pantone color library (subset for matching)
const PANTONE_COLORS: Map<string, { cmyk: CMYKValues; lab?: LABValues }> = new Map([
  ['PANTONE Reflex Blue C', { cmyk: { c: 1, m: 0.77, y: 0, k: 0.02 }, lab: { l: 23, a: 26, b: -77 } }],
  ['PANTONE Process Blue C', { cmyk: { c: 1, m: 0.1, y: 0, k: 0 }, lab: { l: 55, a: -20, b: -55 } }],
  ['PANTONE Red 032 C', { cmyk: { c: 0, m: 0.9, y: 0.86, k: 0 }, lab: { l: 48, a: 69, b: 48 } }],
  ['PANTONE Yellow C', { cmyk: { c: 0, m: 0, y: 1, k: 0 }, lab: { l: 89, a: -5, b: 93 } }],
  ['PANTONE Black C', { cmyk: { c: 0, m: 0, y: 0, k: 1 }, lab: { l: 0, a: 0, b: 0 } }],
  ['PANTONE Warm Red C', { cmyk: { c: 0, m: 0.85, y: 0.85, k: 0 }, lab: { l: 50, a: 62, b: 45 } }],
  ['PANTONE Orange 021 C', { cmyk: { c: 0, m: 0.65, y: 1, k: 0 }, lab: { l: 62, a: 52, b: 68 } }],
  ['PANTONE Green C', { cmyk: { c: 0.95, m: 0, y: 1, k: 0.27 }, lab: { l: 45, a: -55, b: 35 } }],
  ['PANTONE Purple C', { cmyk: { c: 0.45, m: 1, y: 0, k: 0 }, lab: { l: 32, a: 55, b: -45 } }],
  ['PANTONE Rubine Red C', { cmyk: { c: 0, m: 1, y: 0.15, k: 0 }, lab: { l: 42, a: 70, b: 5 } }],
  ['PANTONE Rhodamine Red C', { cmyk: { c: 0.02, m: 0.95, y: 0, k: 0 }, lab: { l: 48, a: 75, b: -15 } }],
  ['PANTONE Violet C', { cmyk: { c: 0.75, m: 0.95, y: 0, k: 0 }, lab: { l: 28, a: 45, b: -55 } }],
])

/**
 * Color Extractor class
 * Analyzes PDF content for color information
 */
export class ColorExtractor {
  private spotColors: Map<string, SpotColorInfo> = new Map()
  private processColorsUsed: Set<string> = new Set()
  
  /**
   * Extract spot colors from a PDF page
   */
  async extractSpotColors(
    page: PDFPageProxy,
    operatorList: { fnArray: number[]; argsArray: unknown[][] }
  ): Promise<SpotColorInfo[]> {
    this.spotColors.clear()
    this.processColorsUsed.clear()
    
    // Analyze operator list for color operations
    const OPS_CODES = {
      setFillColorSpace: 85,      // cs
      setStrokeColorSpace: 86,    // CS
      setFillColor: 87,           // sc/scn
      setStrokeColor: 88,         // SC/SCN
      setFillGray: 89,            // g
      setStrokeGray: 90,          // G
      setFillRGBColor: 91,        // rg
      setStrokeRGBColor: 92,      // RG
      setFillCMYKColor: 93,       // k
      setStrokeCMYKColor: 94,     // K
    }
    
    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const op = operatorList.fnArray[i]
      const args = operatorList.argsArray[i]
      
      // Check for color space operations
      if (op === OPS_CODES.setFillColorSpace || op === OPS_CODES.setStrokeColorSpace) {
        await this.processColorSpace(args, page)
      }
      
      // Track process color usage
      if (op === OPS_CODES.setFillCMYKColor || op === OPS_CODES.setStrokeCMYKColor) {
        this.processColorsUsed.add('CMYK')
      }
      if (op === OPS_CODES.setFillRGBColor || op === OPS_CODES.setStrokeRGBColor) {
        this.processColorsUsed.add('RGB')
      }
      if (op === OPS_CODES.setFillGray || op === OPS_CODES.setStrokeGray) {
        this.processColorsUsed.add('Gray')
      }
    }
    
    return Array.from(this.spotColors.values())
  }
  
  /**
   * Process color space definition
   */
  private async processColorSpace(
    args: unknown[],
    page: PDFPageProxy
  ): Promise<void> {
    if (!args || args.length === 0) return
    
    const colorSpaceName = args[0]
    
    // Check if it's a named color space (Separation or DeviceN)
    if (typeof colorSpaceName === 'string') {
      // Try to get color space definition from page resources
      // This is a simplified approach - full implementation would parse PDF resources
      
      if (colorSpaceName.startsWith('CS') || colorSpaceName.startsWith('cs')) {
        // Named color space reference
        await this.extractNamedColorSpace(colorSpaceName, page)
      }
    } else if (Array.isArray(colorSpaceName)) {
      // Inline color space definition
      await this.parseColorSpaceArray(colorSpaceName)
    }
  }
  
  /**
   * Extract named color space from page resources
   */
  private async extractNamedColorSpace(
    name: string,
    page: PDFPageProxy
  ): Promise<void> {
    // In a full implementation, we would access page.commonObjs or page.objs
    // to get the color space definition
    // For now, we'll use a simplified approach
  }
  
  /**
   * Parse color space array definition
   */
  private async parseColorSpaceArray(csArray: unknown[]): Promise<void> {
    if (csArray.length < 2) return
    
    const csType = csArray[0] as string
    
    if (csType === 'Separation') {
      // Separation color space: [/Separation /ColorName /AlternateSpace tintTransform]
      const colorName = csArray[1] as string
      const alternateSpace = csArray[2]
      
      this.addSpotColor(colorName, alternateSpace)
      
    } else if (csType === 'DeviceN') {
      // DeviceN color space: [/DeviceN [/Color1 /Color2 ...] /AlternateSpace tintTransform attributes]
      const colorNames = csArray[1] as string[]
      const alternateSpace = csArray[2]
      
      for (const name of colorNames) {
        if (!this.isProcessColorName(name)) {
          this.addSpotColor(name, alternateSpace)
        }
      }
    }
  }
  
  /**
   * Check if color name is a process color
   */
  private isProcessColorName(name: string): boolean {
    const processNames = ['Cyan', 'Magenta', 'Yellow', 'Black', 'None', 'All']
    return processNames.includes(name)
  }
  
  /**
   * Add spot color to collection
   */
  private addSpotColor(name: string, alternateSpace: unknown): void {
    if (this.spotColors.has(name)) {
      // Update usage count
      const existing = this.spotColors.get(name)!
      existing.usageCount++
      return
    }
    
    // Determine color type from name
    const colorType = this.detectColorType(name)
    
    // Create CMYK fallback (would be extracted from tint transform in full implementation)
    const cmykFallback = this.estimateCMYKFallback(name)
    
    // Try to match to Pantone library
    const libraryMatch = this.matchToLibrary(name, cmykFallback)
    
    const spotColor: SpotColorInfo = {
      name: this.normalizeColorName(name),
      originalName: name,
      alternateSpace: 'CMYK',
      cmykFallback,
      libraryMatch,
      usageCount: 1,
      usedInLayers: [],
      usedInObjects: [],
      printOrder: this.spotColors.size + 4, // After CMYK
      isProcessColor: false,
      colorType
    }
    
    this.spotColors.set(name, spotColor)
  }
  
  /**
   * Detect color type from name
   */
  private detectColorType(name: string): SpotColorType {
    const lowerName = name.toLowerCase()
    
    if (lowerName.includes('white') || lowerName === 'white') {
      return 'WHITE'
    }
    if (lowerName.includes('varnish') || lowerName.includes('coating') || lowerName.includes('uv')) {
      return 'VARNISH'
    }
    if (lowerName.includes('silver') || lowerName.includes('gold') || lowerName.includes('metallic')) {
      return 'METALLIC'
    }
    if (lowerName.includes('fluor') || lowerName.includes('neon')) {
      return 'FLUORESCENT'
    }
    if (lowerName.includes('dieline') || lowerName.includes('die') || lowerName.includes('cut')) {
      return 'DIELINE'
    }
    if (lowerName.includes('registration') || lowerName === 'all') {
      return 'TECHNICAL'
    }
    if (lowerName.includes('opaque')) {
      return 'OPAQUE'
    }
    if (lowerName.includes('clear') || lowerName.includes('transparent')) {
      return 'TRANSPARENT'
    }
    
    return 'STANDARD'
  }
  
  /**
   * Normalize color name
   */
  private normalizeColorName(name: string): string {
    // Remove common prefixes/suffixes
    let normalized = name
      .replace(/^\//, '')
      .replace(/\s+/g, ' ')
      .trim()
    
    // Normalize Pantone names
    if (normalized.toUpperCase().includes('PANTONE')) {
      normalized = normalized
        .replace(/pantone/gi, 'PANTONE')
        .replace(/\s+C$/i, ' C')
        .replace(/\s+U$/i, ' U')
        .replace(/\s+M$/i, ' M')
    }
    
    return normalized
  }
  
  /**
   * Estimate CMYK fallback for spot color
   */
  private estimateCMYKFallback(name: string): CMYKValues {
    // Check Pantone library first
    const pantoneMatch = Array.from(PANTONE_COLORS.entries())
      .find(([key]) => name.toUpperCase().includes(key.toUpperCase().replace('PANTONE ', '')))
    
    if (pantoneMatch) {
      return pantoneMatch[1].cmyk
    }
    
    // Default fallbacks based on color type
    const lowerName = name.toLowerCase()
    
    if (lowerName.includes('white')) {
      return { c: 0, m: 0, y: 0, k: 0 }
    }
    if (lowerName.includes('black')) {
      return { c: 0, m: 0, y: 0, k: 1 }
    }
    if (lowerName.includes('red')) {
      return { c: 0, m: 1, y: 1, k: 0 }
    }
    if (lowerName.includes('blue')) {
      return { c: 1, m: 0.7, y: 0, k: 0 }
    }
    if (lowerName.includes('green')) {
      return { c: 1, m: 0, y: 1, k: 0 }
    }
    if (lowerName.includes('yellow')) {
      return { c: 0, m: 0, y: 1, k: 0 }
    }
    if (lowerName.includes('orange')) {
      return { c: 0, m: 0.5, y: 1, k: 0 }
    }
    if (lowerName.includes('purple') || lowerName.includes('violet')) {
      return { c: 0.5, m: 1, y: 0, k: 0 }
    }
    if (lowerName.includes('gold')) {
      return { c: 0, m: 0.2, y: 0.8, k: 0.1 }
    }
    if (lowerName.includes('silver')) {
      return { c: 0, m: 0, y: 0, k: 0.3 }
    }
    
    // Default gray
    return { c: 0, m: 0, y: 0, k: 0.5 }
  }
  
  /**
   * Match color to library
   */
  private matchToLibrary(name: string, cmyk: CMYKValues): SpotColorLibraryMatch | undefined {
    // Check for exact Pantone match
    for (const [pantoneName, pantoneColor] of PANTONE_COLORS) {
      if (name.toUpperCase().includes(pantoneName.toUpperCase().replace('PANTONE ', ''))) {
        const deltaE = this.calculateDeltaE(cmyk, pantoneColor.cmyk)
        return {
          library: 'PANTONE',
          colorName: pantoneName,
          deltaE,
          isExactMatch: deltaE < 1
        }
      }
    }
    
    // Find closest match
    let closestMatch: SpotColorLibraryMatch | undefined
    let minDeltaE = Infinity
    
    for (const [pantoneName, pantoneColor] of PANTONE_COLORS) {
      const deltaE = this.calculateDeltaE(cmyk, pantoneColor.cmyk)
      if (deltaE < minDeltaE) {
        minDeltaE = deltaE
        closestMatch = {
          library: 'PANTONE',
          colorName: pantoneName,
          deltaE,
          isExactMatch: false
        }
      }
    }
    
    // Only return if reasonably close
    if (closestMatch && minDeltaE < 10) {
      return closestMatch
    }
    
    return undefined
  }
  
  /**
   * Calculate Delta E between two CMYK colors (simplified)
   */
  private calculateDeltaE(cmyk1: CMYKValues, cmyk2: CMYKValues): number {
    // Convert to approximate LAB and calculate Delta E
    // This is a simplified calculation
    const lab1 = this.cmykToApproximateLab(cmyk1)
    const lab2 = this.cmykToApproximateLab(cmyk2)
    
    const dL = lab1.l - lab2.l
    const da = lab1.a - lab2.a
    const db = lab1.b - lab2.b
    
    return Math.sqrt(dL * dL + da * da + db * db)
  }
  
  /**
   * Convert CMYK to approximate LAB
   */
  private cmykToApproximateLab(cmyk: CMYKValues): LABValues {
    // Convert CMYK to RGB first
    const r = 255 * (1 - cmyk.c) * (1 - cmyk.k)
    const g = 255 * (1 - cmyk.m) * (1 - cmyk.k)
    const b = 255 * (1 - cmyk.y) * (1 - cmyk.k)
    
    // Convert RGB to XYZ
    let rn = r / 255
    let gn = g / 255
    let bn = b / 255
    
    rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92
    gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92
    bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92
    
    const x = (rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375) / 0.95047
    const y = (rn * 0.2126729 + gn * 0.7151522 + bn * 0.0721750) / 1.00000
    const z = (rn * 0.0193339 + gn * 0.1191920 + bn * 0.9503041) / 1.08883
    
    // Convert XYZ to LAB
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
   * Analyze object colors
   */
  analyzeObjectColors(
    fillColor: ExtendedColor | undefined,
    strokeColor: ExtendedColor | undefined
  ): ObjectColorAnalysis {
    const fillColors: ExtendedColor[] = fillColor ? [fillColor] : []
    const strokeColors: ExtendedColor[] = strokeColor ? [strokeColor] : []
    const separationsUsed: string[] = []
    
    // Check for rich black
    let isRichBlack = false
    let richBlackComponents: CMYKValues | undefined
    
    if (fillColor?.cmyk) {
      const cmyk = fillColor.cmyk
      if (cmyk.k > 0.9 && (cmyk.c > 0.3 || cmyk.m > 0.3 || cmyk.y > 0.3)) {
        isRichBlack = true
        richBlackComponents = cmyk
      }
    }
    
    // Check for registration color
    let isRegistration = false
    if (fillColor?.cmyk) {
      const cmyk = fillColor.cmyk
      if (cmyk.c === 1 && cmyk.m === 1 && cmyk.y === 1 && cmyk.k === 1) {
        isRegistration = true
      }
    }
    
    // Determine separations used
    if (fillColor?.cmyk || strokeColor?.cmyk) {
      separationsUsed.push('Cyan', 'Magenta', 'Yellow', 'Black')
    }
    if (fillColor?.spot) {
      separationsUsed.push(fillColor.spot.name)
    }
    if (strokeColor?.spot) {
      separationsUsed.push(strokeColor.spot.name)
    }
    
    return {
      fillColors,
      strokeColors,
      separationsUsed: [...new Set(separationsUsed)],
      isRichBlack,
      richBlackComponents,
      isRegistration
    }
  }
  
  /**
   * Get all extracted spot colors
   */
  getSpotColors(): SpotColorInfo[] {
    return Array.from(this.spotColors.values())
  }
  
  /**
   * Get process colors used
   */
  getProcessColorsUsed(): string[] {
    return Array.from(this.processColorsUsed)
  }
  
  /**
   * Check if document uses RGB
   */
  hasRGBContent(): boolean {
    return this.processColorsUsed.has('RGB')
  }
  
  /**
   * Check if document uses spot colors
   */
  hasSpotColors(): boolean {
    return this.spotColors.size > 0
  }
  
  /**
   * Reset extractor state
   */
  reset(): void {
    this.spotColors.clear()
    this.processColorsUsed.clear()
  }
}
