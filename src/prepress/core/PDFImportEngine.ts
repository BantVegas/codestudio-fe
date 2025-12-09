/**
 * GPCS CodeStudio - PDF Import Engine
 * 
 * Professional PDF parsing and analysis for prepress workflow
 * Uses pdf.js for rendering and custom parsing for prepress data
 */

import * as pdfjsLib from 'pdfjs-dist'
import type {
  PDFDocumentInfo,
  PDFPage,
  PDFImportOptions,
  PDFImportResult,
  PDFImportProgress,
  PDFImportProgressCallback,
  PageBox,
  PDFLayer,
  PDFObject,
  PDFResources,
  SpotColorInfo,
  SeparationInfo,
} from '../types/PrepressTypes'
import { ColorExtractor } from './ColorExtractor'
import { LayerManager } from './LayerManager'
import { ObjectExtractor } from './ObjectExtractor'

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

/**
 * Default import options
 */
export const DEFAULT_IMPORT_OPTIONS: PDFImportOptions = {
  pageRange: 'all',
  analyzeColors: true,
  analyzeFonts: true,
  analyzeImages: true,
  calculateInkCoverage: true,
  generateThumbnails: true,
  thumbnailSize: 256,
  lazyLoadImages: true,
  maxConcurrentPages: 4,
  useEmbeddedProfiles: true,
}

/**
 * PDF Import Engine
 * Main class for importing and analyzing PDF files
 */
export class PDFImportEngine {
  private colorExtractor: ColorExtractor
  private layerManager: LayerManager
  private objectExtractor: ObjectExtractor
  
  private currentDocument: pdfjsLib.PDFDocumentProxy | null = null
  private documentInfo: PDFDocumentInfo | null = null
  private pages: PDFPage[] = []
  
  constructor() {
    this.colorExtractor = new ColorExtractor()
    this.layerManager = new LayerManager()
    this.objectExtractor = new ObjectExtractor()
  }
  
  /**
   * Import PDF from file
   */
  async importFromFile(
    file: File,
    options: Partial<PDFImportOptions> = {},
    onProgress?: PDFImportProgressCallback
  ): Promise<PDFImportResult> {
    const mergedOptions = { ...DEFAULT_IMPORT_OPTIONS, ...options }
    const startTime = performance.now()
    
    try {
      // Phase 1: Load file
      this.reportProgress(onProgress, {
        phase: 'LOADING',
        currentPage: 0,
        totalPages: 0,
        currentTask: 'Loading PDF file...',
        progress: 0
      })
      
      const arrayBuffer = await file.arrayBuffer()
      const loadTime = performance.now() - startTime
      
      // Phase 2: Parse PDF
      this.reportProgress(onProgress, {
        phase: 'PARSING',
        currentPage: 0,
        totalPages: 0,
        currentTask: 'Parsing PDF structure...',
        progress: 10
      })
      
      const parseStart = performance.now()
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
        enableXfa: true,
      })
      
      this.currentDocument = await loadingTask.promise
      const parseTime = performance.now() - parseStart
      
      // Extract document info
      this.documentInfo = await this.extractDocumentInfo(file)
      
      // Phase 3: Analyze pages
      const analyzeStart = performance.now()
      const pageNumbers = this.parsePageRange(mergedOptions.pageRange || 'all', this.currentDocument.numPages)
      
      for (let i = 0; i < pageNumbers.length; i++) {
        const pageNum = pageNumbers[i]
        
        this.reportProgress(onProgress, {
          phase: 'ANALYZING',
          currentPage: pageNum,
          totalPages: this.currentDocument.numPages,
          currentTask: `Analyzing page ${pageNum}...`,
          progress: 20 + (i / pageNumbers.length) * 60,
          partialDocument: this.documentInfo
        })
        
        const page = await this.analyzePage(pageNum, mergedOptions)
        this.pages.push(page)
      }
      
      const analyzeTime = performance.now() - analyzeStart
      
