/**
 * GPCS CodeStudio - Auto-Trapping Engine
 * Test Suite (TODO 7)
 * 
 * Covers:
 * - Crossing colors
 * - Metallic vs CMYK
 * - Gradients vs spot colors
 * - Stacked trapping
 * - Hairlines and small details
 */

import {
  buildColorDefinition,
  calculateOpticalDensity,
  calculateNeutralDensity,
  rgbToCmyk,
  cmykToRgb,
  rgbToLab,
} from '../core/ColorAnalyzer'

import {
  resolveTrapDirection,
  resolveTrapWidth,
  resolveSpecialCase,
  calculateColorPriority,
  TrapRuleEngine,
} from '../core/TrapRuleEngine'

import {
  offsetPath,
  generateTrap,
} from '../core/TrapGenerator'

import {
  generateQCReport,
} from '../core/QualityChecks'

import type {
  CMYKColor,
  ColorDefinition,
  TrapSettings,
  BezierPath,
  ColorRegion,
  TrapDecision,
} from '../types/trappingTypes'

import { DEFAULT_TRAP_SETTINGS } from '../types/trappingTypes'

// ============================================
// TEST UTILITIES
// ============================================

function createTestColor(
  id: string,
  cmyk: CMYKColor,
  type: ColorDefinition['type'] = 'PROCESS_CMYK'
): ColorDefinition {
  const color = buildColorDefinition(id, cmyk)
  color.type = type
  return color
}

function createTestPath(points: { x: number; y: number }[]): BezierPath {
  return {
    id: 'test_path',
    points: points.map(p => ({ anchor: p })),
    closed: true
  }
}

function createTestRegion(
  id: string,
  color: ColorDefinition,
  path: BezierPath
): ColorRegion {
  return {
    id,
    objectId: `obj_${id}`,
    colorId: color.id,
    color,
    contour: path,
    area: 100,
    adjacentRegions: []
  }
}

// ============================================
// COLOR CONVERSION TESTS
// ============================================

describe('Color Conversion', () => {
  test('RGB to CMYK conversion', () => {
    // Pure red
    const red = rgbToCmyk({ r: 255, g: 0, b: 0 })
    expect(red.c).toBe(0)
    expect(red.m).toBe(100)
    expect(red.y).toBe(100)
    expect(red.k).toBe(0)

    // Pure black
    const black = rgbToCmyk({ r: 0, g: 0, b: 0 })
    expect(black.k).toBe(100)

    // Pure white
    const white = rgbToCmyk({ r: 255, g: 255, b: 255 })
    expect(white.c).toBe(0)
    expect(white.m).toBe(0)
    expect(white.y).toBe(0)
    expect(white.k).toBe(0)
  })

  test('CMYK to RGB conversion', () => {
    // Cyan
    const cyan = cmykToRgb({ c: 100, m: 0, y: 0, k: 0 })
    expect(cyan.r).toBe(0)
    expect(cyan.g).toBe(255)
    expect(cyan.b).toBe(255)

    // Black
    const black = cmykToRgb({ c: 0, m: 0, y: 0, k: 100 })
    expect(black.r).toBe(0)
    expect(black.g).toBe(0)
    expect(black.b).toBe(0)
  })

  test('RGB to LAB conversion', () => {
    // White should have L=100
    const white = rgbToLab({ r: 255, g: 255, b: 255 })
    expect(white.l).toBeCloseTo(100, 0)

    // Black should have L=0
    const black = rgbToLab({ r: 0, g: 0, b: 0 })
    expect(black.l).toBeCloseTo(0, 0)
  })
})

// ============================================
// OPTICAL DENSITY TESTS
// ============================================

describe('Optical Density Calculation', () => {
  test('Black has highest density', () => {
    const black = { c: 0, m: 0, y: 0, k: 100 }
    const white = { c: 0, m: 0, y: 0, k: 0 }
    
    const blackDensity = calculateOpticalDensity(black)
    const whiteDensity = calculateOpticalDensity(white)
    
    expect(blackDensity).toBeGreaterThan(whiteDensity)
  })

  test('Rich black has higher density than 100K', () => {
    const richBlack = { c: 60, m: 40, y: 40, k: 100 }
    const pureBlack = { c: 0, m: 0, y: 0, k: 100 }
    
    const richDensity = calculateOpticalDensity(richBlack)
    const pureDensity = calculateOpticalDensity(pureBlack)
    
    expect(richDensity).toBeGreaterThan(pureDensity)
  })

  test('Neutral density calculation', () => {
    const cyan = { c: 100, m: 0, y: 0, k: 0 }
    const magenta = { c: 0, m: 100, y: 0, k: 0 }
    
    const cyanND = calculateNeutralDensity(cyan)
    const magentaND = calculateNeutralDensity(magenta)
    
    // Magenta typically has higher neutral density than cyan
    expect(magentaND).toBeGreaterThan(cyanND)
  })
})

