/**
 * GPCS CodeStudio - Die Line Validation Engine
 * 
 * Professional validation with rules engine
 * Supports customer/technology/machine-specific rule sets
 */

import type { DieLineInfo, DieSegment, DiePath } from '../../prepress/dieline/DieLineTypes'

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO' | 'PASS'

export interface ValidationResult {
  id: string
  severity: ValidationSeverity
  code: string
  message: string
  details?: string
  segment?: string
  path?: string
  autoFix?: () => void
}

export interface ValidationProfile {
  id: string
  name: string
  description: string
  technology: 'FLEXO' | 'DIGITAL' | 'LASER' | 'OFFSET' | 'ROTARY' | 'FLATBED' | 'UNIVERSAL'
  rules: ValidationRule[]
}

export interface ValidationRule {
  id: string
  name: string
  enabled: boolean
  severity: ValidationSeverity
  check: (dieLine: DieLineInfo) => ValidationResult[]
}

// Geometry utilities
const distance = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
  Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)

const pointsEqual = (p1: { x: number; y: number }, p2: { x: number; y: number }, tolerance = 0.01) =>
  Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance

// Built-in validation rules
export const VALIDATION_RULES: ValidationRule[] = [
  // Path closure check
  {
    id: 'path-closure',
    name: 'Uzavretosť kriviek',
    enabled: true,
    severity: 'ERROR',
    check: (dieLine) => {
      const results: ValidationResult[] = []
      dieLine.paths.forEach((path, idx) => {
        if (path.segments.length > 0) {
          const first = path.segments[0]
          const last = path.segments[path.segments.length - 1]
          if (!pointsEqual(first.start, last.end)) {
            results.push({
              id: `closure-${idx}`,
              severity: 'ERROR',
              code: 'OPEN_PATH',
              message: `Cesta ${idx + 1} nie je uzavretá`,
              details: `Vzdialenosť: ${distance(first.start, last.end).toFixed(2)} mm`,
              path: path.id
            })
          }
        }
      })
      return results
    }
  },

  // Self-intersection check
  {
    id: 'self-intersection',
    name: 'Self-intersections',
    enabled: true,
    severity: 'ERROR',
    check: (dieLine) => {
      const results: ValidationResult[] = []
      dieLine.paths.forEach((path, pathIdx) => {
        for (let i = 0; i < path.segments.length; i++) {
          for (let j = i + 2; j < path.segments.length; j++) {
            if (i === 0 && j === path.segments.length - 1) continue // Skip adjacent
            const seg1 = path.segments[i]
            const seg2 = path.segments[j]
            if (segmentsIntersect(seg1, seg2)) {
              results.push({
                id: `intersection-${pathIdx}-${i}-${j}`,
                severity: 'ERROR',
                code: 'SELF_INTERSECTION',
                message: `Self-intersection v ceste ${pathIdx + 1}`,
                details: `Segmenty ${i + 1} a ${j + 1} sa pretínajú`,
                path: path.id
              })
            }
          }
        }
      })
      return results
    }
  },

  // Duplicate segments
  {
    id: 'duplicate-segments',
    name: 'Duplicitné segmenty',
    enabled: true,
    severity: 'WARNING',
    check: (dieLine) => {
      const results: ValidationResult[] = []
      const allSegments: DieSegment[] = []
      dieLine.paths.forEach(path => allSegments.push(...path.segments))
      
      for (let i = 0; i < allSegments.length; i++) {
        for (let j = i + 1; j < allSegments.length; j++) {
          const s1 = allSegments[i]
          const s2 = allSegments[j]
          if (
            (pointsEqual(s1.start, s2.start) && pointsEqual(s1.end, s2.end)) ||
            (pointsEqual(s1.start, s2.end) && pointsEqual(s1.end, s2.start))
          ) {
            results.push({
              id: `duplicate-${i}-${j}`,
              severity: 'WARNING',
              code: 'DUPLICATE_SEGMENT',
              message: 'Duplicitný segment',
              details: `Segmenty ${s1.id} a ${s2.id} sú identické`,
              segment: s1.id
            })
          }
        }
      }
      return results
    }
  },

  // Minimum radius check
  {
    id: 'min-radius',
    name: 'Minimálny rádius',
    enabled: true,
    severity: 'WARNING',
    check: (dieLine) => {
      const results: ValidationResult[] = []
      const minRadius = 1.0 // mm
      
      dieLine.paths.forEach((path, pathIdx) => {
        path.segments.forEach((seg, segIdx) => {
          if (seg.type === 'ARC' && seg.radius !== undefined) {
            if (seg.radius < minRadius) {
              results.push({
                id: `radius-${pathIdx}-${segIdx}`,
                severity: 'WARNING',
                code: 'MIN_RADIUS',
                message: `Príliš malý rádius`,
                details: `Rádius ${seg.radius.toFixed(2)} mm < ${minRadius} mm`,
                segment: seg.id
              })
            }
          }
        })
      })
      return results
    }
  },

  // Minimum segment length
  {
    id: 'min-length',
    name: 'Minimálna dĺžka segmentu',
    enabled: true,
    severity: 'WARNING',
    check: (dieLine) => {
      const results: ValidationResult[] = []
      const minLength = 0.5 // mm
      
      dieLine.paths.forEach((path, pathIdx) => {
        path.segments.forEach((seg, segIdx) => {
          const len = distance(seg.start, seg.end)
          if (len < minLength) {
            results.push({
              id: `length-${pathIdx}-${segIdx}`,
              severity: 'WARNING',
              code: 'MIN_LENGTH',
              message: `Príliš krátky segment`,
              details: `Dĺžka ${len.toFixed(3)} mm < ${minLength} mm`,
              segment: seg.id
            })
          }
        })
      })
      return results
    }
  },

  // Required layers check
  {
    id: 'required-layers',
    name: 'Povinné vrstvy',
    enabled: true,
    severity: 'WARNING',
    check: (dieLine) => {
      const results: ValidationResult[] = []
      const lineTypes = new Set<string>()
      dieLine.paths.forEach(path => {
        path.segments.forEach(seg => lineTypes.add(seg.lineType))
      })
      
      if (!lineTypes.has('CUT')) {
        results.push({
          id: 'missing-cut',
          severity: 'WARNING',
          code: 'MISSING_LAYER',
          message: 'Chýba vrstva CUT',
          details: 'Die line by mal obsahovať reznú čiaru'
        })
      }
      
      return results
    }
  },

  // Size limits
  {
    id: 'size-limits',
    name: 'Veľkostné limity',
    enabled: true,
    severity: 'INFO',
    check: (dieLine) => {
      const results: ValidationResult[] = []
      const maxWidth = 1000 // mm
      const maxHeight = 1000 // mm
      
      if (dieLine.width > maxWidth) {
        results.push({
          id: 'width-limit',
          severity: 'WARNING',
          code: 'SIZE_LIMIT',
          message: `Šírka presahuje limit`,
          details: `${dieLine.width.toFixed(1)} mm > ${maxWidth} mm`
        })
      }
      
      if (dieLine.height > maxHeight) {
        results.push({
          id: 'height-limit',
          severity: 'WARNING',
          code: 'SIZE_LIMIT',
          message: `Výška presahuje limit`,
          details: `${dieLine.height.toFixed(1)} mm > ${maxHeight} mm`
        })
      }
      
      return results
    }
  },

  // Sharp angles check
  {
    id: 'sharp-angles',
    name: 'Ostré uhly',
    enabled: true,
    severity: 'WARNING',
    check: (dieLine) => {
      const results: ValidationResult[] = []
      const minAngle = 15 // degrees
      
      dieLine.paths.forEach((path, pathIdx) => {
        for (let i = 0; i < path.segments.length; i++) {
          const curr = path.segments[i]
          const next = path.segments[(i + 1) % path.segments.length]
          
          if (pointsEqual(curr.end, next.start)) {
            const angle = calculateAngle(curr, next)
            if (angle < minAngle) {
              results.push({
                id: `angle-${pathIdx}-${i}`,
                severity: 'WARNING',
                code: 'SHARP_ANGLE',
                message: `Ostrý uhol`,
                details: `Uhol ${angle.toFixed(1)}° < ${minAngle}°`,
                segment: curr.id
              })
            }
          }
        }
      })
      return results
    }
  }
]

