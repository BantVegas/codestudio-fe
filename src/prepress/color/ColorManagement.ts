/**
 * GPCS CodeStudio - Color Management System
 * 
 * Professional color conversion and management
 * Supports ICC profiles and color space transformations
 */

import type {
  CMYKValues,
  RGBValues,
  LABValues,
  ExtendedColor,
  ICCProfile,
} from '../types/PrepressTypes'

/**
 * Color conversion options
 */
export interface ColorConversionOptions {
  renderingIntent: RenderingIntent
  blackPointCompensation: boolean
  preserveBlack: boolean
  useDeviceLink?: boolean
}

export type RenderingIntent = 
  | 'perceptual'
  | 'relative'
  | 'saturation'
  | 'absolute'

/**
 * Default conversion options
 */
export const DEFAULT_CONVERSION_OPTIONS: ColorConversionOptions = {
  renderingIntent: 'relative',
  blackPointCompensation: true,
  preserveBlack: true
}

/**
 * D50 white point (standard for print)
 */
const D50_WHITE = { x: 0.96422, y: 1.0, z: 0.82521 }

/**
 * D65 white point (standard for displays)
 */
const D65_WHITE = { x: 0.95047, y: 1.0, z: 1.08883 }

/**
 * Color Management System
 */
export class ColorManagementSystem {
  private sourceProfile: ICCProfile | null = null
  private destinationProfile: ICCProfile | null = null
  private options: ColorConversionOptions = DEFAULT_CONVERSION_OPTIONS
  
  /**
   * Set conversion options
   */
  setOptions(options: Partial<ColorConversionOptions>): void {
    this.options = { ...this.options, ...options }
  }
  
  /**
   * Set source ICC profile
   */
  setSourceProfile(profile: ICCProfile): void {
    this.sourceProfile = profile
  }
  
  /**
   * Set destination ICC profile
   */
  setDestinationProfile(profile: ICCProfile): void {
    this.destinationProfile = profile
  }
  
  // ============================================
  // RGB <-> CMYK CONVERSIONS
  // ============================================
  
  /**
   * Convert RGB to CMYK
   * Uses simple UCR/GCR algorithm without ICC profile
   */
  rgbToCmyk(rgb: RGBValues, options?: Partial<ColorConversionOptions>): CMYKValues {
    const opts = { ...this.options, ...options }
    
    // Normalize RGB values (0-1)
    const r = rgb.r
    const g = rgb.g
    const b = rgb.b
    
    // Calculate CMY
    let c = 1 - r
    let m = 1 - g
    let y = 1 - b
    
    // Calculate K (black) using GCR
    const k = Math.min(c, m, y)
    
    // Apply UCR (Under Color Removal)
    if (k < 1) {
      if (opts.preserveBlack) {
        // Preserve pure black
        if (c === 1 && m === 1 && y === 1) {
          return { c: 0, m: 0, y: 0, k: 1 }
        }
      }
      
      c = (c - k) / (1 - k)
      m = (m - k) / (1 - k)
      y = (y - k) / (1 - k)
    } else {
      c = 0
      m = 0
      y = 0
    }
    
    return {
      c: Math.max(0, Math.min(1, c)),
      m: Math.max(0, Math.min(1, m)),
      y: Math.max(0, Math.min(1, y)),
      k: Math.max(0, Math.min(1, k))
    }
  }
  
  /**
   * Convert CMYK to RGB
   */
  cmykToRgb(cmyk: CMYKValues): RGBValues {
    const c = cmyk.c
    const m = cmyk.m
    const y = cmyk.y
    const k = cmyk.k
    
    const r = (1 - c) * (1 - k)
    const g = (1 - m) * (1 - k)
    const b = (1 - y) * (1 - k)
    
    return {
      r: Math.max(0, Math.min(1, r)),
      g: Math.max(0, Math.min(1, g)),
      b: Math.max(0, Math.min(1, b))
    }
  }
  
  // ============================================
  // RGB <-> LAB CONVERSIONS
  // ============================================
  
  /**
   * Convert RGB to LAB (via XYZ)
   */
  rgbToLab(rgb: RGBValues): LABValues {
    // First convert to XYZ
    const xyz = this.rgbToXyz(rgb)
    
    // Then convert XYZ to LAB
    return this.xyzToLab(xyz)
  }
  