// ============================================
// TRAP DIRECTION TESTS
// ============================================

describe('Trap Direction Resolution', () => {
  const settings = DEFAULT_TRAP_SETTINGS

  test('Dark color chokes light color', () => {
    const dark = createTestColor('dark', { c: 0, m: 0, y: 0, k: 80 })
    const light = createTestColor('light', { c: 10, m: 10, y: 10, k: 0 })
    
    const direction = resolveTrapDirection(dark, light, settings)
    
    expect(direction).toBe('CHOKE')
  })

  test('Light color spreads into dark', () => {
    const dark = createTestColor('dark', { c: 0, m: 0, y: 0, k: 80 })
    const light = createTestColor('light', { c: 10, m: 10, y: 10, k: 0 })
    
    const direction = resolveTrapDirection(light, dark, settings)
    
    expect(direction).toBe('SPREAD')
  })

  test('Similar colors use centerline', () => {
    const colorA = createTestColor('a', { c: 50, m: 50, y: 0, k: 0 })
    const colorB = createTestColor('b', { c: 55, m: 45, y: 0, k: 0 })
    
    const direction = resolveTrapDirection(colorA, colorB, settings)
    
    expect(direction).toBe('CENTERLINE')
  })

  test('White underprint always spreads', () => {
    const white = createTestColor('white', { c: 0, m: 0, y: 0, k: 0 }, 'WHITE_UNDERPRINT')
    const cmyk = createTestColor('cmyk', { c: 50, m: 50, y: 50, k: 0 })
    
    const direction = resolveTrapDirection(white, cmyk, settings)
    
    expect(direction).toBe('SPREAD')
  })

  test('Black always chokes', () => {
    const black = createTestColor('black', { c: 0, m: 0, y: 0, k: 100 })
    const color = createTestColor('color', { c: 100, m: 0, y: 0, k: 0 })
    
    const direction = resolveTrapDirection(black, color, settings)
    
    expect(direction).toBe('CHOKE')
  })
})

// ============================================
// SPECIAL CASE TESTS
// ============================================