// Validation profiles
export const VALIDATION_PROFILES: ValidationProfile[] = [
  {
    id: 'flexo',
    name: 'Flexo tlač',
    description: 'Pravidlá pre flexografickú tlač',
    technology: 'FLEXO',
    rules: VALIDATION_RULES.map(r => ({ ...r, enabled: true }))
  },
  {
    id: 'digital',
    name: 'Digitálna tlač',
    description: 'Pravidlá pre digitálnu tlač',
    technology: 'DIGITAL',
    rules: VALIDATION_RULES.map(r => ({ ...r, enabled: true }))
  },
  {
    id: 'laser',
    name: 'Laserové rezanie',
    description: 'Pravidlá pre laserové rezanie',
    technology: 'LASER',
    rules: VALIDATION_RULES.map(r => ({
      ...r,
      enabled: true,
      severity: r.id === 'min-radius' ? 'ERROR' : r.severity
    }))
  },
  {
    id: 'rotary',
    name: 'Rotačný výsek',
    description: 'Pravidlá pre rotačný výsek',
    technology: 'ROTARY',
    rules: VALIDATION_RULES.map(r => ({ ...r, enabled: true }))
  }
]

// Helper functions
function segmentsIntersect(s1: DieSegment, s2: DieSegment): boolean {
  // Simple line-line intersection check
  const x1 = s1.start.x, y1 = s1.start.y, x2 = s1.end.x, y2 = s1.end.y
  const x3 = s2.start.x, y3 = s2.start.y, x4 = s2.end.x, y4 = s2.end.y
  
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)
  if (Math.abs(denom) < 0.0001) return false
  
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom
  
  return ua > 0.01 && ua < 0.99 && ub > 0.01 && ub < 0.99
}

