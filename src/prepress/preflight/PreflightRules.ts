/**
 * GPCS CodeStudio - Preflight Rules
 * 
 * Predefined preflight rules and profiles for prepress
 */

import type {
  PreflightProfile,
  PreflightRule,
  PreflightSettings,
} from '../types/PrepressTypes'

/**
 * Default preflight settings
 */
export const DEFAULT_PREFLIGHT_SETTINGS: PreflightSettings = {
  minImageResolution: 300,
  minLineArtResolution: 1200,
  maxImageResolution: 2400,
  tacLimit: 300,
  allowRGB: false,
  allowLAB: false,
  requireOutputIntent: true,
  requireEmbeddedFonts: true,
  requireSubsetFonts: false,
  minFontSize: 6,
  requiredBleed: 3,
  allowTransparency: true,
  targetPDFVersion: '1.6',
  targetStandard: 'PDF/X-4'
}

/**
 * Default preflight rules
 */
export const DEFAULT_PREFLIGHT_RULES: PreflightRule[] = [
  // Document rules
  {
    id: 'doc_pdf_version',
    name: 'PDF Version',
    description: 'Check PDF version compatibility',
    category: 'DOCUMENT',
    severity: 'WARNING',
    checkType: 'PDF_VERSION',
    parameters: { minVersion: '1.4' },
    enabled: true,
    canAutoFix: false
  },
  {
    id: 'doc_output_intent',
    name: 'Output Intent',
    description: 'Check for output intent',
    category: 'OUTPUT_INTENT',
    severity: 'WARNING',
    checkType: 'OUTPUT_INTENT',
    parameters: { required: true },
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Add output intent'
  },
  {
    id: 'doc_trapped',
    name: 'Trapped Key',
    description: 'Check trapped key setting',
    category: 'DOCUMENT',
    severity: 'INFO',
    checkType: 'TRAPPED_KEY',
    parameters: {},
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Set trapped key'
  },
  {
    id: 'doc_encryption',
    name: 'Encryption',
    description: 'Check for encryption',
    category: 'DOCUMENT',
    severity: 'ERROR',
    checkType: 'ENCRYPTION',
    parameters: {},
    enabled: true,
    canAutoFix: false
  },
  
  // Page rules
  {
    id: 'page_boxes',
    name: 'Page Boxes',
    description: 'Check for required page boxes (TrimBox, BleedBox)',
    category: 'PAGE',
    severity: 'WARNING',
    checkType: 'PAGE_BOXES',
    parameters: {},
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Set missing page boxes'
  },
  {
    id: 'page_bleed',
    name: 'Bleed Size',
    description: 'Check minimum bleed size',
    category: 'BLEED',
    severity: 'ERROR',
    checkType: 'BLEED_SIZE',
    parameters: { minBleed: 3 },
    enabled: true,
    canAutoFix: false
  },
  
  // Color rules
  {
    id: 'color_rgb',
    name: 'RGB Objects',
    description: 'Check for RGB color objects',
    category: 'COLOR',
    severity: 'ERROR',
    checkType: 'RGB_OBJECTS',
    parameters: {},
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Convert RGB to CMYK'
  },
  {
    id: 'color_lab',
    name: 'LAB Objects',
    description: 'Check for LAB color objects',
    category: 'COLOR',
    severity: 'WARNING',
    checkType: 'LAB_OBJECTS',
    parameters: {},
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Convert LAB to CMYK'
  },
  {
    id: 'color_registration',
    name: 'Registration Color',
    description: 'Check for registration color in artwork',
    category: 'COLOR',
    severity: 'ERROR',
    checkType: 'REGISTRATION_COLOR',
    parameters: {},
    enabled: true,
    canAutoFix: false
  },
  {
    id: 'color_rich_black',
    name: 'Rich Black',
    description: 'Check rich black composition',
    category: 'COLOR',
    severity: 'INFO',
    checkType: 'RICH_BLACK',
    parameters: { maxCMY: 0.6 },
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Adjust rich black values'
  },
  {
    id: 'color_spot',
    name: 'Spot Colors',
    description: 'Check number of spot colors',
    category: 'COLOR',
    severity: 'WARNING',
    checkType: 'SPOT_COLOR',
    parameters: { maxCount: 8 },
    enabled: true,
    canAutoFix: false
  },
  {
    id: 'color_tac',
    name: 'Total Area Coverage',
    description: 'Check TAC limit',
    category: 'COLOR',
    severity: 'ERROR',
    checkType: 'TAC_LIMIT',
    parameters: { limit: 300 },
    enabled: true,
    canAutoFix: false
  },
  
  // Font rules
  {
    id: 'font_embedded',
    name: 'Font Embedding',
    description: 'Check that all fonts are embedded',
    category: 'FONT',
    severity: 'ERROR',
    checkType: 'FONT_EMBEDDED',
    parameters: {},
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Embed fonts'
  },
  {
    id: 'font_size',
    name: 'Minimum Font Size',
    description: 'Check minimum font size',
    category: 'FONT',
    severity: 'WARNING',
    checkType: 'MINIMUM_FONT_SIZE',
    parameters: { minSize: 6 },
    enabled: true,
    canAutoFix: false
  },
  
  // Image rules
  {
    id: 'image_resolution',
    name: 'Image Resolution',
    description: 'Check minimum image resolution',
    category: 'IMAGE',
    severity: 'WARNING',
    checkType: 'IMAGE_RESOLUTION',
    parameters: { minDPI: 300 },
    enabled: true,
    canAutoFix: false
  },
  {
    id: 'image_colorspace',
    name: 'Image Color Space',
    description: 'Check image color space',
    category: 'IMAGE',
    severity: 'ERROR',
    checkType: 'IMAGE_COLOR_SPACE',
    parameters: {},
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Convert image to CMYK'
  },
  
  // Transparency rules
  {
    id: 'transparency_used',
    name: 'Transparency',
    description: 'Check for transparency',
    category: 'TRANSPARENCY',
    severity: 'INFO',
    checkType: 'TRANSPARENCY_USED',
    parameters: {},
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Flatten transparency'
  },
  {
    id: 'transparency_blend',
    name: 'Blend Modes',
    description: 'Check for blend modes',
    category: 'TRANSPARENCY',
    severity: 'INFO',
    checkType: 'BLEND_MODE',
    parameters: {},
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Flatten blend modes'
  },
  
  // Overprint rules
  {
    id: 'overprint_white',
    name: 'White Overprint',
    description: 'Check for white objects set to overprint',
    category: 'OVERPRINT',
    severity: 'ERROR',
    checkType: 'OVERPRINT_WHITE',
    parameters: {},
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Set white to knockout'
  },
  {
    id: 'overprint_black',
    name: 'Black Overprint',
    description: 'Check black overprint settings',
    category: 'OVERPRINT',
    severity: 'INFO',
    checkType: 'OVERPRINT_BLACK',
    parameters: {},
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Set black to overprint'
  },
  
  // Layer rules
  {
    id: 'layer_visibility',
    name: 'Layer Visibility',
    description: 'Check layer visibility vs printability',
    category: 'LAYER',
    severity: 'WARNING',
    checkType: 'LAYER_VISIBILITY',
    parameters: {},
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Adjust layer settings'
  },
  {
    id: 'layer_printability',
    name: 'Layer Printability',
    description: 'Check technical layer printability',
    category: 'LAYER',
    severity: 'WARNING',
    checkType: 'LAYER_PRINTABILITY',
    parameters: {},
    enabled: true,
    canAutoFix: true,
    fixDescription: 'Set technical layers to non-printable'
  }
]