describe('Special Case Handling', () => {
  const settings = DEFAULT_TRAP_SETTINGS

  test('Metallic vs CMYK', () => {
    const metallic = createTestColor('metallic', { c: 0, m: 0, y: 0, k: 30 }, 'METALLIC')
    const cmyk = createTestColor('cmyk', { c: 50, m: 50, y: 0, k: 0 })
    
    const geometry = {
      edgeLength: 10,
      isSmallObject: false,
      hasSharpAngles: false,
      isThinLine: false,
      isText: false
    }
    
    const result = resolveSpecialCase(metallic, cmyk, geometry, settings)
    
    expect(result.handled).toBe(true)
    expect(result.direction).toBe('CHOKE') // Metallic chokes CMYK
    expect(result.width).toBe(settings.metallicTrapWidthMm)
  })

  test('White underprint spread', () => {
    const white = createTestColor('white', { c: 0, m: 0, y: 0, k: 0 }, 'WHITE_UNDERPRINT')
    const cmyk = createTestColor('cmyk', { c: 50, m: 50, y: 0, k: 0 })
    
    const geometry = {
      edgeLength: 10,
      isSmallObject: false,
      hasSharpAngles: false,
      isThinLine: false,
      isText: false
    }
    
    const result = resolveSpecialCase(white, cmyk, geometry, settings)
    
    expect(result.handled).toBe(true)
    expect(result.direction).toBe('SPREAD')
    expect(result.width).toBe(settings.whiteSpreadMm)
  })

  test('Small text - no trap', () => {
    const colorA = createTestColor('a', { c: 100, m: 0, y: 0, k: 0 })
    const colorB = createTestColor('b', { c: 0, m: 100, y: 0, k: 0 })
    
    const geometry = {
      edgeLength: 5,
      isSmallObject: false,
      hasSharpAngles: false,
      isThinLine: false,
      isText: true,
      textSizePt: 4 // Below minimum
    }
    
    const result = resolveSpecialCase(colorA, colorB, geometry, settings)
    
    expect(result.handled).toBe(true)
    expect(result.direction).toBe('NONE')
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

// ============================================
// TRAP WIDTH TESTS
// ============================================

describe('Trap Width Resolution', () => {
  const settings = DEFAULT_TRAP_SETTINGS

  test('Default width for normal colors', () => {
    const colorA = createTestColor('a', { c: 100, m: 0, y: 0, k: 0 })
    const colorB = createTestColor('b', { c: 0, m: 100, y: 0, k: 0 })
    
    const geometry = {
      edgeLength: 10,
      isSmallObject: false,
      hasSharpAngles: false,
      isThinLine: false,
      isText: false
    }
    
    const width = resolveTrapWidth(colorA, colorB, geometry, settings)
    
    // Should be close to default (adjusted for technology)
    expect(width).toBeGreaterThanOrEqual(settings.minWidthMm)
    expect(width).toBeLessThanOrEqual(settings.maxWidthMm)
  })

  test('Reduced width for small text', () => {
    const colorA = createTestColor('a', { c: 100, m: 0, y: 0, k: 0 })
    const colorB = createTestColor('b', { c: 0, m: 100, y: 0, k: 0 })
    
    const normalGeometry = {
      edgeLength: 10,
      isSmallObject: false,
      hasSharpAngles: false,
      isThinLine: false,
      isText: false
    }
    
    const textGeometry = {
      edgeLength: 10,
      isSmallObject: false,
      hasSharpAngles: false,
      isThinLine: false,
      isText: true,
      textSizePt: 8
    }
    
    const normalWidth = resolveTrapWidth(colorA, colorB, normalGeometry, settings)
    const textWidth = resolveTrapWidth(colorA, colorB, textGeometry, settings)
    
    expect(textWidth).toBeLessThan(normalWidth)
  })

  test('White underprint uses special width', () => {
    const white = createTestColor('white', { c: 0, m: 0, y: 0, k: 0 }, 'WHITE_UNDERPRINT')
    const cmyk = createTestColor('cmyk', { c: 50, m: 50, y: 0, k: 0 })
    
    const geometry = {
      edgeLength: 10,
      isSmallObject: false,
      hasSharpAngles: false,
      isThinLine: false,
      isText: false
    }
    
    const width = resolveTrapWidth(white, cmyk, geometry, settings)
    
    // Should use white spread width (adjusted for technology)
    expect(width).toBeGreaterThanOrEqual(settings.whiteSpreadMm * 0.8)
  })
})

// ============================================
// PATH OFFSET TESTS
// ============================================

describe('Path Offset', () => {
  test('Square path offset outward', () => {
    const square = createTestPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ])
    
    const offset = offsetPath(square, {
      distance: 1,
      cornerStyle: 'MITER',
      miterLimit: 4,
      stepSize: 0.1,
      direction: 'LEFT'
    })
    
    // Offset path should be larger
    expect(offset.points.length).toBe(square.points.length)
    
    // First point should be offset
    expect(offset.points[0].anchor.x).toBeLessThan(square.points[0].anchor.x)
    expect(offset.points[0].anchor.y).toBeLessThan(square.points[0].anchor.y)
  })

  test('Square path offset inward', () => {
    const square = createTestPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ])
    
    const offset = offsetPath(square, {
      distance: 1,
      cornerStyle: 'MITER',
      miterLimit: 4,
      stepSize: 0.1,
      direction: 'RIGHT'
    })
    
    // Offset path should be smaller
    expect(offset.points[0].anchor.x).toBeGreaterThan(square.points[0].anchor.x)
    expect(offset.points[0].anchor.y).toBeGreaterThan(square.points[0].anchor.y)
  })
})

// ============================================
// TRAP GENERATION TESTS
// ============================================