  /**
   * Convert LAB to RGB (via XYZ)
   */
  labToRgb(lab: LABValues): RGBValues {
    // First convert to XYZ
    const xyz = this.labToXyz(lab)
    
    // Then convert XYZ to RGB
    return this.xyzToRgb(xyz)
  }
  
  /**
   * Convert RGB to XYZ
   */
  private rgbToXyz(rgb: RGBValues): { x: number; y: number; z: number } {
    // Apply gamma correction (sRGB)
    let r = rgb.r
    let g = rgb.g
    let b = rgb.b
    
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92
    
    // sRGB to XYZ matrix (D65)
    return {
      x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
      y: r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
      z: r * 0.0193339 + g * 0.1191920 + b * 0.9503041
    }
  }
  
  /**
   * Convert XYZ to RGB
   */
  private xyzToRgb(xyz: { x: number; y: number; z: number }): RGBValues {
    // XYZ to sRGB matrix
    let r = xyz.x * 3.2404542 + xyz.y * -1.5371385 + xyz.z * -0.4985314
    let g = xyz.x * -0.9692660 + xyz.y * 1.8760108 + xyz.z * 0.0415560
    let b = xyz.x * 0.0556434 + xyz.y * -0.2040259 + xyz.z * 1.0572252
    
    // Apply gamma correction
    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b
    
    return {
      r: Math.max(0, Math.min(1, r)),
      g: Math.max(0, Math.min(1, g)),
      b: Math.max(0, Math.min(1, b))
    }
  }
  
  /**
   * Convert XYZ to LAB
   */
  private xyzToLab(xyz: { x: number; y: number; z: number }): LABValues {
    // Normalize to D50 white point
    let x = xyz.x / D50_WHITE.x
    let y = xyz.y / D50_WHITE.y
    let z = xyz.z / D50_WHITE.z
    
    // Apply f function
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
   * Convert LAB to XYZ
   */
  private labToXyz(lab: LABValues): { x: number; y: number; z: number } {
    const fy = (lab.l + 16) / 116
    const fx = lab.a / 500 + fy
    const fz = fy - lab.b / 200
    
    const f3 = (t: number) => {
      const t3 = t * t * t
      return t3 > 0.008856 ? t3 : (t - 16/116) / 7.787
    }
    
    return {
      x: D50_WHITE.x * f3(fx),
      y: D50_WHITE.y * f3(fy),
      z: D50_WHITE.z * f3(fz)
    }
  }
  
  // ============================================
  // CMYK <-> LAB CONVERSIONS
  // ============================================
  
  /**
   * Convert CMYK to LAB
   */
  cmykToLab(cmyk: CMYKValues): LABValues {
    const rgb = this.cmykToRgb(cmyk)
    return this.rgbToLab(rgb)
  }
  
  /**
   * Convert LAB to CMYK
   */
  labToCmyk(lab: LABValues): CMYKValues {
    const rgb = this.labToRgb(lab)
    return this.rgbToCmyk(rgb)
  }
  
  // ============================================
  // COLOR DIFFERENCE (DELTA E)
  // ============================================
  
  /**
   * Calculate Delta E (CIE76)
   */
  deltaE76(lab1: LABValues, lab2: LABValues): number {
    const dL = lab1.l - lab2.l
    const da = lab1.a - lab2.a
    const db = lab1.b - lab2.b
    
    return Math.sqrt(dL * dL + da * da + db * db)
  }
  
  /**
   * Calculate Delta E (CIE94)
   */
  deltaE94(lab1: LABValues, lab2: LABValues): number {
    const dL = lab1.l - lab2.l
    const da = lab1.a - lab2.a
    const db = lab1.b - lab2.b
    
    const c1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b)
    const c2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b)
    const dC = c1 - c2
    
    const dH2 = da * da + db * db - dC * dC
    const dH = dH2 > 0 ? Math.sqrt(dH2) : 0
    
    const kL = 1
    const kC = 1
    const kH = 1
    const k1 = 0.045
    const k2 = 0.015
    
    const sL = 1
    const sC = 1 + k1 * c1
    const sH = 1 + k2 * c1
    
