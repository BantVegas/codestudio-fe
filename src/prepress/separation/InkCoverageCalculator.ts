/**
 * GPCS CodeStudio - Ink Coverage Calculator
 * 
 * Calculates ink coverage and Total Area Coverage (TAC)
 * Essential for prepress quality control
 */

import type {
  PDFPage,
  PDFObject,
  InkCoverageResult,
  SeparationCoverage,
  TACResult,
  TACExceedance,
  CoverageMap,
  ExtendedColor,
  CMYKValues,
  BoundingBox,
  Point,
} from '../types/PrepressTypes'

/**
 * Ink coverage calculation options
 */
export interface InkCoverageOptions {
  resolution: number          // Calculation resolution in DPI
  tacLimit: number            // TAC limit (e.g., 300 for flexo, 340 for offset)
  includeSpotColors: boolean  // Include spot colors in TAC
  spotColorDensity: number    // Assumed density for spot colors (0-1)
  generateMaps: boolean       // Generate coverage maps for visualization
}

/**
 * Default ink coverage options
 */
export const DEFAULT_COVERAGE_OPTIONS: InkCoverageOptions = {
  resolution: 72,             // Lower resolution for faster calculation
  tacLimit: 300,              // Flexo default
  includeSpotColors: false,   // Spot colors usually don't count toward TAC
  spotColorDensity: 1.0,
  generateMaps: true
}

/**
 * TAC limits by printing technology
 */
export const TAC_LIMITS = {
  FLEXO_COATED: 280,
  FLEXO_UNCOATED: 260,
  OFFSET_COATED: 340,
  OFFSET_UNCOATED: 300,
  DIGITAL: 320,
  GRAVURE: 360,
  SCREEN: 280,
  NEWSPAPER: 240
}

/**
 * Ink Coverage Calculator class
 */
export class InkCoverageCalculator {
  private options: InkCoverageOptions = DEFAULT_COVERAGE_OPTIONS
  
  /**
   * Set calculation options
   */
  setOptions(options: Partial<InkCoverageOptions>): void {
    this.options = { ...this.options, ...options }
  }
  
  /**
   * Calculate ink coverage for a page
   */
  calculateCoverage(page: PDFPage): InkCoverageResult {
    const startTime = performance.now()
    
    // Initialize separation coverage
    const separations = this.initializeSeparations(page)
    
    // Calculate coverage grid
    const gridWidth = Math.ceil(page.mediaBox.width * this.options.resolution / 72)
    const gridHeight = Math.ceil(page.mediaBox.height * this.options.resolution / 72)
    
    // Create coverage grids for each separation
    const coverageGrids = new Map<string, Float32Array>()
    for (const sep of separations.keys()) {
      coverageGrids.set(sep, new Float32Array(gridWidth * gridHeight))
    }
    
    // Process each object
    for (const obj of page.objects) {
      this.processObjectCoverage(obj, page, coverageGrids, gridWidth, gridHeight)
    }
    
    // Calculate statistics for each separation
    const separationResults: SeparationCoverage[] = []
    const pageAreaMm2 = page.mediaBox.width * page.mediaBox.height
    
    for (const [sepName, grid] of coverageGrids) {
      const stats = this.calculateGridStatistics(grid, gridWidth, gridHeight)
      
      separationResults.push({
        separationName: sepName,
        totalCoverage: stats.totalCoverage,
        maxCoverage: stats.maxCoverage * 100,
        averageCoverage: stats.averageCoverage * 100,
        inkAreaMm2: stats.totalCoverage * pageAreaMm2 / 100,
        totalAreaMm2: pageAreaMm2,
        histogram: this.options.generateMaps ? this.generateHistogram(grid) : undefined
      })
    }
    
    // Calculate TAC
    const tacResult = this.calculateTAC(coverageGrids, gridWidth, gridHeight, page)
    
    // Generate coverage maps if requested
    let coverageMap: CoverageMap | undefined
    if (this.options.generateMaps) {
      coverageMap = this.generateCoverageMaps(coverageGrids, gridWidth, gridHeight)
    }
    
    return {
      pageNumber: page.pageNumber,
      separations: separationResults,
      tac: tacResult,
      coverageMap,
      resolution: this.options.resolution,
      calculatedAt: new Date()
    }
  }
  
