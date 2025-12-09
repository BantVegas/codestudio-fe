/**
 * GPCS CodeStudio - Spot Color Library
 * 
 * Comprehensive spot color library with Pantone, HKS, and custom colors
 * Includes color matching and conversion utilities
 */

import type {
  CMYKValues,
  LABValues,
  SpotColorInfo,
  SpotColorType,
  SpotColorLibraryMatch,
} from '../types/PrepressTypes'

/**
 * Spot color definition
 */
export interface SpotColorDefinition {
  name: string
  code?: string
  library: 'PANTONE' | 'HKS' | 'TOYO' | 'DIC' | 'RAL' | 'CUSTOM'
  cmyk: CMYKValues
  lab?: LABValues
  rgb?: { r: number; g: number; b: number }
  type: SpotColorType
  isMetallic?: boolean
  isNeon?: boolean
  density?: number
}

/**
 * Pantone Coated colors (subset)
 */
const PANTONE_COATED: SpotColorDefinition[] = [
  // Pantone Basic Colors
  { name: 'PANTONE Yellow C', code: 'Yellow C', library: 'PANTONE', cmyk: { c: 0, m: 0, y: 1, k: 0 }, lab: { l: 89.61, a: -5.39, b: 93.28 }, type: 'STANDARD' },
  { name: 'PANTONE Yellow 012 C', code: '012 C', library: 'PANTONE', cmyk: { c: 0, m: 0.1, y: 0.94, k: 0 }, lab: { l: 87.74, a: 3.21, b: 89.12 }, type: 'STANDARD' },
  { name: 'PANTONE Orange 021 C', code: '021 C', library: 'PANTONE', cmyk: { c: 0, m: 0.53, y: 1, k: 0 }, lab: { l: 62.47, a: 52.35, b: 68.21 }, type: 'STANDARD' },
  { name: 'PANTONE Warm Red C', code: 'Warm Red C', library: 'PANTONE', cmyk: { c: 0, m: 0.85, y: 0.85, k: 0 }, lab: { l: 50.23, a: 62.18, b: 45.32 }, type: 'STANDARD' },
  { name: 'PANTONE Red 032 C', code: '032 C', library: 'PANTONE', cmyk: { c: 0, m: 0.9, y: 0.86, k: 0 }, lab: { l: 48.27, a: 69.42, b: 48.15 }, type: 'STANDARD' },
  { name: 'PANTONE Rubine Red C', code: 'Rubine Red C', library: 'PANTONE', cmyk: { c: 0, m: 1, y: 0.15, k: 0 }, lab: { l: 42.35, a: 70.12, b: 5.23 }, type: 'STANDARD' },
  { name: 'PANTONE Rhodamine Red C', code: 'Rhodamine Red C', library: 'PANTONE', cmyk: { c: 0.02, m: 0.95, y: 0, k: 0 }, lab: { l: 48.15, a: 75.32, b: -15.21 }, type: 'STANDARD' },
  { name: 'PANTONE Purple C', code: 'Purple C', library: 'PANTONE', cmyk: { c: 0.45, m: 1, y: 0, k: 0 }, lab: { l: 32.18, a: 55.42, b: -45.23 }, type: 'STANDARD' },
  { name: 'PANTONE Violet C', code: 'Violet C', library: 'PANTONE', cmyk: { c: 0.75, m: 0.95, y: 0, k: 0 }, lab: { l: 28.32, a: 45.18, b: -55.42 }, type: 'STANDARD' },
  { name: 'PANTONE Blue 072 C', code: '072 C', library: 'PANTONE', cmyk: { c: 1, m: 0.85, y: 0, k: 0 }, lab: { l: 22.15, a: 28.32, b: -72.45 }, type: 'STANDARD' },
  { name: 'PANTONE Reflex Blue C', code: 'Reflex Blue C', library: 'PANTONE', cmyk: { c: 1, m: 0.77, y: 0, k: 0.02 }, lab: { l: 23.42, a: 26.18, b: -77.32 }, type: 'STANDARD' },
  { name: 'PANTONE Process Blue C', code: 'Process Blue C', library: 'PANTONE', cmyk: { c: 1, m: 0.1, y: 0, k: 0 }, lab: { l: 55.23, a: -20.15, b: -55.42 }, type: 'STANDARD' },
  { name: 'PANTONE Green C', code: 'Green C', library: 'PANTONE', cmyk: { c: 0.95, m: 0, y: 1, k: 0.27 }, lab: { l: 45.32, a: -55.18, b: 35.42 }, type: 'STANDARD' },
  { name: 'PANTONE Black C', code: 'Black C', library: 'PANTONE', cmyk: { c: 0, m: 0, y: 0, k: 1 }, lab: { l: 0, a: 0, b: 0 }, type: 'STANDARD' },
  
  // Common Pantone numbers
  { name: 'PANTONE 185 C', code: '185 C', library: 'PANTONE', cmyk: { c: 0, m: 0.91, y: 0.76, k: 0 }, lab: { l: 46.23, a: 67.42, b: 38.15 }, type: 'STANDARD' },
  { name: 'PANTONE 186 C', code: '186 C', library: 'PANTONE', cmyk: { c: 0, m: 1, y: 0.81, k: 0.04 }, lab: { l: 42.18, a: 65.32, b: 35.42 }, type: 'STANDARD' },
  { name: 'PANTONE 199 C', code: '199 C', library: 'PANTONE', cmyk: { c: 0, m: 1, y: 0.62, k: 0 }, lab: { l: 44.32, a: 68.15, b: 22.18 }, type: 'STANDARD' },
  { name: 'PANTONE 280 C', code: '280 C', library: 'PANTONE', cmyk: { c: 1, m: 0.86, y: 0.05, k: 0.36 }, lab: { l: 18.42, a: 18.32, b: -52.15 }, type: 'STANDARD' },
  { name: 'PANTONE 281 C', code: '281 C', library: 'PANTONE', cmyk: { c: 1, m: 0.83, y: 0, k: 0.43 }, lab: { l: 16.23, a: 15.42, b: -48.32 }, type: 'STANDARD' },
  { name: 'PANTONE 286 C', code: '286 C', library: 'PANTONE', cmyk: { c: 1, m: 0.66, y: 0, k: 0.02 }, lab: { l: 30.42, a: 22.15, b: -65.23 }, type: 'STANDARD' },
  { name: 'PANTONE 300 C', code: '300 C', library: 'PANTONE', cmyk: { c: 1, m: 0.44, y: 0, k: 0 }, lab: { l: 44.32, a: -2.15, b: -52.42 }, type: 'STANDARD' },
  { name: 'PANTONE 349 C', code: '349 C', library: 'PANTONE', cmyk: { c: 0.91, m: 0, y: 1, k: 0.42 }, lab: { l: 38.15, a: -42.32, b: 28.18 }, type: 'STANDARD' },
  { name: 'PANTONE 354 C', code: '354 C', library: 'PANTONE', cmyk: { c: 0.82, m: 0, y: 1, k: 0 }, lab: { l: 58.42, a: -58.15, b: 48.32 }, type: 'STANDARD' },
  { name: 'PANTONE 485 C', code: '485 C', library: 'PANTONE', cmyk: { c: 0, m: 0.95, y: 1, k: 0 }, lab: { l: 47.15, a: 68.32, b: 52.18 }, type: 'STANDARD' },
  { name: 'PANTONE 877 C', code: '877 C', library: 'PANTONE', cmyk: { c: 0, m: 0, y: 0, k: 0.45 }, lab: { l: 62.32, a: 0, b: 0 }, type: 'METALLIC', isMetallic: true },
  { name: 'PANTONE 8003 C', code: '8003 C', library: 'PANTONE', cmyk: { c: 0.05, m: 0.25, y: 0.65, k: 0.1 }, lab: { l: 68.15, a: 12.32, b: 48.18 }, type: 'METALLIC', isMetallic: true },
  
  // Pantone Metallics
  { name: 'PANTONE 871 C', code: '871 C', library: 'PANTONE', cmyk: { c: 0.15, m: 0.35, y: 0.75, k: 0.25 }, lab: { l: 55.42, a: 8.15, b: 38.32 }, type: 'METALLIC', isMetallic: true },
  { name: 'PANTONE 872 C', code: '872 C', library: 'PANTONE', cmyk: { c: 0.2, m: 0.4, y: 0.8, k: 0.3 }, lab: { l: 50.18, a: 10.32, b: 35.42 }, type: 'METALLIC', isMetallic: true },
  { name: 'PANTONE 873 C', code: '873 C', library: 'PANTONE', cmyk: { c: 0.25, m: 0.45, y: 0.85, k: 0.35 }, lab: { l: 45.32, a: 12.15, b: 32.18 }, type: 'METALLIC', isMetallic: true },
  { name: 'PANTONE 874 C', code: '874 C', library: 'PANTONE', cmyk: { c: 0.1, m: 0.2, y: 0.55, k: 0.15 }, lab: { l: 70.42, a: 5.32, b: 42.15 }, type: 'METALLIC', isMetallic: true },
  { name: 'PANTONE 875 C', code: '875 C', library: 'PANTONE', cmyk: { c: 0.08, m: 0.15, y: 0.45, k: 0.1 }, lab: { l: 75.18, a: 3.42, b: 38.32 }, type: 'METALLIC', isMetallic: true },
  { name: 'PANTONE 876 C', code: '876 C', library: 'PANTONE', cmyk: { c: 0.12, m: 0.28, y: 0.6, k: 0.18 }, lab: { l: 65.32, a: 8.15, b: 40.42 }, type: 'METALLIC', isMetallic: true },
  
  // Neon/Fluorescent
  { name: 'PANTONE 801 C', code: '801 C', library: 'PANTONE', cmyk: { c: 0.5, m: 0, y: 0.15, k: 0 }, lab: { l: 75.42, a: -45.18, b: 5.32 }, type: 'FLUORESCENT', isNeon: true },
  { name: 'PANTONE 802 C', code: '802 C', library: 'PANTONE', cmyk: { c: 0.45, m: 0, y: 0.85, k: 0 }, lab: { l: 80.18, a: -55.32, b: 65.42 }, type: 'FLUORESCENT', isNeon: true },
  { name: 'PANTONE 803 C', code: '803 C', library: 'PANTONE', cmyk: { c: 0, m: 0, y: 0.95, k: 0 }, lab: { l: 92.32, a: -8.15, b: 95.18 }, type: 'FLUORESCENT', isNeon: true },
  { name: 'PANTONE 804 C', code: '804 C', library: 'PANTONE', cmyk: { c: 0, m: 0.35, y: 0.85, k: 0 }, lab: { l: 78.42, a: 35.18, b: 72.32 }, type: 'FLUORESCENT', isNeon: true },
  { name: 'PANTONE 805 C', code: '805 C', library: 'PANTONE', cmyk: { c: 0, m: 0.65, y: 0.55, k: 0 }, lab: { l: 62.18, a: 58.32, b: 35.42 }, type: 'FLUORESCENT', isNeon: true },
  { name: 'PANTONE 806 C', code: '806 C', library: 'PANTONE', cmyk: { c: 0, m: 0.85, y: 0, k: 0 }, lab: { l: 55.32, a: 72.15, b: -18.42 }, type: 'FLUORESCENT', isNeon: true },
  { name: 'PANTONE 807 C', code: '807 C', library: 'PANTONE', cmyk: { c: 0.25, m: 0.9, y: 0, k: 0 }, lab: { l: 45.18, a: 65.32, b: -35.15 }, type: 'FLUORESCENT', isNeon: true },
]

