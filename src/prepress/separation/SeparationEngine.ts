/**
 * GPCS CodeStudio - Separation Engine
 * 
 * Generates and manages color separations for prepress
 * Supports CMYK process colors and spot colors
 */

import type {
  PDFPage,
  PDFObject,
  SeparationInfo,
  SpotColorInfo,
  ExtendedColor,
  CMYKValues,
  BoundingBox,
} from '../types/PrepressTypes'

/**
 * Separation render options
 */
export interface SeparationRenderOptions {
  resolution: number          // DPI
  showPositive: boolean       // True = positive, False = negative
  showDots: boolean           // Show halftone dots simulation
  dotShape: 'round' | 'ellipse' | 'square' | 'line'
  screenAngle?: number        // Override screen angle
  lpi?: number                // Lines per inch
}

/**
 * Default separation render options
 */
export const DEFAULT_SEPARATION_OPTIONS: SeparationRenderOptions = {
  resolution: 150,
  showPositive: true,
  showDots: false,
  dotShape: 'round',
  lpi: 150
}

/**
 * Standard screen angles for CMYK
 */
export const SCREEN_ANGLES = {
  C: 15,
  M: 75,
  Y: 0,
  K: 45
}

/**
 * Separation Engine class
 */
export class SeparationEngine {
  private separations: Map<string, SeparationData> = new Map()
  private currentPage: PDFPage | null = null
  
  /**
   * Generate separations for a page
   */
  generateSeparations(page: PDFPage): SeparationInfo[] {
    this.currentPage = page
    this.separations.clear()
    
    // Initialize process color separations
    this.initializeProcessSeparations()
    
    // Add spot color separations
    for (const spotColor of page.spotColors) {
      this.addSpotSeparation(spotColor)
    }
    
    // Analyze objects and assign to separations
    for (const obj of page.objects) {
      this.analyzeObjectSeparations(obj)
    }
    
    // Calculate coverage for each separation
    this.calculateCoverage()
    
    return this.getSeparationInfos()
  }
  
  /**
   * Initialize CMYK process separations
   */
  private initializeProcessSeparations(): void {
    const processColors: Array<{ name: string; key: 'C' | 'M' | 'Y' | 'K'; density: number }> = [
      { name: 'Cyan', key: 'C', density: 1.0 },
      { name: 'Magenta', key: 'M', density: 1.0 },
      { name: 'Yellow', key: 'Y', density: 0.9 },
      { name: 'Black', key: 'K', density: 1.8 }
    ]
    
    for (let i = 0; i < processColors.length; i++) {
      const pc = processColors[i]
      this.separations.set(pc.name, {
        name: pc.name,
        type: 'PROCESS',
        processColor: pc.key,
        inkDensity: pc.density,
        inkSequence: i,
        isOpaque: false,
        screenAngle: SCREEN_ANGLES[pc.key],
        objects: [],
        coverageData: new Float32Array(0),
        totalCoverage: 0,
        maxCoverage: 0,
        averageCoverage: 0
      })
    }
  }
  
  /**
   * Add spot color separation
   */
  private addSpotSeparation(spotColor: SpotColorInfo): void {
    const isOpaque = spotColor.colorType === 'WHITE' || 
                     spotColor.colorType === 'OPAQUE' ||
                     spotColor.colorType === 'METALLIC'
    
    // Determine screen angle for spot
    // Typically use angle that doesn't conflict with process colors
    const screenAngle = this.calculateSpotScreenAngle(this.separations.size)
    
    this.separations.set(spotColor.name, {
      name: spotColor.name,
      type: 'SPOT',
      spotColorInfo: spotColor,
      inkDensity: 1.0,
      inkSequence: this.separations.size,
      isOpaque,
      screenAngle,
      objects: [],
      coverageData: new Float32Array(0),
      totalCoverage: 0,
      maxCoverage: 0,
      averageCoverage: 0
    })
  }
  