  /**
   * Initialize separations map
   */
  private initializeSeparations(page: PDFPage): Map<string, number> {
    const separations = new Map<string, number>()
    
    // Always include CMYK
    separations.set('Cyan', 0)
    separations.set('Magenta', 0)
    separations.set('Yellow', 0)
    separations.set('Black', 0)
    
    // Add spot colors
    for (const spot of page.spotColors) {
      separations.set(spot.name, 0)
    }
    
    return separations
  }
  
  /**
   * Process object coverage
   */
  private processObjectCoverage(
    obj: PDFObject,
    page: PDFPage,
    grids: Map<string, Float32Array>,
    gridWidth: number,
    gridHeight: number
  ): void {
    // Get object bounds in grid coordinates
    const scale = this.options.resolution / 72
    const bounds = {
      x1: Math.floor(obj.bounds.x * scale),
      y1: Math.floor((page.mediaBox.height - obj.bounds.y - obj.bounds.height) * scale),
      x2: Math.ceil((obj.bounds.x + obj.bounds.width) * scale),
      y2: Math.ceil((page.mediaBox.height - obj.bounds.y) * scale)
    }
    
    // Clamp to grid bounds
    bounds.x1 = Math.max(0, bounds.x1)
    bounds.y1 = Math.max(0, bounds.y1)
    bounds.x2 = Math.min(gridWidth, bounds.x2)
    bounds.y2 = Math.min(gridHeight, bounds.y2)
    
    // Get color values
    const colorValues = this.getColorSeparationValues(obj.fillColor)
    
    // Apply to grid
    for (let y = bounds.y1; y < bounds.y2; y++) {
      for (let x = bounds.x1; x < bounds.x2; x++) {
        const idx = y * gridWidth + x
        
        for (const [sepName, value] of colorValues) {
          const grid = grids.get(sepName)
          if (grid && value > 0) {
            if (obj.overprint) {
              // Overprint: add to existing
              grid[idx] = Math.min(1, grid[idx] + value * obj.opacity)
            } else {
              // Knockout: replace
              grid[idx] = value * obj.opacity
            }
          }
        }
      }
    }
  }
  