/**
 * HKS colors (subset)
 */
const HKS_COLORS: SpotColorDefinition[] = [
  { name: 'HKS 1 K', code: '1 K', library: 'HKS', cmyk: { c: 0, m: 0.05, y: 1, k: 0 }, lab: { l: 88.42, a: 2.15, b: 92.18 }, type: 'STANDARD' },
  { name: 'HKS 2 K', code: '2 K', library: 'HKS', cmyk: { c: 0, m: 0.15, y: 1, k: 0 }, lab: { l: 82.18, a: 15.32, b: 88.42 }, type: 'STANDARD' },
  { name: 'HKS 3 K', code: '3 K', library: 'HKS', cmyk: { c: 0, m: 0.35, y: 1, k: 0 }, lab: { l: 72.32, a: 32.15, b: 78.18 }, type: 'STANDARD' },
  { name: 'HKS 4 K', code: '4 K', library: 'HKS', cmyk: { c: 0, m: 0.5, y: 1, k: 0 }, lab: { l: 62.15, a: 48.32, b: 68.42 }, type: 'STANDARD' },
  { name: 'HKS 5 K', code: '5 K', library: 'HKS', cmyk: { c: 0, m: 0.65, y: 1, k: 0 }, lab: { l: 55.42, a: 58.15, b: 58.32 }, type: 'STANDARD' },
  { name: 'HKS 13 K', code: '13 K', library: 'HKS', cmyk: { c: 0, m: 1, y: 0.9, k: 0 }, lab: { l: 45.18, a: 68.32, b: 42.15 }, type: 'STANDARD' },
  { name: 'HKS 14 K', code: '14 K', library: 'HKS', cmyk: { c: 0, m: 1, y: 0.7, k: 0 }, lab: { l: 42.32, a: 65.15, b: 28.42 }, type: 'STANDARD' },
  { name: 'HKS 25 K', code: '25 K', library: 'HKS', cmyk: { c: 0, m: 1, y: 0, k: 0 }, lab: { l: 48.15, a: 75.32, b: -5.18 }, type: 'STANDARD' },
  { name: 'HKS 33 K', code: '33 K', library: 'HKS', cmyk: { c: 0.5, m: 1, y: 0, k: 0 }, lab: { l: 32.42, a: 52.18, b: -42.32 }, type: 'STANDARD' },
  { name: 'HKS 41 K', code: '41 K', library: 'HKS', cmyk: { c: 1, m: 0.7, y: 0, k: 0 }, lab: { l: 28.18, a: 25.32, b: -62.15 }, type: 'STANDARD' },
  { name: 'HKS 42 K', code: '42 K', library: 'HKS', cmyk: { c: 1, m: 0.5, y: 0, k: 0 }, lab: { l: 38.32, a: 8.15, b: -55.42 }, type: 'STANDARD' },
  { name: 'HKS 43 K', code: '43 K', library: 'HKS', cmyk: { c: 1, m: 0.3, y: 0, k: 0 }, lab: { l: 48.15, a: -8.32, b: -48.18 }, type: 'STANDARD' },
  { name: 'HKS 44 K', code: '44 K', library: 'HKS', cmyk: { c: 1, m: 0.1, y: 0, k: 0 }, lab: { l: 55.42, a: -22.15, b: -42.32 }, type: 'STANDARD' },
  { name: 'HKS 51 K', code: '51 K', library: 'HKS', cmyk: { c: 1, m: 0, y: 0.3, k: 0 }, lab: { l: 62.18, a: -45.32, b: 8.15 }, type: 'STANDARD' },
  { name: 'HKS 52 K', code: '52 K', library: 'HKS', cmyk: { c: 1, m: 0, y: 0.5, k: 0 }, lab: { l: 58.32, a: -52.15, b: 22.42 }, type: 'STANDARD' },
  { name: 'HKS 53 K', code: '53 K', library: 'HKS', cmyk: { c: 1, m: 0, y: 0.7, k: 0 }, lab: { l: 55.15, a: -55.42, b: 35.18 }, type: 'STANDARD' },
  { name: 'HKS 54 K', code: '54 K', library: 'HKS', cmyk: { c: 1, m: 0, y: 0.9, k: 0 }, lab: { l: 52.42, a: -58.18, b: 48.32 }, type: 'STANDARD' },
  { name: 'HKS 57 K', code: '57 K', library: 'HKS', cmyk: { c: 0.7, m: 0, y: 1, k: 0 }, lab: { l: 62.18, a: -48.32, b: 58.15 }, type: 'STANDARD' },
  { name: 'HKS 65 K', code: '65 K', library: 'HKS', cmyk: { c: 0.3, m: 0, y: 1, k: 0 }, lab: { l: 78.32, a: -28.15, b: 75.42 }, type: 'STANDARD' },
]