describe('Trap Generation', () => {
  const settings = DEFAULT_TRAP_SETTINGS

  test('Generate trap between two regions', () => {
    const colorA = createTestColor('a', { c: 100, m: 0, y: 0, k: 0 })
    const colorB = createTestColor('b', { c: 0, m: 100, y: 0, k: 0 })
    
    const pathA = createTestPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ])
    
    const pathB = createTestPath([
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 10, y: 10 }
    ])
    
    const regionA = createTestRegion('a', colorA, pathA)
    const regionB = createTestRegion('b', colorB, pathB)
    
    const decision: TrapDecision = {
      regionAId: 'a',
      regionBId: 'b',
      direction: 'SPREAD',
      widthMm: 0.15,
      style: 'NORMAL',
      appliedRule: {
        id: 'default',
        name: 'Default',
        priority: 0,
        sourceColorTypes: ['PROCESS_CMYK'],
        targetColorTypes: ['PROCESS_CMYK'],
        direction: 'SPREAD',
        widthMm: 0.15,
        style: 'NORMAL',
        applyToText: true,
        minTextSizePt: 6,
        applyToThinLines: false,
        minLineWidthMm: 0.25
      },
      colorPriorityA: 0.5,
      colorPriorityB: 0.6,
      warnings: []
    }
    
    const trap = generateTrap(regionA, regionB, decision, settings)
    
    expect(trap).not.toBeNull()
    expect(trap?.widthMm).toBe(0.15)
    expect(trap?.overprint).toBe(true)
  })

  test('No trap for NONE direction', () => {
    const colorA = createTestColor('a', { c: 100, m: 0, y: 0, k: 0 })
    const colorB = createTestColor('b', { c: 0, m: 100, y: 0, k: 0 })
    
    const pathA = createTestPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])
    const pathB = createTestPath([{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 10, y: 10 }])
    
    const regionA = createTestRegion('a', colorA, pathA)
    const regionB = createTestRegion('b', colorB, pathB)
    
    const decision: TrapDecision = {
      regionAId: 'a',
      regionBId: 'b',
      direction: 'NONE',
      widthMm: 0,
      style: 'NORMAL',
      appliedRule: {
        id: 'none',
        name: 'None',
        priority: 0,
        sourceColorTypes: [],
        targetColorTypes: [],
        direction: 'NONE',
        widthMm: 0,
        style: 'NORMAL',
        applyToText: false,
        minTextSizePt: 6,
        applyToThinLines: false,
        minLineWidthMm: 0.25
      },
      colorPriorityA: 0,
      colorPriorityB: 0,
      warnings: []
    }
    
    const trap = generateTrap(regionA, regionB, decision, settings)
    
    expect(trap).toBeNull()
  })
})

// ============================================
// RULE ENGINE TESTS
// ============================================

describe('Trap Rule Engine', () => {
  test('Custom rule takes precedence', () => {
    const settings: TrapSettings = {
      ...DEFAULT_TRAP_SETTINGS,
      customRules: [{
        id: 'custom1',
        name: 'Custom Cyan-Magenta',
        priority: 10,
        sourceColorTypes: ['PROCESS_CMYK'],
        targetColorTypes: ['PROCESS_CMYK'],
        direction: 'CENTERLINE',
        widthMm: 0.25,
        style: 'ABUTTED',
        applyToText: true,
        minTextSizePt: 6,
        applyToThinLines: true,
        minLineWidthMm: 0.1
      }]
    }
    
    const engine = new TrapRuleEngine(settings)
    
    const colorA = createTestColor('a', { c: 100, m: 0, y: 0, k: 0 })
    const colorB = createTestColor('b', { c: 0, m: 100, y: 0, k: 0 })
    
    const rule = engine.findMatchingRule(colorA, colorB)
    
    expect(rule).not.toBeNull()
    expect(rule?.id).toBe('custom1')
    expect(rule?.widthMm).toBe(0.25)
  })

  test('Settings update propagates', () => {
    const engine = new TrapRuleEngine(DEFAULT_TRAP_SETTINGS)
    
    engine.updateSettings({ defaultWidthMm: 0.3 })
    
    const settings = engine.getSettings()
    expect(settings.defaultWidthMm).toBe(0.3)
  })
})

// ============================================
// COLOR PRIORITY TESTS
// ============================================

describe('Color Priority', () => {
  test('Black has highest priority', () => {
    const black = createTestColor('black', { c: 0, m: 0, y: 0, k: 100 })
    const cyan = createTestColor('cyan', { c: 100, m: 0, y: 0, k: 0 })
    const yellow = createTestColor('yellow', { c: 0, m: 0, y: 100, k: 0 })
    
    const blackPriority = calculateColorPriority(black, 'NEUTRAL_DENSITY')
    const cyanPriority = calculateColorPriority(cyan, 'NEUTRAL_DENSITY')
    const yellowPriority = calculateColorPriority(yellow, 'NEUTRAL_DENSITY')
    
    expect(blackPriority).toBeGreaterThan(cyanPriority)
    expect(cyanPriority).toBeGreaterThan(yellowPriority)
  })

  test('Luminance method inverts brightness', () => {
    const dark = createTestColor('dark', { c: 0, m: 0, y: 0, k: 80 })
    const light = createTestColor('light', { c: 0, m: 0, y: 0, k: 20 })
    
    const darkPriority = calculateColorPriority(dark, 'LUMINANCE')
    const lightPriority = calculateColorPriority(light, 'LUMINANCE')
    
    expect(darkPriority).toBeGreaterThan(lightPriority)
  })
})