  /**
   * Get separation values from color
   */
  private getColorSeparationValues(color: ExtendedColor | undefined): Map<string, number> {
    const values = new Map<string, number>()
    
    if (!color) return values
    
    if (color.cmyk) {
      values.set('Cyan', color.cmyk.c)
      values.set('Magenta', color.cmyk.m)
      values.set('Yellow', color.cmyk.y)
      values.set('Black', color.cmyk.k)
    } else if (color.rgb) {
      // Convert RGB to CMYK
      const cmyk = this.rgbToCmyk(color.rgb.r, color.rgb.g, color.rgb.b)
      values.set('Cyan', cmyk.c)
      values.set('Magenta', cmyk.m)
      values.set('Yellow', cmyk.y)
      values.set('Black', cmyk.k)
    } else if (color.gray !== undefined) {
      values.set('Black', 1 - color.gray)
    } else if (color.spot) {
      values.set(color.spot.name, color.tint)
    }
    
    return values
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
   * Calculate grid statistics
   */
  private calculateGridStatistics(
    grid: Float32Array,
    width: number,
    height: number
  ): { totalCoverage: number; maxCoverage: number; averageCoverage: number } {
    let sum = 0
    let max = 0
    let nonZeroCount = 0
    let nonZeroSum = 0
    
    for (let i = 0; i < grid.length; i++) {
      const value = grid[i]
      sum += value
      max = Math.max(max, value)
      
      if (value > 0) {
        nonZeroCount++
        nonZeroSum += value
      }
    }
    
    const totalPixels = width * height
    
    return {
      totalCoverage: (sum / totalPixels) * 100,
      maxCoverage: max,
      averageCoverage: nonZeroCount > 0 ? nonZeroSum / nonZeroCount : 0
    }
  }
  
  /**
   * Calculate Total Area Coverage
   */
  private calculateTAC(
    grids: Map<string, Float32Array>,
    gridWidth: number,
    gridHeight: number,
    page: PDFPage
  ): TACResult {
    const totalPixels = gridWidth * gridHeight
    const tacGrid = new Float32Array(totalPixels)
    
    // Sum all separations
    const processColors = ['Cyan', 'Magenta', 'Yellow', 'Black']
    
    for (const [sepName, grid] of grids) {
      // Skip spot colors if not included
      if (!this.options.includeSpotColors && !processColors.includes(sepName)) {
        continue
      }
      
      for (let i = 0; i < totalPixels; i++) {
        tacGrid[i] += grid[i] * 100 // Convert to percentage
      }
    }
    
    // Find max TAC and its location
    let maxTAC = 0
    let maxTACIndex = 0
    let tacSum = 0
    let tacCount = 0
    
    for (let i = 0; i < totalPixels; i++) {
      const tac = tacGrid[i]
      if (tac > maxTAC) {
        maxTAC = tac
        maxTACIndex = i
      }
      if (tac > 0) {
        tacSum += tac
        tacCount++
      }
    }
    
    // Convert max TAC location to coordinates
    const maxX = maxTACIndex % gridWidth
    const maxY = Math.floor(maxTACIndex / gridWidth)
    const scale = 72 / this.options.resolution
    
    const maxTACLocation: Point = {
      x: maxX * scale,
      y: page.mediaBox.height - (maxY * scale)
    }
    
    // Find areas exceeding limit
    const exceedances = this.findTACExceedances(
      tacGrid, grids, gridWidth, gridHeight, page, scale
    )
    
    return {
      maxTAC,
      averageTAC: tacCount > 0 ? tacSum / tacCount : 0,
      maxTACLocation,
      areasExceedingLimit: exceedances,
      tacLimit: this.options.tacLimit
    }
  }
  
  /**
   * Find areas exceeding TAC limit
   */
  private findTACExceedances(
    tacGrid: Float32Array,
    grids: Map<string, Float32Array>,
    gridWidth: number,
    gridHeight: number,
    page: PDFPage,
    scale: number
  ): TACExceedance[] {
    const exceedances: TACExceedance[] = []
    const visited = new Set<number>()
    
    for (let i = 0; i < tacGrid.length; i++) {
      if (tacGrid[i] > this.options.tacLimit && !visited.has(i)) {
        // Find connected region
        const region = this.floodFillRegion(tacGrid, gridWidth, gridHeight, i, visited)
        
        if (region.length > 0) {
          // Calculate bounds
          const bounds = this.calculateRegionBounds(region, gridWidth, scale, page.mediaBox.height)
          
          // Get max TAC in region
          let maxTac = 0
          let maxIdx = region[0]
          for (const idx of region) {
            if (tacGrid[idx] > maxTac) {
              maxTac = tacGrid[idx]
              maxIdx = idx
            }
          }
          
          // Get separation breakdown at max point
          const breakdown: { name: string; value: number }[] = []
          for (const [sepName, grid] of grids) {
            const value = grid[maxIdx] * 100
            if (value > 0) {
              breakdown.push({ name: sepName, value })
            }
          }
          
          exceedances.push({
            location: bounds,
            tacValue: maxTac,
            separationBreakdown: breakdown
          })
        }
      }
    }
    
    return exceedances
  }
  
  /**
   * Flood fill to find connected region
   */
  private floodFillRegion(
    grid: Float32Array,
    width: number,
    height: number,
    startIdx: number,
    visited: Set<number>
  ): number[] {
    const region: number[] = []
    const stack = [startIdx]
    
    while (stack.length > 0) {
      const idx = stack.pop()!
      
      if (visited.has(idx)) continue
      if (grid[idx] <= this.options.tacLimit) continue
      
      visited.add(idx)
      region.push(idx)
      
      const x = idx % width
      const y = Math.floor(idx / width)
      
      // Check neighbors
      if (x > 0) stack.push(idx - 1)
      if (x < width - 1) stack.push(idx + 1)
      if (y > 0) stack.push(idx - width)
      if (y < height - 1) stack.push(idx + width)
    }
    
    return region
  }
  
  /**
   * Calculate bounding box for region
   */
  private calculateRegionBounds(
    region: number[],
    gridWidth: number,
    scale: number,
    pageHeight: number
  ): BoundingBox {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    for (const idx of region) {
      const x = idx % gridWidth
      const y = Math.floor(idx / gridWidth)
      
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
    
    return {
      x: minX * scale,
      y: pageHeight - (maxY + 1) * scale,
      width: (maxX - minX + 1) * scale,
      height: (maxY - minY + 1) * scale
    }
  }
  
  /**
   * Generate histogram for coverage
   */
  private generateHistogram(grid: Float32Array): number[] {
    const histogram = new Array(256).fill(0)
    
    for (let i = 0; i < grid.length; i++) {
      const bin = Math.min(255, Math.floor(grid[i] * 255))
      histogram[bin]++
    }
    
    return histogram
  }
  
  /**
   * Generate coverage maps
   */
  private generateCoverageMaps(
    grids: Map<string, Float32Array>,
    width: number,
    height: number
  ): CoverageMap {
    const separationMaps = new Map<string, Uint8Array>()
    
    for (const [sepName, grid] of grids) {
      const map = new Uint8Array(width * height)
      for (let i = 0; i < grid.length; i++) {
        map[i] = Math.min(255, Math.floor(grid[i] * 255))
      }
      separationMaps.set(sepName, map)
    }
    
    // Generate TAC map
    const tacMap = new Uint8Array(width * height)
    for (let i = 0; i < width * height; i++) {
      let tac = 0
      for (const grid of grids.values()) {
        tac += grid[i]
      }
      // Scale TAC to 0-255 (assuming max TAC of 400%)
      tacMap[i] = Math.min(255, Math.floor((tac / 4) * 255))
    }
    
    return {
      width,
      height,
      resolution: this.options.resolution,
      separationMaps,
      tacMap
    }
  }
  
  /**
   * Render coverage map to canvas
   */
  renderCoverageMap(
    coverageMap: CoverageMap,
    separationName: string,
    canvas: HTMLCanvasElement,
    colorize: boolean = true
  ): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = coverageMap.width
    canvas.height = coverageMap.height
    
    const map = separationName === 'TAC' 
      ? coverageMap.tacMap 
      : coverageMap.separationMaps.get(separationName)
    
    if (!map) return
    
    const imageData = ctx.createImageData(coverageMap.width, coverageMap.height)
    
    for (let i = 0; i < map.length; i++) {
      const value = map[i]
      const idx = i * 4
      
      if (colorize && separationName !== 'TAC') {
        // Colorize based on separation
        const color = this.getSeparationColor(separationName)
        imageData.data[idx] = Math.floor(color.r * value / 255)
        imageData.data[idx + 1] = Math.floor(color.g * value / 255)
        imageData.data[idx + 2] = Math.floor(color.b * value / 255)
      } else if (separationName === 'TAC') {
        // TAC heatmap
        const heatColor = this.getTACHeatColor(value, this.options.tacLimit)
        imageData.data[idx] = heatColor.r
        imageData.data[idx + 1] = heatColor.g
        imageData.data[idx + 2] = heatColor.b
      } else {
        // Grayscale
        imageData.data[idx] = value
        imageData.data[idx + 1] = value
        imageData.data[idx + 2] = value
      }
      
      imageData.data[idx + 3] = 255
    }
    
    ctx.putImageData(imageData, 0, 0)
  }
  
  /**
   * Get separation display color
   */
  private getSeparationColor(name: string): { r: number; g: number; b: number } {
    switch (name) {
      case 'Cyan': return { r: 0, g: 174, b: 239 }
      case 'Magenta': return { r: 236, g: 0, b: 140 }
      case 'Yellow': return { r: 255, g: 242, b: 0 }
      case 'Black': return { r: 0, g: 0, b: 0 }
      default: return { r: 128, g: 128, b: 128 }
    }
  }
  
  /**
   * Get TAC heat color
   */
  private getTACHeatColor(value: number, limit: number): { r: number; g: number; b: number } {
    // Scale value to percentage (0-400%)
    const percentage = (value / 255) * 400
    
    if (percentage <= limit * 0.7) {
      // Green - safe
      return { r: 0, g: 200, b: 0 }
    } else if (percentage <= limit * 0.9) {
      // Yellow - warning
      return { r: 255, g: 200, b: 0 }
    } else if (percentage <= limit) {
      // Orange - near limit
      return { r: 255, g: 128, b: 0 }
    } else {
      // Red - exceeds limit
      return { r: 255, g: 0, b: 0 }
    }
  }
  
  /**
   * Get recommended TAC limit for printing technology
   */
  getRecommendedTACLimit(technology: keyof typeof TAC_LIMITS): number {
    return TAC_LIMITS[technology]
  }
}

// Export singleton
export const inkCoverageCalculator = new InkCoverageCalculator()