/**
 * Special colors (White, Varnish, etc.)
 */
const SPECIAL_COLORS: SpotColorDefinition[] = [
  { name: 'White', code: 'WHITE', library: 'CUSTOM', cmyk: { c: 0, m: 0, y: 0, k: 0 }, lab: { l: 100, a: 0, b: 0 }, type: 'WHITE' },
  { name: 'Opaque White', code: 'OPAQUE_WHITE', library: 'CUSTOM', cmyk: { c: 0, m: 0, y: 0, k: 0 }, lab: { l: 100, a: 0, b: 0 }, type: 'OPAQUE' },
  { name: 'Spot Varnish', code: 'VARNISH', library: 'CUSTOM', cmyk: { c: 0, m: 0, y: 0, k: 0 }, lab: { l: 100, a: 0, b: 0 }, type: 'VARNISH' },
  { name: 'Gloss Varnish', code: 'GLOSS', library: 'CUSTOM', cmyk: { c: 0, m: 0, y: 0, k: 0 }, lab: { l: 100, a: 0, b: 0 }, type: 'VARNISH' },
  { name: 'Matt Varnish', code: 'MATT', library: 'CUSTOM', cmyk: { c: 0, m: 0, y: 0, k: 0 }, lab: { l: 100, a: 0, b: 0 }, type: 'VARNISH' },
  { name: 'Die Line', code: 'DIELINE', library: 'CUSTOM', cmyk: { c: 0, m: 1, y: 0, k: 0 }, lab: { l: 50, a: 80, b: -10 }, type: 'DIELINE' },
  { name: 'Cut Contour', code: 'CUT', library: 'CUSTOM', cmyk: { c: 1, m: 0, y: 0, k: 0 }, lab: { l: 55, a: -20, b: -50 }, type: 'DIELINE' },
  { name: 'Crease', code: 'CREASE', library: 'CUSTOM', cmyk: { c: 0, m: 0, y: 1, k: 0 }, lab: { l: 90, a: -5, b: 90 }, type: 'DIELINE' },
  { name: 'Perforation', code: 'PERF', library: 'CUSTOM', cmyk: { c: 0.5, m: 0.5, y: 0, k: 0 }, lab: { l: 45, a: 30, b: -40 }, type: 'DIELINE' },
  { name: 'Gold Foil', code: 'GOLD_FOIL', library: 'CUSTOM', cmyk: { c: 0, m: 0.2, y: 0.7, k: 0.1 }, lab: { l: 75, a: 5, b: 55 }, type: 'METALLIC', isMetallic: true },
  { name: 'Silver Foil', code: 'SILVER_FOIL', library: 'CUSTOM', cmyk: { c: 0, m: 0, y: 0, k: 0.3 }, lab: { l: 70, a: 0, b: 0 }, type: 'METALLIC', isMetallic: true },
]

