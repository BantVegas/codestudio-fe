/**
 * GPCS CodeStudio - ICC Profile Manager
 * 
 * Manages ICC color profiles for accurate color conversion
 */

import type {
  ICCProfile,
} from '../types/PrepressTypes'

/**
 * ICC Profile header structure
 */
interface ICCProfileHeader {
  size: number
  preferredCMM: string
  version: string
  deviceClass: string
  colorSpace: string
  pcs: string
  dateTime: Date
  signature: string
  platform: string
  flags: number
  manufacturer: string
  model: string
  attributes: bigint
  renderingIntent: number
  illuminant: { x: number; y: number; z: number }
  creator: string
}

/**
 * Built-in profile definitions
 */
const BUILT_IN_PROFILES: ICCProfile[] = [
  {
    name: 'ISO Coated v2',
    description: 'ISO 12647-2:2004 Coated paper',
    colorSpace: 'CMYK',
    pcs: 'Lab',
    version: '2.1',
    deviceClass: 'output',
    renderingIntent: 'relative',
    isEmbedded: false
  },
  {
    name: 'ISO Coated v2 300',
    description: 'ISO Coated v2 with 300% TAC',
    colorSpace: 'CMYK',
    pcs: 'Lab',
    version: '2.1',
    deviceClass: 'output',
    renderingIntent: 'relative',
    isEmbedded: false
  },
  {
    name: 'PSO Uncoated ISO12647',
    description: 'Uncoated paper profile',
    colorSpace: 'CMYK',
    pcs: 'Lab',
    version: '2.1',
    deviceClass: 'output',
    renderingIntent: 'relative',
    isEmbedded: false
  },
  {
    name: 'FOGRA39',
    description: 'FOGRA39 Coated',
    colorSpace: 'CMYK',
    pcs: 'Lab',
    version: '2.1',
    deviceClass: 'output',
    renderingIntent: 'relative',
    isEmbedded: false
  },
  {
    name: 'FOGRA51',
    description: 'FOGRA51 Coated (PSO Coated v3)',
    colorSpace: 'CMYK',
    pcs: 'Lab',
    version: '4.3',
    deviceClass: 'output',
    renderingIntent: 'relative',
    isEmbedded: false
  },
  {
    name: 'GRACoL2006_Coated1v2',
    description: 'GRACoL 2006 Coated Grade 1',
    colorSpace: 'CMYK',
    pcs: 'Lab',
    version: '2.1',
    deviceClass: 'output',
    renderingIntent: 'relative',
    isEmbedded: false
  },
  {
    name: 'SWOP2006_Coated3v2',
    description: 'SWOP 2006 Coated Grade 3',
    colorSpace: 'CMYK',
    pcs: 'Lab',
    version: '2.1',
    deviceClass: 'output',
    renderingIntent: 'relative',
    isEmbedded: false
  },
  {
    name: 'sRGB IEC61966-2.1',
    description: 'Standard RGB color space',
    colorSpace: 'RGB',
    pcs: 'XYZ',
    version: '2.1',
    deviceClass: 'display',
    renderingIntent: 'perceptual',
    isEmbedded: false
  },
  {
    name: 'Adobe RGB (1998)',
    description: 'Adobe RGB color space',
    colorSpace: 'RGB',
    pcs: 'XYZ',
    version: '2.1',
    deviceClass: 'display',
    renderingIntent: 'perceptual',
    isEmbedded: false
  },
  {
    name: 'ProPhoto RGB',
    description: 'ProPhoto RGB wide gamut',
    colorSpace: 'RGB',
    pcs: 'XYZ',
    version: '2.1',
    deviceClass: 'display',
    renderingIntent: 'perceptual',
    isEmbedded: false
  }
]

/**
 * ICC Profile Manager class
 */
export class ICCProfileManager {
  private profiles: Map<string, ICCProfile> = new Map()
  private defaultCMYKProfile: string = 'ISO Coated v2'
  private defaultRGBProfile: string = 'sRGB IEC61966-2.1'
  
  constructor() {
    this.initializeBuiltInProfiles()
  }
  
  /**
   * Initialize built-in profiles
   */
  private initializeBuiltInProfiles(): void {
    for (const profile of BUILT_IN_PROFILES) {
      this.profiles.set(profile.name, profile)
    }
  }
  
  /**
   * Get profile by name
   */
  getProfile(name: string): ICCProfile | undefined {
    return this.profiles.get(name)
  }
  
