/**
 * GPCS CodeStudio - Overprint Simulator
 * 
 * Simulates overprint and knockout effects for prepress preview
 * Essential for accurate soft-proofing
 */

import type {
  PDFPage,
  PDFObject,
  ExtendedColor,
  CMYKValues,
  BlendMode,
} from '../types/PrepressTypes'

/**
 * Overprint simulation mode
 */
export type OverprintMode = 
  | 'OFF'           // No overprint simulation
  | 'SIMULATE'      // Simulate overprint as it will print
  | 'HIGHLIGHT'     // Highlight overprinting objects

/**
 * Overprint preview options
 */
export interface OverprintPreviewOptions {
  mode: OverprintMode
  highlightColor: string        // Color for highlighting overprint areas
  showKnockouts: boolean        // Show knockout areas
  knockoutColor: string         // Color for knockout highlighting
  paperColor: CMYKValues        // Paper/substrate color
  inkOpacity: Map<string, number>  // Per-ink opacity overrides
}

/**
 * Default overprint preview options
 */
export const DEFAULT_OVERPRINT_OPTIONS: OverprintPreviewOptions = {
  mode: 'SIMULATE',
  highlightColor: 'rgba(0, 255, 0, 0.3)',
  showKnockouts: false,
  knockoutColor: 'rgba(255, 0, 0, 0.3)',
  paperColor: { c: 0, m: 0, y: 0, k: 0 },
  inkOpacity: new Map()
}

/**
 * Overprint analysis result
 */
export interface OverprintAnalysis {
  totalObjects: number
  overprintingObjects: number
  knockoutObjects: number
  potentialIssues: OverprintIssue[]
}

/**
 * Overprint issue
 */
export interface OverprintIssue {
  type: OverprintIssueType
  severity: 'WARNING' | 'ERROR'
  objectId: string
  message: string
  suggestion?: string
}

export type OverprintIssueType = 
  | 'WHITE_OVERPRINT'       // White set to overprint (will disappear)
  | 'LIGHT_ON_DARK'         // Light color overprinting dark (may be invisible)
  | 'SPOT_KNOCKOUT'         // Spot color knocking out process
  | 'RICH_BLACK_KNOCKOUT'   // Rich black not overprinting
  | 'REGISTRATION_ISSUE'    // Potential registration problems

/**
 * Overprint Simulator class
 */
export class OverprintSimulator {
  private currentPage: PDFPage | null = null
  private options: OverprintPreviewOptions = DEFAULT_OVERPRINT_OPTIONS
  
  /**
   * Set simulation options
   */
  setOptions(options: Partial<OverprintPreviewOptions>): void {
    this.options = { ...this.options, ...options }
  }
  
  /**
   * Analyze page for overprint issues
   */
  analyzeOverprint(page: PDFPage): OverprintAnalysis {
    this.currentPage = page
    
    const analysis: OverprintAnalysis = {
      totalObjects: page.objects.length,
      overprintingObjects: 0,
      knockoutObjects: 0,
      potentialIssues: []
    }
    
    for (const obj of page.objects) {
      if (obj.overprint) {
        analysis.overprintingObjects++
        
        // Check for issues
        const issues = this.checkOverprintIssues(obj)
        analysis.potentialIssues.push(...issues)
      } else {
        analysis.knockoutObjects++
      }
    }
    
    return analysis
  }
  
  /**
   * Check object for overprint issues
   */
  private checkOverprintIssues(obj: PDFObject): OverprintIssue[] {
    const issues: OverprintIssue[] = []
    
    // Check for white overprint
    if (this.isWhiteColor(obj.fillColor) && obj.overprint) {
      issues.push({
        type: 'WHITE_OVERPRINT',
        severity: 'ERROR',
        objectId: obj.id,
        message: 'White color set to overprint will disappear when printed',
        suggestion: 'Set white objects to knockout or use opaque white ink'
      })
    }
    
    // Check for light color overprinting (potential visibility issue)
    if (obj.fillColor && this.isLightColor(obj.fillColor) && obj.overprint) {
      issues.push({
        type: 'LIGHT_ON_DARK',
        severity: 'WARNING',
        objectId: obj.id,
        message: 'Light color set to overprint may not be visible on dark backgrounds',
        suggestion: 'Consider using knockout for better visibility'
      })
    }
    
    // Check for rich black not overprinting
    if (this.isRichBlack(obj.fillColor) && !obj.overprint) {
      issues.push({
        type: 'RICH_BLACK_KNOCKOUT',
        severity: 'WARNING',
        objectId: obj.id,
        message: 'Rich black with knockout may show registration issues',
        suggestion: 'Consider setting CMY components to overprint'
      })
    }
    
    return issues
  }
  