/**
 * Spot Color Library class
 */
export class SpotColorLibrary {
  private customColors: Map<string, SpotColorDefinition> = new Map()
  private allColors: SpotColorDefinition[] = []
  
  constructor() {
    this.initializeLibrary()
  }
  
  /**
   * Initialize color library
   */
  private initializeLibrary(): void {
    this.allColors = [
      ...PANTONE_COATED,
      ...HKS_COLORS,
      ...SPECIAL_COLORS
    ]
  }
  
  /**
   * Search for color by name
   */
  searchByName(query: string): SpotColorDefinition[] {
    const lowerQuery = query.toLowerCase()
    
    return this.allColors.filter(color => 
      color.name.toLowerCase().includes(lowerQuery) ||
      (color.code && color.code.toLowerCase().includes(lowerQuery))
    )
  }
  
  /**
   * Get color by exact name
   */
  getByName(name: string): SpotColorDefinition | undefined {
    return this.allColors.find(color => 
      color.name.toLowerCase() === name.toLowerCase()
    )
  }
  
  /**
   * Get color by code
   */
  getByCode(code: string): SpotColorDefinition | undefined {
    return this.allColors.find(color => 
      color.code?.toLowerCase() === code.toLowerCase()
    )
  }
  
  /**
   * Find closest color match by CMYK
   */
  findClosestByCmyk(cmyk: CMYKValues, maxDeltaE: number = 10): SpotColorLibraryMatch | undefined {
    let closestMatch: SpotColorDefinition | undefined
    let minDeltaE = Infinity
    
    for (const color of this.allColors) {
      const deltaE = this.calculateCmykDeltaE(cmyk, color.cmyk)
      
      if (deltaE < minDeltaE) {
        minDeltaE = deltaE
        closestMatch = color
      }
    }
    
    if (closestMatch && minDeltaE <= maxDeltaE) {
      return {
        library: closestMatch.library,
        colorName: closestMatch.name,
        colorCode: closestMatch.code,
        deltaE: minDeltaE,
        isExactMatch: minDeltaE < 1
      }
    }
    
    return undefined
  }
  
