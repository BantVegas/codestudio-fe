/**
 * GPCS CodeStudio - PDF Document Model
 * 
 * Central document model for prepress workflow
 * Manages document state, pages, and analysis results
 */

import type {
  PDFDocumentInfo,
  PDFPage,
  PDFLayer,
  PDFObject,
  SpotColorInfo,
  SeparationInfo,
  InkCoverageResult,
  PreflightResult,
  ExtendedColor,
  CMYKValues,
} from '../types/PrepressTypes'

/**
 * Document state for undo/redo
 */
interface DocumentState {
  timestamp: Date
  description: string
  pages: PDFPage[]
}

/**
 * PDF Document Model
 * Central class for managing PDF document data
 */
export class PDFDocumentModel {
  private documentInfo: PDFDocumentInfo | null = null
  private pages: Map<number, PDFPage> = new Map()
  private allSpotColors: Map<string, SpotColorInfo> = new Map()
  private allSeparations: Map<string, SeparationInfo> = new Map()
  private preflightResults: PreflightResult | null = null
  
  // Undo/redo
  private undoStack: DocumentState[] = []
  private redoStack: DocumentState[] = []
  private maxUndoStates = 50
  
  // Event listeners
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()
  
  /**
   * Initialize document from import result
   */
  initializeFromImport(
    documentInfo: PDFDocumentInfo,
    pages: PDFPage[]
  ): void {
    this.documentInfo = documentInfo
    this.pages.clear()
    this.allSpotColors.clear()
    this.allSeparations.clear()
    
    for (const page of pages) {
      this.pages.set(page.pageNumber, page)
      
      // Collect spot colors
      for (const spot of page.spotColors) {
        if (!this.allSpotColors.has(spot.name)) {
          this.allSpotColors.set(spot.name, spot)
        } else {
          // Update usage count
          const existing = this.allSpotColors.get(spot.name)!
          existing.usageCount += spot.usageCount
        }
      }
      
      // Collect separations
      for (const sep of page.separations) {
        if (!this.allSeparations.has(sep.name)) {
          this.allSeparations.set(sep.name, sep)
        }
      }
    }
    
    this.emit('documentLoaded', this.documentInfo)
  }
  
  /**
   * Get document info
   */
  getDocumentInfo(): PDFDocumentInfo | null {
    return this.documentInfo
  }
  
  /**
   * Get page by number
   */
  getPage(pageNumber: number): PDFPage | undefined {
    return this.pages.get(pageNumber)
  }
  
  /**
   * Get all pages
   */
  getAllPages(): PDFPage[] {
    return Array.from(this.pages.values()).sort((a, b) => a.pageNumber - b.pageNumber)
  }
  
  /**
   * Get page count
   */
  getPageCount(): number {
    return this.pages.size
  }
  
  /**
   * Get all spot colors in document
   */
  getAllSpotColors(): SpotColorInfo[] {
    return Array.from(this.allSpotColors.values())
  }
  
  /**
   * Get spot color by name
   */
  getSpotColor(name: string): SpotColorInfo | undefined {
    return this.allSpotColors.get(name)
  }
  
  /**
   * Get all separations
   */
  getAllSeparations(): SeparationInfo[] {
    return Array.from(this.allSeparations.values())
  }
  
  /**
   * Get separation by name
   */
  getSeparation(name: string): SeparationInfo | undefined {
    return this.allSeparations.get(name)
  }
  
  /**
   * Get objects from page
   */
  getPageObjects(pageNumber: number): PDFObject[] {
    const page = this.pages.get(pageNumber)
    return page?.objects || []
  }
  
  /**
   * Get layers from page
   */
  getPageLayers(pageNumber: number): PDFLayer[] {
    const page = this.pages.get(pageNumber)
    return page?.layers || []
  }
  
  /**
   * Update page ink coverage
   */
  updatePageInkCoverage(pageNumber: number, coverage: InkCoverageResult): void {
    const page = this.pages.get(pageNumber)
    if (page) {
      page.inkCoverage = coverage
      this.emit('inkCoverageUpdated', pageNumber, coverage)
    }
  }
  
  /**
   * Set preflight results
   */
  setPreflightResults(results: PreflightResult): void {
    this.preflightResults = results
    this.emit('preflightComplete', results)
  }
  
  /**
   * Get preflight results
   */
  getPreflightResults(): PreflightResult | null {
    return this.preflightResults
  }
  
  /**
   * Find objects by color
   */
  findObjectsByColor(color: ExtendedColor): PDFObject[] {
    const results: PDFObject[] = []
    
    for (const page of this.pages.values()) {
      for (const obj of page.objects) {
        if (this.colorMatches(obj.fillColor, color) || 
            this.colorMatches(obj.strokeColor, color)) {
          results.push(obj)
        }
      }
    }
    
    return results
  }
  
  /**
   * Find objects by spot color name
   */
  findObjectsBySpotColor(spotColorName: string): PDFObject[] {
    const results: PDFObject[] = []
    
    for (const page of this.pages.values()) {
      for (const obj of page.objects) {
        if (obj.fillColor?.spot?.name === spotColorName ||
            obj.strokeColor?.spot?.name === spotColorName) {
          results.push(obj)
        }
      }
    }
    
    return results
  }
  