// ============================================
// EDGE CASE TESTS
// ============================================

describe('Edge Cases', () => {
  test('Hairline stroke handling', () => {
    const settings = { ...DEFAULT_TRAP_SETTINGS, trapThinLines: false }
    
    const colorA = createTestColor('a', { c: 100, m: 0, y: 0, k: 0 })
    const colorB = createTestColor('b', { c: 0, m: 100, y: 0, k: 0 })
    
    const geometry = {
      edgeLength: 10,
      isSmallObject: false,
      hasSharpAngles: false,
      isThinLine: true,
      isText: false,
      strokeWidthMm: 0.05
    }
    
    const result = resolveSpecialCase(colorA, colorB, geometry, settings)
    
    // Should have warning about thin line
    expect(result.warnings.some(w => w.type === 'THIN_LINE')).toBe(true)
  })

  test('Sharp angle handling', () => {
    const settings = DEFAULT_TRAP_SETTINGS
    
    const colorA = createTestColor('a', { c: 100, m: 0, y: 0, k: 0 })
    const colorB = createTestColor('b', { c: 0, m: 100, y: 0, k: 0 })
    
    const normalGeometry = {
      edgeLength: 10,
      isSmallObject: false,
      hasSharpAngles: false,
      isThinLine: false,
      isText: false
    }
    
    const sharpGeometry = {
      edgeLength: 10,
      isSmallObject: false,
      hasSharpAngles: true,
      isThinLine: false,
      isText: false
    }
    
    const normalWidth = resolveTrapWidth(colorA, colorB, normalGeometry, settings)
    const sharpWidth = resolveTrapWidth(colorA, colorB, sharpGeometry, settings)
    
    // Sharp angles should have reduced trap width
    expect(sharpWidth).toBeLessThan(normalWidth)
  })

  test('Stacked objects trapping', () => {
    // When multiple objects overlap, each edge should be trapped independently
    const colorA = createTestColor('a', { c: 100, m: 0, y: 0, k: 0 })
    const colorB = createTestColor('b', { c: 0, m: 100, y: 0, k: 0 })
    const colorC = createTestColor('c', { c: 0, m: 0, y: 100, k: 0 })
    
    // A-B edge
    const dirAB = resolveTrapDirection(colorA, colorB, DEFAULT_TRAP_SETTINGS)
    // B-C edge
    const dirBC = resolveTrapDirection(colorB, colorC, DEFAULT_TRAP_SETTINGS)
    
    // Both edges should have valid trap directions
    expect(['SPREAD', 'CHOKE', 'CENTERLINE']).toContain(dirAB)
    expect(['SPREAD', 'CHOKE', 'CENTERLINE']).toContain(dirBC)
  })
})

// ============================================
// PERFORMANCE TESTS
// ============================================

describe('Performance', () => {
  test('Large path offset performance', () => {
    // Create a complex path with many points
    const points: { x: number; y: number }[] = []
    for (let i = 0; i < 1000; i++) {
      const angle = (i / 1000) * Math.PI * 2
      points.push({
        x: Math.cos(angle) * 50 + 50,
        y: Math.sin(angle) * 50 + 50
      })
    }
    
    const complexPath = createTestPath(points)
    
    const start = performance.now()
    
    offsetPath(complexPath, {
      distance: 0.15,
      cornerStyle: 'MITER',
      miterLimit: 4,
      stepSize: 0.1,
      direction: 'LEFT'
    })
    
    const duration = performance.now() - start
    
    // Should complete in reasonable time (< 100ms)
    expect(duration).toBeLessThan(100)
  })
})

// ============================================
// QC REPORT TESTS
// ============================================

describe('QC Report Generation', () => {
  test('Report includes all sections', () => {
    const result = {
      passed: true,
      warnings: [{ type: 'SMALL_TEXT' as const, severity: 'WARNING' as const, message: 'Test warning' }],
      errors: [],
      info: [{ type: 'COMPLEX_GEOMETRY' as const, severity: 'INFO' as const, message: 'Test info' }],
      summary: {
        totalChecks: 5,
        passedChecks: 5,
        failedChecks: 0,
        warningCount: 1,
        errorCount: 0,
        criticalIssues: []
      }
    }
    
    const report = generateQCReport(result)
    
    expect(report).toContain('PASSED')
    expect(report).toContain('WARNINGS')
    expect(report).toContain('Test warning')
    expect(report).toContain('INFO')
    expect(report).toContain('Test info')
  })
})