function calculateAngle(seg1: DieSegment, seg2: DieSegment): number {
  const v1 = { x: seg1.end.x - seg1.start.x, y: seg1.end.y - seg1.start.y }
  const v2 = { x: seg2.end.x - seg2.start.x, y: seg2.end.y - seg2.start.y }
  
  const dot = v1.x * v2.x + v1.y * v2.y
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2)
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2)
  
  if (mag1 === 0 || mag2 === 0) return 180
  
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)))
  return Math.acos(cos) * (180 / Math.PI)
}

// Main validation function
export function validateDieLine(
  dieLine: DieLineInfo,
  profile: ValidationProfile = VALIDATION_PROFILES[0]
): ValidationResult[] {
  const results: ValidationResult[] = []
  
  for (const rule of profile.rules) {
    if (rule.enabled) {
      try {
        const ruleResults = rule.check(dieLine)
        results.push(...ruleResults)
      } catch (e) {
        results.push({
          id: `error-${rule.id}`,
          severity: 'ERROR',
          code: 'VALIDATION_ERROR',
          message: `Chyba pri validácii: ${rule.name}`,
          details: String(e)
        })
      }
    }
  }
  
  // Add pass result if no issues
  if (results.length === 0) {
    results.push({
      id: 'all-pass',
      severity: 'PASS',
      code: 'VALID',
      message: 'Die line je validný',
      details: 'Všetky kontroly prešli úspešne'
    })
  }
  
  return results
}

// Generate validation report
export function generateValidationReport(
  dieLine: DieLineInfo,
  results: ValidationResult[]
): string {
  const errors = results.filter(r => r.severity === 'ERROR')
  const warnings = results.filter(r => r.severity === 'WARNING')
  const infos = results.filter(r => r.severity === 'INFO')
  const passed = results.filter(r => r.severity === 'PASS')
  
  const status = errors.length > 0 ? 'FAIL' : warnings.length > 0 ? 'WARN' : 'PASS'
  
  let report = `
╔══════════════════════════════════════════════════════════════╗
║           GPCS CodeStudio - Validation Report                ║
╚══════════════════════════════════════════════════════════════╝

Die Line: ${dieLine.name}
Format: ${dieLine.format}
Size: ${dieLine.width.toFixed(1)} × ${dieLine.height.toFixed(1)} mm
Paths: ${dieLine.paths.length}
Segments: ${dieLine.paths.reduce((a, p) => a + p.segments.length, 0)}

═══════════════════════════════════════════════════════════════
                        RESULT: ${status}
═══════════════════════════════════════════════════════════════

`

  if (errors.length > 0) {
    report += `❌ ERRORS (${errors.length}):\n`
    errors.forEach(e => {
      report += `   • ${e.message}\n`
      if (e.details) report += `     ${e.details}\n`
    })
    report += '\n'
  }

  if (warnings.length > 0) {
    report += `⚠️ WARNINGS (${warnings.length}):\n`
    warnings.forEach(w => {
      report += `   • ${w.message}\n`
      if (w.details) report += `     ${w.details}\n`
    })
    report += '\n'
  }

  if (infos.length > 0) {
    report += `ℹ️ INFO (${infos.length}):\n`
    infos.forEach(i => {
      report += `   • ${i.message}\n`
    })
    report += '\n'
  }

  if (passed.length > 0 && errors.length === 0 && warnings.length === 0) {
    report += `✅ All checks passed!\n\n`
  }

  report += `═══════════════════════════════════════════════════════════════
Generated: ${new Date().toISOString()}
GPCS CodeStudio v1.0
`

  return report
}