  /**
   * Check if two colors match
   */
  private colorMatches(color1: ExtendedColor | undefined, color2: ExtendedColor): boolean {
    if (!color1) return false
    
    if (color1.space !== color2.space) return false
    
    if (color1.spot && color2.spot) {
      return color1.spot.name === color2.spot.name
    }
    
    if (color1.cmyk && color2.cmyk) {
      return this.cmykEquals(color1.cmyk, color2.cmyk)
    }
    
    if (color1.rgb && color2.rgb) {
      return color1.rgb.r === color2.rgb.r &&
             color1.rgb.g === color2.rgb.g &&
             color1.rgb.b === color2.rgb.b
    }
    
    return false
  }
  
  /**
   * Check if two CMYK colors are equal
   */
  private cmykEquals(cmyk1: CMYKValues, cmyk2: CMYKValues, tolerance = 0.01): boolean {
    return Math.abs(cmyk1.c - cmyk2.c) < tolerance &&
           Math.abs(cmyk1.m - cmyk2.m) < tolerance &&
           Math.abs(cmyk1.y - cmyk2.y) < tolerance &&
           Math.abs(cmyk1.k - cmyk2.k) < tolerance
  }
  
  /**
   * Get document statistics
   */
  getStatistics(): DocumentStatistics {
    let totalObjects = 0
    let pathCount = 0
    let textCount = 0
    let imageCount = 0
    let shadingCount = 0
    
    for (const page of this.pages.values()) {
      totalObjects += page.objects.length
      for (const obj of page.objects) {
        switch (obj.type) {
          case 'PATH': pathCount++; break
          case 'TEXT': textCount++; break
          case 'IMAGE': imageCount++; break
          case 'SHADING': shadingCount++; break
        }
      }
    }
    
    return {
      pageCount: this.pages.size,
      totalObjects,
      pathCount,
      textCount,
      imageCount,
      shadingCount,
      spotColorCount: this.allSpotColors.size,
      separationCount: this.allSeparations.size,
      hasRGB: this.hasRGBContent(),
      hasTransparency: this.hasTransparency(),
      hasOverprint: this.hasOverprint()
    }
  }
  
  /**
   * Check if document has RGB content
   */
  hasRGBContent(): boolean {
    for (const page of this.pages.values()) {
      for (const obj of page.objects) {
        if (obj.fillColor?.space === 'DeviceRGB' ||
            obj.strokeColor?.space === 'DeviceRGB') {
          return true
        }
      }
    }
    return false
  }
  
  /**
   * Check if document has transparency
   */
  hasTransparency(): boolean {
    for (const page of this.pages.values()) {
      for (const obj of page.objects) {
        if (obj.opacity < 1 || obj.blendMode !== 'Normal') {
          return true
        }
      }
    }
    return false
  }
  
  /**
   * Check if document has overprint
   */
  hasOverprint(): boolean {
    for (const page of this.pages.values()) {
      for (const obj of page.objects) {
        if (obj.overprint) {
          return true
        }
      }
    }
    return false
  }
  
  /**
   * Save state for undo
   */
  saveState(description: string): void {
    const state: DocumentState = {
      timestamp: new Date(),
      description,
      pages: this.clonePages()
    }
    
    this.undoStack.push(state)
    this.redoStack = [] // Clear redo stack
    
    // Limit undo stack size
    if (this.undoStack.length > this.maxUndoStates) {
      this.undoStack.shift()
    }
  }
  
  /**
   * Undo last change
   */
  undo(): boolean {
    if (this.undoStack.length === 0) return false
    
    // Save current state to redo stack
    const currentState: DocumentState = {
      timestamp: new Date(),
      description: 'Current',
      pages: this.clonePages()
    }
    this.redoStack.push(currentState)
    
    // Restore previous state
    const previousState = this.undoStack.pop()!
    this.restoreState(previousState)
    
    this.emit('stateChanged', 'undo')
    return true
  }
  
  /**
   * Redo last undone change
   */
  redo(): boolean {
    if (this.redoStack.length === 0) return false
    
    // Save current state to undo stack
    const currentState: DocumentState = {
      timestamp: new Date(),
      description: 'Current',
      pages: this.clonePages()
    }
    this.undoStack.push(currentState)
    
    // Restore next state
    const nextState = this.redoStack.pop()!
    this.restoreState(nextState)
    
    this.emit('stateChanged', 'redo')
    return true
  }
  
  /**
   * Clone pages for state saving
   */
  private clonePages(): PDFPage[] {
    return Array.from(this.pages.values()).map(page => ({
      ...page,
      layers: [...page.layers],
      objects: [...page.objects],
      separations: [...page.separations],
      spotColors: [...page.spotColors]
    }))
  }
  
  /**
   * Restore state from saved state
   */
  private restoreState(state: DocumentState): void {
    this.pages.clear()
    for (const page of state.pages) {
      this.pages.set(page.pageNumber, page)
    }
  }
  
  /**
   * Add event listener
   */
  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }
  
  /**
   * Remove event listener
   */
  off(event: string, callback: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(callback)
  }
  
  /**
   * Emit event
   */
  private emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach(callback => callback(...args))
  }
  
  /**
   * Clear document
   */
  clear(): void {
    this.documentInfo = null
    this.pages.clear()
    this.allSpotColors.clear()
    this.allSeparations.clear()
    this.preflightResults = null
    this.undoStack = []
    this.redoStack = []
    
    this.emit('documentCleared')
  }
}

/**
 * Document statistics interface
 */
export interface DocumentStatistics {
  pageCount: number
  totalObjects: number
  pathCount: number
  textCount: number
  imageCount: number
  shadingCount: number
  spotColorCount: number
  separationCount: number
  hasRGB: boolean
  hasTransparency: boolean
  hasOverprint: boolean
}

// Export singleton instance
export const pdfDocumentModel = new PDFDocumentModel()