/**
 * Preflight profiles
 */
export const PREFLIGHT_PROFILES: PreflightProfile[] = [
  {
    id: 'flexo_standard',
    name: 'Flexo Standard',
    description: 'Standard preflight for flexographic label printing',
    rules: DEFAULT_PREFLIGHT_RULES.map(rule => ({
      ...rule,
      // Adjust for flexo
      ...(rule.id === 'color_tac' ? { parameters: { limit: 280 } } : {}),
      ...(rule.id === 'image_resolution' ? { parameters: { minDPI: 300 } } : {})
    })),
    settings: {
      ...DEFAULT_PREFLIGHT_SETTINGS,
      tacLimit: 280
    },
    createdAt: new Date(),
    modifiedAt: new Date(),
    isBuiltIn: true
  },
  {
    id: 'offset_standard',
    name: 'Offset Standard',
    description: 'Standard preflight for offset printing',
    rules: DEFAULT_PREFLIGHT_RULES.map(rule => ({
      ...rule,
      ...(rule.id === 'color_tac' ? { parameters: { limit: 340 } } : {})
    })),
    settings: {
      ...DEFAULT_PREFLIGHT_SETTINGS,
      tacLimit: 340
    },
    createdAt: new Date(),
    modifiedAt: new Date(),
    isBuiltIn: true
  },
  {
    id: 'digital_standard',
    name: 'Digital Print',
    description: 'Preflight for digital label printing',
    rules: DEFAULT_PREFLIGHT_RULES.map(rule => ({
      ...rule,
      ...(rule.id === 'color_tac' ? { parameters: { limit: 320 } } : {}),
      ...(rule.id === 'color_rgb' ? { severity: 'WARNING' as const } : {}),
      ...(rule.id === 'transparency_used' ? { enabled: false } : {})
    })),
    settings: {
      ...DEFAULT_PREFLIGHT_SETTINGS,
      tacLimit: 320,
      allowRGB: true,
      allowTransparency: true
    },
    createdAt: new Date(),
    modifiedAt: new Date(),
    isBuiltIn: true
  },
  {
    id: 'pdfx1a',
    name: 'PDF/X-1a Compliance',
    description: 'Strict PDF/X-1a compliance check',
    rules: DEFAULT_PREFLIGHT_RULES.map(rule => ({
      ...rule,
      // Stricter settings for PDF/X-1a
      ...(rule.id === 'color_rgb' ? { severity: 'ERROR' as const } : {}),
      ...(rule.id === 'transparency_used' ? { severity: 'ERROR' as const } : {}),
      ...(rule.id === 'transparency_blend' ? { severity: 'ERROR' as const } : {}),
      ...(rule.id === 'doc_output_intent' ? { severity: 'ERROR' as const } : {})
    })),
    settings: {
      ...DEFAULT_PREFLIGHT_SETTINGS,
      allowRGB: false,
      allowTransparency: false,
      targetStandard: 'PDF/X-1a'
    },
    createdAt: new Date(),
    modifiedAt: new Date(),
    isBuiltIn: true
  },
  {
    id: 'pdfx4',
    name: 'PDF/X-4 Compliance',
    description: 'PDF/X-4 compliance check (allows transparency)',
    rules: DEFAULT_PREFLIGHT_RULES.map(rule => ({
      ...rule,
      ...(rule.id === 'transparency_used' ? { severity: 'INFO' as const } : {}),
      ...(rule.id === 'transparency_blend' ? { severity: 'INFO' as const } : {})
    })),
    settings: {
      ...DEFAULT_PREFLIGHT_SETTINGS,
      allowTransparency: true,
      targetStandard: 'PDF/X-4'
    },
    createdAt: new Date(),
    modifiedAt: new Date(),
    isBuiltIn: true
  },
  {
    id: 'label_strict',
    name: 'Label Strict',
    description: 'Strict preflight for high-quality label production',
    rules: DEFAULT_PREFLIGHT_RULES.map(rule => ({
      ...rule,
      // All warnings become errors
      severity: rule.severity === 'WARNING' ? 'ERROR' as const : rule.severity,
      // Higher resolution requirement
      ...(rule.id === 'image_resolution' ? { parameters: { minDPI: 400 } } : {}),
      // Larger minimum font
      ...(rule.id === 'font_size' ? { parameters: { minSize: 5 } } : {}),
      // Larger bleed
      ...(rule.id === 'page_bleed' ? { parameters: { minBleed: 3 } } : {})
    })),
    settings: {
      ...DEFAULT_PREFLIGHT_SETTINGS,
      minImageResolution: 400,
      minFontSize: 5,
      requiredBleed: 3
    },
    createdAt: new Date(),
    modifiedAt: new Date(),
    isBuiltIn: true
  }
]

/**
 * Get profile by ID
 */
export function getPreflightProfile(id: string): PreflightProfile | undefined {
  return PREFLIGHT_PROFILES.find(p => p.id === id)
}

/**
 * Create custom profile
 */
export function createCustomProfile(
  name: string,
  description: string,
  baseProfileId?: string
): PreflightProfile {
  const baseProfile = baseProfileId 
    ? getPreflightProfile(baseProfileId) 
    : PREFLIGHT_PROFILES[0]
  
  return {
    id: `custom_${Date.now()}`,
    name,
    description,
    rules: baseProfile ? [...baseProfile.rules] : [...DEFAULT_PREFLIGHT_RULES],
    settings: baseProfile ? { ...baseProfile.settings } : { ...DEFAULT_PREFLIGHT_SETTINGS },
    createdAt: new Date(),
    modifiedAt: new Date(),
    isBuiltIn: false
  }
}

/**
 * Get rules by category
 */
export function getRulesByCategory(category: string): PreflightRule[] {
  return DEFAULT_PREFLIGHT_RULES.filter(r => r.category === category)
}