  /**
   * Check if color is white
   */
  private isWhiteColor(color: ExtendedColor | undefined): boolean {
    if (!color) return false
    
    if (color.cmyk) {
      return color.cmyk.c === 0 && color.cmyk.m === 0 && 
             color.cmyk.y === 0 && color.cmyk.k === 0
    }
    
    if (color.rgb) {
      return color.rgb.r >= 0.99 && color.rgb.g >= 0.99 && color.rgb.b >= 0.99
    }
    
    if (color.spot?.name.toLowerCase().includes('white')) {
      return true
    }
    
    return false
  }
  
  /**
   * Check if color is light (high luminance)
   */
  private isLightColor(color: ExtendedColor): boolean {
    if (color.cmyk) {
      const totalInk = color.cmyk.c + color.cmyk.m + color.cmyk.y + color.cmyk.k
      return totalInk < 0.3
    }
    
    if (color.rgb) {
      const luminance = 0.299 * color.rgb.r + 0.587 * color.rgb.g + 0.114 * color.rgb.b
      return luminance > 0.7
    }
    
    return false
  }
  
  /**
   * Check if color is rich black
   */
  private isRichBlack(color: ExtendedColor | undefined): boolean {
    if (!color?.cmyk) return false
    
    const cmyk = color.cmyk
    return cmyk.k > 0.9 && (cmyk.c > 0.3 || cmyk.m > 0.3 || cmyk.y > 0.3)
  }
  
  /**
   * Simulate overprint for rendering
   * Returns the resulting color after overprint simulation
   */
  simulateOverprint(
    foregroundColor: ExtendedColor,
    backgroundColor: ExtendedColor,
    overprint: boolean,
    overprintMode: 0 | 1
  ): ExtendedColor {
    if (!overprint) {
      // Knockout - foreground replaces background
      return foregroundColor
    }
    
    // Overprint - combine colors
    if (foregroundColor.cmyk && backgroundColor.cmyk) {
      return this.simulateCMYKOverprint(
        foregroundColor.cmyk,
        backgroundColor.cmyk,
        overprintMode
      )
    }
    
    // For other color spaces, use multiply blend
    return this.multiplyBlend(foregroundColor, backgroundColor)
  }
  
  /**
   * Simulate CMYK overprint
   */
  private simulateCMYKOverprint(
    fg: CMYKValues,
    bg: CMYKValues,
    overprintMode: 0 | 1
  ): ExtendedColor {
    let resultCmyk: CMYKValues
    
    if (overprintMode === 0) {
      // OPM 0: Replace non-zero components
      resultCmyk = {
        c: fg.c > 0 ? fg.c : bg.c,
        m: fg.m > 0 ? fg.m : bg.m,
        y: fg.y > 0 ? fg.y : bg.y,
        k: fg.k > 0 ? fg.k : bg.k
      }
    } else {
      // OPM 1: Only replace if component is explicitly set
      // In practice, this means combining the colors
      resultCmyk = {
        c: Math.min(1, fg.c + bg.c * (1 - fg.c)),
        m: Math.min(1, fg.m + bg.m * (1 - fg.m)),
        y: Math.min(1, fg.y + bg.y * (1 - fg.y)),
        k: Math.min(1, fg.k + bg.k * (1 - fg.k))
      }
    }
    
    return {
      space: 'DeviceCMYK',
      cmyk: resultCmyk,
      tint: 1,
      alpha: 1
    }
  }
  
  /**
   * Multiply blend for non-CMYK colors
   */
  private multiplyBlend(
    fg: ExtendedColor,
    bg: ExtendedColor
  ): ExtendedColor {
    // Convert both to RGB for blending
    const fgRgb = this.colorToRgb(fg)
    const bgRgb = this.colorToRgb(bg)
    
    return {
      space: 'DeviceRGB',
      rgb: {
        r: fgRgb.r * bgRgb.r,
        g: fgRgb.g * bgRgb.g,
        b: fgRgb.b * bgRgb.b
      },
      tint: 1,
      alpha: 1
    }
  }
  
  /**
   * Convert color to RGB
   */
  private colorToRgb(color: ExtendedColor): { r: number; g: number; b: number } {
    if (color.rgb) {
      return color.rgb
    }
    
    if (color.cmyk) {
      return {
        r: (1 - color.cmyk.c) * (1 - color.cmyk.k),
        g: (1 - color.cmyk.m) * (1 - color.cmyk.k),
        b: (1 - color.cmyk.y) * (1 - color.cmyk.k)
      }
    }
    
    if (color.gray !== undefined) {
      return { r: color.gray, g: color.gray, b: color.gray }
    }
    
    return { r: 1, g: 1, b: 1 }
  }
  