  /**
   * Get all profiles
   */
  getAllProfiles(): ICCProfile[] {
    return Array.from(this.profiles.values())
  }
  
  /**
   * Get CMYK profiles
   */
  getCMYKProfiles(): ICCProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.colorSpace === 'CMYK')
  }
  
  /**
   * Get RGB profiles
   */
  getRGBProfiles(): ICCProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.colorSpace === 'RGB')
  }
  
  /**
   * Get default CMYK profile
   */
  getDefaultCMYKProfile(): ICCProfile | undefined {
    return this.profiles.get(this.defaultCMYKProfile)
  }
  
  /**
   * Get default RGB profile
   */
  getDefaultRGBProfile(): ICCProfile | undefined {
    return this.profiles.get(this.defaultRGBProfile)
  }
  
  /**
   * Set default CMYK profile
   */
  setDefaultCMYKProfile(name: string): boolean {
    const profile = this.profiles.get(name)
    if (profile && profile.colorSpace === 'CMYK') {
      this.defaultCMYKProfile = name
      return true
    }
    return false
  }
  
  /**
   * Set default RGB profile
   */
  setDefaultRGBProfile(name: string): boolean {
    const profile = this.profiles.get(name)
    if (profile && profile.colorSpace === 'RGB') {
      this.defaultRGBProfile = name
      return true
    }
    return false
  }
  
  /**
   * Load ICC profile from file
   */
  async loadProfileFromFile(file: File): Promise<ICCProfile | null> {
    try {
      const buffer = await file.arrayBuffer()
      const profile = this.parseICCProfile(buffer)
      
      if (profile) {
        this.profiles.set(profile.name, profile)
      }
      
      return profile
    } catch (error) {
      console.error('Failed to load ICC profile:', error)
      return null
    }
  }
  
  /**
   * Load ICC profile from ArrayBuffer
   */
  loadProfileFromBuffer(buffer: ArrayBuffer, name?: string): ICCProfile | null {
    try {
      const profile = this.parseICCProfile(buffer)
      
      if (profile) {
        if (name) {
          profile.name = name
        }
        this.profiles.set(profile.name, profile)
      }
      
      return profile
    } catch (error) {
      console.error('Failed to parse ICC profile:', error)
      return null
    }
  }
  
  /**
   * Parse ICC profile from buffer
   */
  private parseICCProfile(buffer: ArrayBuffer): ICCProfile | null {
    const view = new DataView(buffer)
    
    // Check minimum size
    if (buffer.byteLength < 128) {
      return null
    }
    
    // Read header
    const header = this.parseHeader(view)
    
    if (!header) {
      return null
    }
    
    // Map device class
    const deviceClassMap: Record<string, ICCProfile['deviceClass']> = {
      'scnr': 'input',
      'mntr': 'display',
      'prtr': 'output',
      'link': 'link',
      'abst': 'abstract',
      'spac': 'colorspace',
      'nmcl': 'namedcolor'
    }
    
    // Map color space
    const colorSpaceMap: Record<string, ICCProfile['colorSpace']> = {
      'GRAY': 'GRAY',
      'RGB ': 'RGB',
      'CMYK': 'CMYK',
      'Lab ': 'LAB'
    }
    
    // Map rendering intent
    const intentMap: Record<number, ICCProfile['renderingIntent']> = {
      0: 'perceptual',
      1: 'relative',
      2: 'saturation',
      3: 'absolute'
    }
    
    return {
      name: header.signature || 'Unknown Profile',
      description: `${header.colorSpace} profile`,
      colorSpace: colorSpaceMap[header.colorSpace] || 'CMYK',
      pcs: header.pcs === 'XYZ ' ? 'XYZ' : 'Lab',
      version: header.version,
      deviceClass: deviceClassMap[header.deviceClass] || 'output',
      renderingIntent: intentMap[header.renderingIntent] || 'relative',
      data: buffer,
      isEmbedded: false
    }
  }
  
  /**
   * Parse ICC profile header
   */
  private parseHeader(view: DataView): ICCProfileHeader | null {
    try {
      // Profile size
      const size = view.getUint32(0, false)
      
      // Preferred CMM
      const preferredCMM = this.readString(view, 4, 4)
      
      // Version
      const versionMajor = view.getUint8(8)
      const versionMinor = view.getUint8(9) >> 4
      const version = `${versionMajor}.${versionMinor}`
      
      // Device class
      const deviceClass = this.readString(view, 12, 4)
      
      // Color space
      const colorSpace = this.readString(view, 16, 4)
      
      // PCS
      const pcs = this.readString(view, 20, 4)
      
      // Date/time
      const year = view.getUint16(24, false)
      const month = view.getUint16(26, false)
      const day = view.getUint16(28, false)
      const hour = view.getUint16(30, false)
      const minute = view.getUint16(32, false)
      const second = view.getUint16(34, false)
      const dateTime = new Date(year, month - 1, day, hour, minute, second)
      
      // Signature
      const signature = this.readString(view, 36, 4)
      
      // Platform
      const platform = this.readString(view, 40, 4)
      
      // Flags
      const flags = view.getUint32(44, false)
      
      // Manufacturer
      const manufacturer = this.readString(view, 48, 4)
      
      // Model
      const model = this.readString(view, 52, 4)
      
      // Attributes
      const attributes = view.getBigUint64(56, false)
      
      // Rendering intent
      const renderingIntent = view.getUint32(64, false)
      
      // Illuminant
      const illuminant = {
        x: view.getInt32(68, false) / 65536,
        y: view.getInt32(72, false) / 65536,
        z: view.getInt32(76, false) / 65536
      }
      
      // Creator
      const creator = this.readString(view, 80, 4)
      
      return {
        size,
        preferredCMM,
        version,
        deviceClass,
        colorSpace,
        pcs,
        dateTime,
        signature,
        platform,
        flags,
        manufacturer,
        model,
        attributes,
        renderingIntent,
        illuminant,
        creator
      }
    } catch {
      return null
    }
  }
  
  /**
   * Read string from DataView
   */
  private readString(view: DataView, offset: number, length: number): string {
    let str = ''
    for (let i = 0; i < length; i++) {
      const charCode = view.getUint8(offset + i)
      if (charCode !== 0) {
        str += String.fromCharCode(charCode)
      }
    }
    return str.trim()
  }
  
  /**
   * Remove profile
   */
  removeProfile(name: string): boolean {
    // Don't remove built-in profiles
    if (BUILT_IN_PROFILES.some(p => p.name === name)) {
      return false
    }
    
    return this.profiles.delete(name)
  }
  
  /**
   * Check if profile exists
   */
  hasProfile(name: string): boolean {
    return this.profiles.has(name)
  }
  
  /**
   * Get profile for printing technology
   */
  getRecommendedProfile(technology: string): ICCProfile | undefined {
    const recommendations: Record<string, string> = {
      'FLEXO': 'ISO Coated v2 300',
      'OFFSET_COATED': 'FOGRA51',
      'OFFSET_UNCOATED': 'PSO Uncoated ISO12647',
      'DIGITAL': 'GRACoL2006_Coated1v2',
      'GRAVURE': 'ISO Coated v2',
      'NEWSPAPER': 'SWOP2006_Coated3v2'
    }
    
    const profileName = recommendations[technology] || this.defaultCMYKProfile
    return this.profiles.get(profileName)
  }
  
  /**
   * Validate profile for prepress use
   */
  validateProfile(profile: ICCProfile): { valid: boolean; issues: string[] } {
    const issues: string[] = []
    
    // Check color space
    if (profile.colorSpace !== 'CMYK' && profile.colorSpace !== 'RGB') {
      issues.push(`Unsupported color space: ${profile.colorSpace}`)
    }
    
    // Check version
    const versionNum = parseFloat(profile.version)
    if (versionNum < 2.0) {
      issues.push(`Profile version ${profile.version} may have compatibility issues`)
    }
    
    // Check device class for output profiles
    if (profile.colorSpace === 'CMYK' && profile.deviceClass !== 'output') {
      issues.push(`CMYK profile should be output device class, found: ${profile.deviceClass}`)
    }
    
    return {
      valid: issues.length === 0,
      issues
    }
  }
  
  /**
   * Get profile statistics
   */
  getStatistics(): {
    total: number
    cmyk: number
    rgb: number
    builtIn: number
    custom: number
  } {
    const all = Array.from(this.profiles.values())
    const builtInNames = new Set(BUILT_IN_PROFILES.map(p => p.name))
    
    return {
      total: all.length,
      cmyk: all.filter(p => p.colorSpace === 'CMYK').length,
      rgb: all.filter(p => p.colorSpace === 'RGB').length,
      builtIn: all.filter(p => builtInNames.has(p.name)).length,
      custom: all.filter(p => !builtInNames.has(p.name)).length
    }
  }
}

// Export singleton
export const iccProfileManager = new ICCProfileManager()