  /**
   * Calculate screen angle for spot color
   */
  private calculateSpotScreenAngle(index: number): number {
    // Avoid angles used by CMYK
    const usedAngles = [0, 15, 45, 75]
    const availableAngles = [22.5, 37.5, 52.5, 67.5, 82.5]
    return availableAngles[index % availableAngles.length]
  }
  
  /**
   * Analyze object and assign to separations
   */
  private analyzeObjectSeparations(obj: PDFObject): void {
    // Analyze fill color
    if (obj.fillColor) {
      this.assignColorToSeparations(obj, obj.fillColor, 'fill')
    }
    
    // Analyze stroke color
    if (obj.strokeColor) {
      this.assignColorToSeparations(obj, obj.strokeColor, 'stroke')
    }
  }
  
  /**
   * Assign color to appropriate separations
   */
  private assignColorToSeparations(
    obj: PDFObject,
    color: ExtendedColor,
    source: 'fill' | 'stroke'
  ): void {
    if (color.space === 'DeviceCMYK' && color.cmyk) {
      // Assign to process separations
      if (color.cmyk.c > 0) {
        this.addObjectToSeparation('Cyan', obj, color.cmyk.c)
      }
      if (color.cmyk.m > 0) {
        this.addObjectToSeparation('Magenta', obj, color.cmyk.m)
      }
      if (color.cmyk.y > 0) {
        this.addObjectToSeparation('Yellow', obj, color.cmyk.y)
      }
      if (color.cmyk.k > 0) {
        this.addObjectToSeparation('Black', obj, color.cmyk.k)
      }
    } else if (color.space === 'Separation' && color.spot) {
      // Assign to spot separation
      this.addObjectToSeparation(color.spot.name, obj, color.tint)
    } else if (color.space === 'DeviceGray' && color.gray !== undefined) {
      // Gray maps to Black
      if (color.gray < 1) {
        this.addObjectToSeparation('Black', obj, 1 - color.gray)
      }
    } else if (color.space === 'DeviceRGB' && color.rgb) {
      // Convert RGB to CMYK and assign
      const cmyk = this.rgbToCmyk(color.rgb.r, color.rgb.g, color.rgb.b)
      if (cmyk.c > 0) this.addObjectToSeparation('Cyan', obj, cmyk.c)
      if (cmyk.m > 0) this.addObjectToSeparation('Magenta', obj, cmyk.m)
      if (cmyk.y > 0) this.addObjectToSeparation('Yellow', obj, cmyk.y)
      if (cmyk.k > 0) this.addObjectToSeparation('Black', obj, cmyk.k)
    }
  }
  
  /**
   * Add object to separation
   */
  private addObjectToSeparation(
    separationName: string,
    obj: PDFObject,
    tint: number
  ): void {
    const separation = this.separations.get(separationName)
    if (separation) {
      separation.objects.push({
        objectId: obj.id,
        tint,
        bounds: obj.bounds,
        overprint: obj.overprint
      })
    }
  }
  