      // Phase 4: Generate thumbnails
      if (mergedOptions.generateThumbnails) {
        this.reportProgress(onProgress, {
          phase: 'RENDERING',
          currentPage: 0,
          totalPages: this.pages.length,
          currentTask: 'Generating thumbnails...',
          progress: 80
        })
        
        await this.generateThumbnails(mergedOptions.thumbnailSize)
      }
      
      // Complete
      const totalTime = performance.now() - startTime
      
      this.reportProgress(onProgress, {
        phase: 'COMPLETE',
        currentPage: this.pages.length,
        totalPages: this.pages.length,
        currentTask: 'Import complete',
        progress: 100
      })
      
      return {
        success: true,
        document: this.documentInfo,
        pages: this.pages,
        loadTime,
        parseTime,
        analyzeTime,
        totalTime
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        errors: [errorMessage],
        loadTime: 0,
        parseTime: 0,
        analyzeTime: 0,
        totalTime: performance.now() - startTime
      }
    }
  }
  
  /**
   * Import PDF from URL
   */
  async importFromUrl(
    url: string,
    options: Partial<PDFImportOptions> = {},
    onProgress?: PDFImportProgressCallback
  ): Promise<PDFImportResult> {
    const mergedOptions = { ...DEFAULT_IMPORT_OPTIONS, ...options }
    const startTime = performance.now()
    
    try {
      this.reportProgress(onProgress, {
        phase: 'LOADING',
        currentPage: 0,
        totalPages: 0,
        currentTask: 'Downloading PDF...',
        progress: 0
      })
      
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const loadTime = performance.now() - startTime
      
      // Create a File-like object
      const filename = url.split('/').pop() || 'document.pdf'
      const file = new File([arrayBuffer], filename, { type: 'application/pdf' })
      
      // Use the file import method
      const result = await this.importFromFile(file, mergedOptions, onProgress)
      result.loadTime = loadTime
      
      return result
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        errors: [errorMessage],
        loadTime: 0,
        parseTime: 0,
        analyzeTime: 0,
        totalTime: performance.now() - startTime
      }
    }
  }
  
  /**
   * Import PDF from ArrayBuffer
   */
  async importFromBuffer(
    buffer: ArrayBuffer,
    filename: string,
    options: Partial<PDFImportOptions> = {},
    onProgress?: PDFImportProgressCallback
  ): Promise<PDFImportResult> {
    const file = new File([buffer], filename, { type: 'application/pdf' })
    return this.importFromFile(file, options, onProgress)
  }
  
  /**
   * Extract document information
   */
  private async extractDocumentInfo(file: File): Promise<PDFDocumentInfo> {
    if (!this.currentDocument) {
      throw new Error('No document loaded')
    }
    
    const metadata = await this.currentDocument.getMetadata()
    const info = metadata.info as Record<string, unknown>
    
    // Extract output intent if present
    let outputIntent = undefined
    try {
      // This would require custom parsing of the PDF catalog
      // For now, we'll leave it undefined
    } catch {
      // Output intent not found
    }
    
    return {
      id: crypto.randomUUID(),
      filename: file.name,
      
      // Metadata
      title: info?.Title as string | undefined,
      author: info?.Author as string | undefined,
      creator: info?.Creator as string | undefined,
      producer: info?.Producer as string | undefined,
      creationDate: info?.CreationDate ? new Date(info.CreationDate as string) : undefined,
      modificationDate: info?.ModDate ? new Date(info.ModDate as string) : undefined,
      
      // PDF specifics
      pdfVersion: metadata.info?.PDFFormatVersion as string || '1.4',
      pageCount: this.currentDocument.numPages,
      isLinearized: false, // Would need custom parsing
      isEncrypted: false,  // Would need custom parsing
      hasXFA: false,       // Would need custom parsing
      
      // Prepress metadata
      trapped: (info?.Trapped as 'True' | 'False' | 'Unknown') || 'Unknown',
      outputIntent,
      
      // File info
      fileSize: file.size,
      loadedAt: new Date()
    }
  }
  
  /**
   * Analyze a single page
   */
  private async analyzePage(
    pageNumber: number,
    options: PDFImportOptions
  ): Promise<PDFPage> {
    if (!this.currentDocument) {
      throw new Error('No document loaded')
    }
    
    const pdfPage = await this.currentDocument.getPage(pageNumber)
    const viewport = pdfPage.getViewport({ scale: 1.0 })
    
    // Get page boxes (convert from points to mm)
    const ptToMm = 25.4 / 72
    
    const mediaBox: PageBox = {
      x: 0,
      y: 0,
      width: viewport.width * ptToMm,
      height: viewport.height * ptToMm
    }
    
    // Extract other boxes from page dictionary
    // pdf.js doesn't expose these directly, so we use mediaBox as fallback
    const trimBox = this.extractPageBox(pdfPage, 'TrimBox') || mediaBox
    const bleedBox = this.extractPageBox(pdfPage, 'BleedBox') || mediaBox
    const cropBox = this.extractPageBox(pdfPage, 'CropBox') || mediaBox
    const artBox = this.extractPageBox(pdfPage, 'ArtBox') || mediaBox
    
    // Extract layers
    const layers = await this.layerManager.extractLayers(pdfPage)
    
    // Extract objects
    const operatorList = await pdfPage.getOperatorList()
    const objects = await this.objectExtractor.extractObjects(pdfPage, operatorList)
    
    // Extract colors
    const spotColors = options.analyzeColors 
      ? await this.colorExtractor.extractSpotColors(pdfPage, operatorList)
      : []
    
    // Build separations
    const separations = this.buildSeparations(objects, spotColors)
    
    // Extract resources
    const resources = await this.extractResources(pdfPage)
    
    return {
      pageNumber,
      
      // Dimensions
      mediaBox,
      cropBox,
      bleedBox,
      trimBox,
      artBox,
      
      // Rotation
      rotation: pdfPage.rotate as 0 | 90 | 180 | 270,
      
      // Content
      layers,
      objects,
      resources,
      
      // Analysis
      separations,
      spotColors,
      inkCoverage: undefined // Will be calculated separately if needed
    }
  }
  
  /**
   * Extract page box from PDF page
   */
  private extractPageBox(pdfPage: pdfjsLib.PDFPageProxy, boxName: string): PageBox | undefined {
    try {
      // pdf.js exposes view which is the effective crop box
      // For other boxes, we'd need to access the page dictionary directly
      const ptToMm = 25.4 / 72
      const view = pdfPage.view // [x1, y1, x2, y2]
      
      if (view && view.length === 4) {
        return {
          x: view[0] * ptToMm,
          y: view[1] * ptToMm,
          width: (view[2] - view[0]) * ptToMm,
          height: (view[3] - view[1]) * ptToMm
        }
      }
    } catch {
      // Box not found
    }
    return undefined
  }
  
  /**
   * Build separation info from objects and spot colors
   */
  private buildSeparations(
    objects: PDFObject[],
    spotColors: SpotColorInfo[]
  ): SeparationInfo[] {
    const separations: SeparationInfo[] = []
    
    // Add process colors
    const processColors: Array<{ name: string; color: 'C' | 'M' | 'Y' | 'K' }> = [
      { name: 'Cyan', color: 'C' },
      { name: 'Magenta', color: 'M' },
      { name: 'Yellow', color: 'Y' },
      { name: 'Black', color: 'K' }
    ]
    
    for (const pc of processColors) {
      separations.push({
        name: pc.name,
        type: 'PROCESS',
        processColor: pc.color,
        inkDensity: pc.color === 'K' ? 1.8 : 1.0,
        inkSequence: processColors.indexOf(pc),
        isOpaque: false,
        coverage: 0,
        maxCoverage: 0,
        averageCoverage: 0,
        objectCount: 0,
        objectIds: []
      })
    }
    
    // Add spot colors
    for (const spot of spotColors) {
      separations.push({
        name: spot.name,
        type: 'SPOT',
        spotColorInfo: spot,
        inkDensity: 1.0,
        inkSequence: separations.length,
        isOpaque: spot.colorType === 'WHITE' || spot.colorType === 'OPAQUE',
        coverage: 0,
        maxCoverage: 0,
        averageCoverage: 0,
        objectCount: spot.usageCount,
        objectIds: spot.usedInObjects
      })
    }
    
    return separations
  }
  
  /**
   * Extract page resources
   */
  private async extractResources(pdfPage: pdfjsLib.PDFPageProxy): Promise<PDFResources> {
    // Initialize empty resources
    const resources: PDFResources = {
      fonts: new Map(),
      colorSpaces: new Map(),
      xObjects: new Map(),
      patterns: new Map(),
      shadings: new Map(),
      extGStates: new Map()
    }
    
    try {
      // Extract fonts
      const commonObjs = pdfPage.commonObjs
      const objs = pdfPage.objs
      
      // pdf.js doesn't expose resources directly in a clean way
      // We would need to parse the operator list to find resource references
      
    } catch {
      // Resource extraction failed
    }
    
    return resources
  }
  
  /**
   * Generate thumbnails for all pages
   */
  private async generateThumbnails(size: number): Promise<void> {
    if (!this.currentDocument) return
    
    for (const page of this.pages) {
      try {
        const pdfPage = await this.currentDocument.getPage(page.pageNumber)
        const viewport = pdfPage.getViewport({ scale: 1.0 })
        
        // Calculate scale to fit in thumbnail size
        const scale = Math.min(size / viewport.width, size / viewport.height)
        const scaledViewport = pdfPage.getViewport({ scale })
        
        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height
        
        const context = canvas.getContext('2d')
        if (!context) continue
        
        // Render page
        await pdfPage.render({
          canvasContext: context,
          viewport: scaledViewport
        }).promise
        
        // Store thumbnail
        page.thumbnail = canvas.toDataURL('image/png')
        page.previewCanvas = canvas
        
      } catch {
        // Thumbnail generation failed for this page
      }
    }
  }
  
  /**
   * Parse page range string
   */
  private parsePageRange(range: string, totalPages: number): number[] {
    if (range === 'all') {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    
    const pages: Set<number> = new Set()
    const parts = range.split(',')
    
    for (const part of parts) {
      const trimmed = part.trim()
      
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(s => parseInt(s.trim(), 10))
        for (let i = start; i <= Math.min(end, totalPages); i++) {
          if (i >= 1) pages.add(i)
        }
      } else {
        const pageNum = parseInt(trimmed, 10)
        if (pageNum >= 1 && pageNum <= totalPages) {
          pages.add(pageNum)
        }
      }
    }
    
    return Array.from(pages).sort((a, b) => a - b)
  }
  
  /**
   * Report progress to callback
   */
  private reportProgress(
    callback: PDFImportProgressCallback | undefined,
    progress: PDFImportProgress
  ): void {
    if (callback) {
      callback(progress)
    }
  }
  
  /**
   * Get current document info
   */
  getDocumentInfo(): PDFDocumentInfo | null {
    return this.documentInfo
  }
  
  /**
   * Get all pages
   */
  getPages(): PDFPage[] {
    return this.pages
  }
  
  /**
   * Get specific page
   */
  getPage(pageNumber: number): PDFPage | undefined {
    return this.pages.find(p => p.pageNumber === pageNumber)
  }
  
  /**
   * Render page to canvas at specific scale
   */
  async renderPageToCanvas(
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number = 1.0
  ): Promise<void> {
    if (!this.currentDocument) {
      throw new Error('No document loaded')
    }
    
    const pdfPage = await this.currentDocument.getPage(pageNumber)
    const viewport = pdfPage.getViewport({ scale })
    
    canvas.width = viewport.width
    canvas.height = viewport.height
    
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not get canvas context')
    }
    
    await pdfPage.render({
      canvasContext: context,
      viewport
    }).promise
  }
  
  /**
   * Close document and release resources
   */
  async close(): Promise<void> {
    if (this.currentDocument) {
      await this.currentDocument.destroy()
      this.currentDocument = null
    }
    
    this.documentInfo = null
    this.pages = []
  }
}

// Export singleton instance
export const pdfImportEngine = new PDFImportEngine()