  /**
   * Find closest color match by LAB
   */
  findClosestByLab(lab: LABValues, maxDeltaE: number = 10): SpotColorLibraryMatch | undefined {
    let closestMatch: SpotColorDefinition | undefined
    let minDeltaE = Infinity
    
    for (const color of this.allColors) {
      if (!color.lab) continue
      
      const deltaE = this.calculateLabDeltaE(lab, color.lab)
      
      if (deltaE < minDeltaE) {
        minDeltaE = deltaE
        closestMatch = color
      }
    }
    
    if (closestMatch && minDeltaE <= maxDeltaE) {
      return {
        library: closestMatch.library,
        colorName: closestMatch.name,
        colorCode: closestMatch.code,
        deltaE: minDeltaE,
        isExactMatch: minDeltaE < 1
      }
    }
    
    return undefined
  }
  
  /**
   * Calculate Delta E between CMYK colors (simplified)
   */
  private calculateCmykDeltaE(cmyk1: CMYKValues, cmyk2: CMYKValues): number {
    // Convert to approximate LAB and calculate
    const lab1 = this.cmykToApproximateLab(cmyk1)
    const lab2 = this.cmykToApproximateLab(cmyk2)
    
    return this.calculateLabDeltaE(lab1, lab2)
  }
  
  /**
   * Calculate Delta E between LAB colors (CIE76)
   */
  private calculateLabDeltaE(lab1: LABValues, lab2: LABValues): number {
    const dL = lab1.l - lab2.l
    const da = lab1.a - lab2.a
    const db = lab1.b - lab2.b
    
    return Math.sqrt(dL * dL + da * da + db * db)
  }
  