  /**
   * Convert RGB to CMYK
   */
  private rgbToCmyk(r: number, g: number, b: number): CMYKValues {
    const k = 1 - Math.max(r, g, b)
    
    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 1 }
    }
    
    return {
      c: (1 - r - k) / (1 - k),
      m: (1 - g - k) / (1 - k),
      y: (1 - b - k) / (1 - k),
      k
    }
  }
  
  /**
   * Calculate coverage for all separations
   */
  private calculateCoverage(): void {
    if (!this.currentPage) return
    
    const pageArea = this.currentPage.mediaBox.width * this.currentPage.mediaBox.height
    
    for (const separation of this.separations.values()) {
      let totalInkArea = 0
      let maxTint = 0
      let tintSum = 0
      let tintCount = 0
      
      for (const objRef of separation.objects) {
        const objArea = objRef.bounds.width * objRef.bounds.height
        totalInkArea += objArea * objRef.tint
        maxTint = Math.max(maxTint, objRef.tint)
        tintSum += objRef.tint
        tintCount++
      }
      
      separation.totalCoverage = (totalInkArea / pageArea) * 100
      separation.maxCoverage = maxTint * 100
      separation.averageCoverage = tintCount > 0 ? (tintSum / tintCount) * 100 : 0
    }
  }
  
  /**
   * Get separation infos
   */
  private getSeparationInfos(): SeparationInfo[] {
    return Array.from(this.separations.values()).map(sep => ({
      name: sep.name,
      type: sep.type,
      processColor: sep.processColor,
      spotColorInfo: sep.spotColorInfo,
      inkDensity: sep.inkDensity,
      inkSequence: sep.inkSequence,
      isOpaque: sep.isOpaque,
      coverage: sep.totalCoverage,
      maxCoverage: sep.maxCoverage,
      averageCoverage: sep.averageCoverage,
      objectCount: sep.objects.length,
      objectIds: sep.objects.map(o => o.objectId)
    }))
  }
  
  /**
   * Render separation to canvas
   */
  renderSeparation(
    separationName: string,
    canvas: HTMLCanvasElement,
    options: Partial<SeparationRenderOptions> = {}
  ): void {
    const opts = { ...DEFAULT_SEPARATION_OPTIONS, ...options }
    const separation = this.separations.get(separationName)
    
    if (!separation || !this.currentPage) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size based on page and resolution
    const scale = opts.resolution / 72 // PDF points to pixels
    canvas.width = this.currentPage.mediaBox.width * scale
    canvas.height = this.currentPage.mediaBox.height * scale
    
    // Clear canvas
    ctx.fillStyle = opts.showPositive ? '#ffffff' : '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Get separation color for display
    const displayColor = this.getSeparationDisplayColor(separation)
    
    // Render each object in this separation
    for (const objRef of separation.objects) {
      const alpha = objRef.tint
      
      if (opts.showPositive) {
        ctx.fillStyle = `rgba(${displayColor.r}, ${displayColor.g}, ${displayColor.b}, ${alpha})`
      } else {
        // Negative - invert
        const invAlpha = 1 - alpha
        ctx.fillStyle = `rgba(255, 255, 255, ${invAlpha})`
      }
      
      // Draw object bounds (simplified - full implementation would render actual paths)
      ctx.fillRect(
        objRef.bounds.x * scale,
        (this.currentPage.mediaBox.height - objRef.bounds.y - objRef.bounds.height) * scale,
        objRef.bounds.width * scale,
        objRef.bounds.height * scale
      )
    }
    
    // Apply halftone dots if requested
    if (opts.showDots && opts.lpi) {
      this.applyHalftoneEffect(ctx, canvas.width, canvas.height, separation.screenAngle || 45, opts.lpi, opts.dotShape)
    }
  }
  
  /**
   * Get display color for separation
   */
  private getSeparationDisplayColor(separation: SeparationData): { r: number; g: number; b: number } {
    if (separation.type === 'PROCESS') {
      switch (separation.processColor) {
        case 'C': return { r: 0, g: 174, b: 239 }
        case 'M': return { r: 236, g: 0, b: 140 }
        case 'Y': return { r: 255, g: 242, b: 0 }
        case 'K': return { r: 0, g: 0, b: 0 }
      }
    }
    
    // For spot colors, use CMYK fallback converted to RGB
    if (separation.spotColorInfo?.cmykFallback) {
      const cmyk = separation.spotColorInfo.cmykFallback
      return {
        r: Math.round(255 * (1 - cmyk.c) * (1 - cmyk.k)),
        g: Math.round(255 * (1 - cmyk.m) * (1 - cmyk.k)),
        b: Math.round(255 * (1 - cmyk.y) * (1 - cmyk.k))
      }
    }
    
    return { r: 128, g: 128, b: 128 }
  }
  
  /**
   * Apply halftone dot effect
   */
  private applyHalftoneEffect(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    angle: number,
    lpi: number,
    dotShape: 'round' | 'ellipse' | 'square' | 'line'
  ): void {
    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    
    // Calculate dot spacing
    const dpi = 150 // Assume 150 DPI for preview
    const dotSpacing = dpi / lpi
    
    // Create halftone pattern
    const angleRad = (angle * Math.PI) / 180
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)
    
    // Clear and redraw with dots
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    
    for (let y = 0; y < height; y += dotSpacing) {
      for (let x = 0; x < width; x += dotSpacing) {
        // Get average value in cell
        const cellValue = this.getCellAverageValue(data, width, x, y, dotSpacing)
        
        if (cellValue > 0.02) {
          // Calculate dot size based on value
          const dotRadius = (dotSpacing / 2) * Math.sqrt(cellValue)
          
          // Rotate position
          const rx = x * cos - y * sin
          const ry = x * sin + y * cos
          
          ctx.beginPath()
          
          switch (dotShape) {
            case 'round':
              ctx.arc(x + dotSpacing / 2, y + dotSpacing / 2, dotRadius, 0, Math.PI * 2)
              break
            case 'ellipse':
              ctx.ellipse(x + dotSpacing / 2, y + dotSpacing / 2, dotRadius, dotRadius * 0.7, angleRad, 0, Math.PI * 2)
              break
            case 'square':
              const size = dotRadius * 1.5
              ctx.rect(x + (dotSpacing - size) / 2, y + (dotSpacing - size) / 2, size, size)
              break
            case 'line':
              ctx.rect(x, y + (dotSpacing - dotRadius) / 2, dotSpacing, dotRadius)
              break
          }
          
          ctx.fillStyle = '#000000'
          ctx.fill()
        }
      }
    }
  }
  
  /**
   * Get average value in cell
   */
  private getCellAverageValue(
    data: Uint8ClampedArray,
    width: number,
    startX: number,
    startY: number,
    cellSize: number
  ): number {
    let sum = 0
    let count = 0
    
    for (let y = startY; y < startY + cellSize && y < data.length / (width * 4); y++) {
      for (let x = startX; x < startX + cellSize && x < width; x++) {
        const idx = (Math.floor(y) * width + Math.floor(x)) * 4
        // Convert to grayscale and invert (darker = more ink)
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        sum += 1 - (gray / 255)
        count++
      }
    }
    
    return count > 0 ? sum / count : 0
  }
  
  /**
   * Get all separation names
   */
  getSeparationNames(): string[] {
    return Array.from(this.separations.keys())
  }
  
  /**
   * Get separation data
   */
  getSeparation(name: string): SeparationData | undefined {
    return this.separations.get(name)
  }
  
  /**
   * Check if separation exists
   */
  hasSeparation(name: string): boolean {
    return this.separations.has(name)
  }
  
  /**
   * Get process separations
   */
  getProcessSeparations(): SeparationData[] {
    return Array.from(this.separations.values()).filter(s => s.type === 'PROCESS')
  }
  
  /**
   * Get spot separations
   */
  getSpotSeparations(): SeparationData[] {
    return Array.from(this.separations.values()).filter(s => s.type === 'SPOT')
  }
  
  /**
   * Reorder separations
   */
  reorderSeparations(order: string[]): void {
    order.forEach((name, index) => {
      const sep = this.separations.get(name)
      if (sep) {
        sep.inkSequence = index
      }
    })
  }
  
  /**
   * Reset engine
   */
  reset(): void {
    this.separations.clear()
    this.currentPage = null
  }
}

/**
 * Internal separation data
 */
interface SeparationData {
  name: string
  type: 'PROCESS' | 'SPOT'
  processColor?: 'C' | 'M' | 'Y' | 'K'
  spotColorInfo?: SpotColorInfo
  inkDensity: number
  inkSequence: number
  isOpaque: boolean
  screenAngle: number
  objects: SeparationObjectRef[]
  coverageData: Float32Array
  totalCoverage: number
  maxCoverage: number
  averageCoverage: number
}

/**
 * Object reference in separation
 */
interface SeparationObjectRef {
  objectId: string
  tint: number
  bounds: BoundingBox
  overprint: boolean
}

// Export singleton
export const separationEngine = new SeparationEngine()