  /**
   * Render overprint preview to canvas
   */
  renderOverprintPreview(
    page: PDFPage,
    canvas: HTMLCanvasElement,
    scale: number = 1
  ): void {
    this.currentPage = page
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size
    canvas.width = page.mediaBox.width * scale
    canvas.height = page.mediaBox.height * scale
    
    // Fill with paper color
    const paperRgb = this.cmykToRgb(this.options.paperColor)
    ctx.fillStyle = `rgb(${paperRgb.r * 255}, ${paperRgb.g * 255}, ${paperRgb.b * 255})`
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Sort objects by z-index
    const sortedObjects = [...page.objects].sort((a, b) => {
      // Objects with lower z-index render first
      return (a.bounds.y + a.bounds.height) - (b.bounds.y + b.bounds.height)
    })
    
    // Render each object with overprint simulation
    for (const obj of sortedObjects) {
      this.renderObjectWithOverprint(ctx, obj, scale)
    }
    
    // Highlight overprint areas if in highlight mode
    if (this.options.mode === 'HIGHLIGHT') {
      this.renderOverprintHighlights(ctx, page, scale)
    }
  }
  
  /**
   * Render single object with overprint
   */
  private renderObjectWithOverprint(
    ctx: CanvasRenderingContext2D,
    obj: PDFObject,
    scale: number
  ): void {
    if (!obj.fillColor && !obj.strokeColor) return
    
    const x = obj.bounds.x * scale
    const y = (this.currentPage!.mediaBox.height - obj.bounds.y - obj.bounds.height) * scale
    const width = obj.bounds.width * scale
    const height = obj.bounds.height * scale
    
    // Set blend mode based on overprint
    if (obj.overprint && this.options.mode === 'SIMULATE') {
      ctx.globalCompositeOperation = 'multiply'
    } else {
      ctx.globalCompositeOperation = 'source-over'
    }
    
    // Set opacity
    ctx.globalAlpha = obj.opacity
    
    // Render fill
    if (obj.fillColor) {
      const rgb = this.colorToRgb(obj.fillColor)
      ctx.fillStyle = `rgb(${rgb.r * 255}, ${rgb.g * 255}, ${rgb.b * 255})`
      ctx.fillRect(x, y, width, height)
    }
    
    // Render stroke
    if (obj.strokeColor && obj.strokeWidth) {
      const rgb = this.colorToRgb(obj.strokeColor)
      ctx.strokeStyle = `rgb(${rgb.r * 255}, ${rgb.g * 255}, ${rgb.b * 255})`
      ctx.lineWidth = obj.strokeWidth * scale
      ctx.strokeRect(x, y, width, height)
    }
    
    // Reset
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }
  
  /**
   * Render overprint highlights
   */
  private renderOverprintHighlights(
    ctx: CanvasRenderingContext2D,
    page: PDFPage,
    scale: number
  ): void {
    for (const obj of page.objects) {
      const x = obj.bounds.x * scale
      const y = (page.mediaBox.height - obj.bounds.y - obj.bounds.height) * scale
      const width = obj.bounds.width * scale
      const height = obj.bounds.height * scale
      
      if (obj.overprint) {
        ctx.fillStyle = this.options.highlightColor
        ctx.fillRect(x, y, width, height)
      } else if (this.options.showKnockouts) {
        ctx.fillStyle = this.options.knockoutColor
        ctx.fillRect(x, y, width, height)
      }
    }
  }
  
  /**
   * Convert CMYK to RGB
   */
  private cmykToRgb(cmyk: CMYKValues): { r: number; g: number; b: number } {
    return {
      r: (1 - cmyk.c) * (1 - cmyk.k),
      g: (1 - cmyk.m) * (1 - cmyk.k),
      b: (1 - cmyk.y) * (1 - cmyk.k)
    }
  }
  
  /**
   * Get objects with overprint
   */
  getOverprintingObjects(page: PDFPage): PDFObject[] {
    return page.objects.filter(obj => obj.overprint)
  }
  
  /**
   * Get objects with knockout
   */
  getKnockoutObjects(page: PDFPage): PDFObject[] {
    return page.objects.filter(obj => !obj.overprint)
  }
  
  /**
   * Toggle overprint for object
   */
  toggleOverprint(obj: PDFObject): void {
    obj.overprint = !obj.overprint
    obj.knockout = !obj.overprint
  }
  
  /**
   * Set all black to overprint
   */
  setBlackToOverprint(page: PDFPage, threshold: number = 0.95): number {
    let count = 0
    
    for (const obj of page.objects) {
      if (obj.fillColor?.cmyk) {
        const k = obj.fillColor.cmyk.k
        const isBlackOnly = obj.fillColor.cmyk.c === 0 && 
                           obj.fillColor.cmyk.m === 0 && 
                           obj.fillColor.cmyk.y === 0
        
        if (k >= threshold && isBlackOnly && !obj.overprint) {
          obj.overprint = true
          obj.knockout = false
          count++
        }
      }
    }
    
    return count
  }
  
  /**
   * Reset all overprint to knockout
   */
  resetAllToKnockout(page: PDFPage): void {
    for (const obj of page.objects) {
      obj.overprint = false
      obj.knockout = true
    }
  }
}

// Export singleton
export const overprintSimulator = new OverprintSimulator()