  /**
   * Convert CMYK to approximate LAB
   */
  private cmykToApproximateLab(cmyk: CMYKValues): LABValues {
    // Convert CMYK to RGB
    const r = (1 - cmyk.c) * (1 - cmyk.k)
    const g = (1 - cmyk.m) * (1 - cmyk.k)
    const b = (1 - cmyk.y) * (1 - cmyk.k)
    
    // Convert RGB to XYZ
    let rn = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
    let gn = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
    let bn = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92
    
    const x = (rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375) / 0.95047
    const y = (rn * 0.2126729 + gn * 0.7151522 + bn * 0.0721750) / 1.00000
    const z = (rn * 0.0193339 + gn * 0.1191920 + bn * 0.9503041) / 1.08883
    
    // Convert XYZ to LAB
    const f = (t: number) => t > 0.008856 ? Math.pow(t, 1/3) : (7.787 * t) + 16/116
    
    return {
      l: (116 * f(y)) - 16,
      a: 500 * (f(x) - f(y)),
      b: 200 * (f(y) - f(z))
    }
  }
  
  /**
   * Get all colors by library
   */
  getByLibrary(library: 'PANTONE' | 'HKS' | 'TOYO' | 'DIC' | 'CUSTOM'): SpotColorDefinition[] {
    return this.allColors.filter(color => color.library === library)
  }
  