    const dLk = dL / (kL * sL)
    const dCk = dC / (kC * sC)
    const dHk = dH / (kH * sH)
    
    return Math.sqrt(dLk * dLk + dCk * dCk + dHk * dHk)
  }
  
  /**
   * Calculate Delta E (CIE2000)
   */
  deltaE2000(lab1: LABValues, lab2: LABValues): number {
    const kL = 1
    const kC = 1
    const kH = 1
    
    const c1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b)
    const c2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b)
    const cAvg = (c1 + c2) / 2
    
    const c7 = Math.pow(cAvg, 7)
    const g = 0.5 * (1 - Math.sqrt(c7 / (c7 + Math.pow(25, 7))))
    
    const a1p = lab1.a * (1 + g)
    const a2p = lab2.a * (1 + g)
    
    const c1p = Math.sqrt(a1p * a1p + lab1.b * lab1.b)
    const c2p = Math.sqrt(a2p * a2p + lab2.b * lab2.b)
    
    const h1p = Math.atan2(lab1.b, a1p) * 180 / Math.PI
    const h2p = Math.atan2(lab2.b, a2p) * 180 / Math.PI
    
    const h1pAdj = h1p < 0 ? h1p + 360 : h1p
    const h2pAdj = h2p < 0 ? h2p + 360 : h2p
    
    const dLp = lab2.l - lab1.l
    const dCp = c2p - c1p
    
    let dhp: number
    if (c1p * c2p === 0) {
      dhp = 0
    } else if (Math.abs(h2pAdj - h1pAdj) <= 180) {
      dhp = h2pAdj - h1pAdj
    } else if (h2pAdj - h1pAdj > 180) {
      dhp = h2pAdj - h1pAdj - 360
    } else {
      dhp = h2pAdj - h1pAdj + 360
    }
    
    const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin(dhp * Math.PI / 360)
    
    const lAvg = (lab1.l + lab2.l) / 2
    const cpAvg = (c1p + c2p) / 2
    
    let hpAvg: number
    if (c1p * c2p === 0) {
      hpAvg = h1pAdj + h2pAdj
    } else if (Math.abs(h1pAdj - h2pAdj) <= 180) {
      hpAvg = (h1pAdj + h2pAdj) / 2
    } else if (h1pAdj + h2pAdj < 360) {
      hpAvg = (h1pAdj + h2pAdj + 360) / 2
    } else {
      hpAvg = (h1pAdj + h2pAdj - 360) / 2
    }
    
    const t = 1 - 0.17 * Math.cos((hpAvg - 30) * Math.PI / 180) +
              0.24 * Math.cos(2 * hpAvg * Math.PI / 180) +
              0.32 * Math.cos((3 * hpAvg + 6) * Math.PI / 180) -
              0.20 * Math.cos((4 * hpAvg - 63) * Math.PI / 180)
    
    const dTheta = 30 * Math.exp(-Math.pow((hpAvg - 275) / 25, 2))
    const cpAvg7 = Math.pow(cpAvg, 7)
    const rc = 2 * Math.sqrt(cpAvg7 / (cpAvg7 + Math.pow(25, 7)))
    
    const lAvg50 = Math.pow(lAvg - 50, 2)
    const sL = 1 + (0.015 * lAvg50) / Math.sqrt(20 + lAvg50)
    const sC = 1 + 0.045 * cpAvg
    const sH = 1 + 0.015 * cpAvg * t
    const rt = -Math.sin(2 * dTheta * Math.PI / 180) * rc
    
    const dE = Math.sqrt(
      Math.pow(dLp / (kL * sL), 2) +
      Math.pow(dCp / (kC * sC), 2) +
      Math.pow(dHp / (kH * sH), 2) +
      rt * (dCp / (kC * sC)) * (dHp / (kH * sH))
    )
    
    return dE
  }
  
  // ============================================
  // COLOR UTILITIES
  // ============================================
  
  /**
   * Calculate luminance (Y) from RGB
   */
  calculateLuminance(rgb: RGBValues): number {
    // Relative luminance formula
    const r = rgb.r <= 0.03928 ? rgb.r / 12.92 : Math.pow((rgb.r + 0.055) / 1.055, 2.4)
    const g = rgb.g <= 0.03928 ? rgb.g / 12.92 : Math.pow((rgb.g + 0.055) / 1.055, 2.4)
    const b = rgb.b <= 0.03928 ? rgb.b / 12.92 : Math.pow((rgb.b + 0.055) / 1.055, 2.4)
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  
  /**
   * Calculate contrast ratio between two colors
   */
  calculateContrastRatio(rgb1: RGBValues, rgb2: RGBValues): number {
    const l1 = this.calculateLuminance(rgb1)
    const l2 = this.calculateLuminance(rgb2)
    
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    
    return (lighter + 0.05) / (darker + 0.05)
  }
  
  /**
   * Check if color is considered "black"
   */
  isBlack(cmyk: CMYKValues, threshold: number = 0.9): boolean {
    return cmyk.k >= threshold && cmyk.c < 0.1 && cmyk.m < 0.1 && cmyk.y < 0.1
  }
  
  /**
   * Check if color is considered "white"
   */
  isWhite(cmyk: CMYKValues, threshold: number = 0.05): boolean {
    return cmyk.c < threshold && cmyk.m < threshold && 
           cmyk.y < threshold && cmyk.k < threshold
  }
  
  /**
   * Check if color is rich black
   */
  isRichBlack(cmyk: CMYKValues): boolean {
    return cmyk.k >= 0.9 && (cmyk.c > 0.3 || cmyk.m > 0.3 || cmyk.y > 0.3)
  }
  
  /**
   * Create standard rich black
   */
  createRichBlack(type: 'cool' | 'warm' | 'neutral' = 'neutral'): CMYKValues {
    switch (type) {
      case 'cool':
        return { c: 0.6, m: 0.4, y: 0.4, k: 1 }
      case 'warm':
        return { c: 0.4, m: 0.4, y: 0.6, k: 1 }
      case 'neutral':
      default:
        return { c: 0.4, m: 0.4, y: 0.4, k: 1 }
    }
  }
  
  /**
   * Calculate total ink coverage
   */
  calculateTotalInk(cmyk: CMYKValues): number {
    return (cmyk.c + cmyk.m + cmyk.y + cmyk.k) * 100
  }
  
  /**
   * Reduce total ink coverage
   */
  reduceTotalInk(cmyk: CMYKValues, maxTAC: number): CMYKValues {
    const currentTAC = this.calculateTotalInk(cmyk)
    
    if (currentTAC <= maxTAC) {
      return cmyk
    }
    
    const ratio = maxTAC / currentTAC
    
    // Preserve K, reduce CMY proportionally
    const kReduction = Math.min(cmyk.k, (currentTAC - maxTAC) / 100)
    const newK = cmyk.k - kReduction
    
    const remainingReduction = (currentTAC - maxTAC) / 100 - kReduction
    const cmyTotal = cmyk.c + cmyk.m + cmyk.y
    
    if (cmyTotal > 0 && remainingReduction > 0) {
      const cmyRatio = 1 - (remainingReduction / cmyTotal)
      return {
        c: cmyk.c * cmyRatio,
        m: cmyk.m * cmyRatio,
        y: cmyk.y * cmyRatio,
        k: newK
      }
    }
    
    return {
      c: cmyk.c * ratio,
      m: cmyk.m * ratio,
      y: cmyk.y * ratio,
      k: cmyk.k * ratio
    }
  }
  
  /**
   * Convert ExtendedColor to CMYK
   */
  extendedColorToCmyk(color: ExtendedColor): CMYKValues {
    if (color.cmyk) {
      return color.cmyk
    }
    
    if (color.rgb) {
      return this.rgbToCmyk(color.rgb)
    }
    
    if (color.lab) {
      return this.labToCmyk(color.lab)
    }
    
    if (color.gray !== undefined) {
      return { c: 0, m: 0, y: 0, k: 1 - color.gray }
    }
    
    if (color.spot?.alternateValues) {
      return {
        c: color.spot.alternateValues[0] || 0,
        m: color.spot.alternateValues[1] || 0,
        y: color.spot.alternateValues[2] || 0,
        k: color.spot.alternateValues[3] || 0
      }
    }
    
    return { c: 0, m: 0, y: 0, k: 0 }
  }
}

// Export singleton
export const colorManagement = new ColorManagementSystem()