  /**
   * Get all colors by type
   */
  getByType(type: SpotColorType): SpotColorDefinition[] {
    return this.allColors.filter(color => color.type === type)
  }
  
  /**
   * Get metallic colors
   */
  getMetallicColors(): SpotColorDefinition[] {
    return this.allColors.filter(color => color.isMetallic)
  }
  
  /**
   * Get fluorescent/neon colors
   */
  getFluorescentColors(): SpotColorDefinition[] {
    return this.allColors.filter(color => color.isNeon)
  }
  
  /**
   * Get special colors (white, varnish, dieline)
   */
  getSpecialColors(): SpotColorDefinition[] {
    return this.allColors.filter(color => 
      color.type === 'WHITE' || 
      color.type === 'VARNISH' || 
      color.type === 'DIELINE' ||
      color.type === 'OPAQUE'
    )
  }
  
  /**
   * Add custom color
   */
  addCustomColor(color: SpotColorDefinition): void {
    this.customColors.set(color.name, color)
    this.allColors.push(color)
  }
  
  /**
   * Remove custom color
   */
  removeCustomColor(name: string): boolean {
    if (this.customColors.has(name)) {
      this.customColors.delete(name)
      this.allColors = this.allColors.filter(c => c.name !== name)
      return true
    }
    return false
  }
  
  /**
   * Get all custom colors
   */
  getCustomColors(): SpotColorDefinition[] {
    return Array.from(this.customColors.values())
  }
  
  /**
   * Convert SpotColorDefinition to SpotColorInfo
   */
  toSpotColorInfo(color: SpotColorDefinition): SpotColorInfo {
    return {
      name: color.name,
      originalName: color.name,
      alternateSpace: 'CMYK',
      cmykFallback: color.cmyk,
      labValue: color.lab,
      libraryMatch: {
        library: color.library,
        colorName: color.name,
        colorCode: color.code,
        deltaE: 0,
        isExactMatch: true
      },
      usageCount: 0,
      usedInLayers: [],
      usedInObjects: [],
      printOrder: undefined,
      isProcessColor: false,
      colorType: color.type
    }
  }
  
  /**
   * Get total color count
   */
  getTotalCount(): number {
    return this.allColors.length
  }
  
  /**
   * Get library statistics
   */
  getStatistics(): { library: string; count: number }[] {
    const stats = new Map<string, number>()
    
    for (const color of this.allColors) {
      const count = stats.get(color.library) || 0
      stats.set(color.library, count + 1)
    }
    
    return Array.from(stats.entries()).map(([library, count]) => ({ library, count }))
  }
}

// Export singleton
export const spotColorLibrary = new SpotColorLibrary()
