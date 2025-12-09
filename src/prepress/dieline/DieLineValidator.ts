/**
 * GPCS CodeStudio - Die Line Validator
 * 
 * Quality checks for die lines
 */

import type {
  DieLineInfo,
  DieValidationResult,
  DieIssue,
  DiePath,
  DieSegment,
  Point2D
} from './DieLineTypes'

export class DieLineValidator {

  /**
   * Validate complete die line info
   */
  public validate(dieLine: DieLineInfo): DieValidationResult {
    const issues: DieIssue[] = []
    
    // 1. Check if we have any paths
    if (dieLine.paths.length === 0) {
      issues.push({
        type: 'ERROR',
        code: 'NO_PATHS',
        message: 'No paths found in the die line file'
      })
    }

    // 2. Check each path
    let allPathsClosed = true
    let hasSelfIntersections = false
    
    for (const path of dieLine.paths) {
      const pathIssues = this.validatePath(path)
      issues.push(...pathIssues)
      
      // Update global flags
      if (!path.isClosed && path.lineType === 'CUT') {
        allPathsClosed = false
      }
      
      // Self-intersection check (simplified)
      if (this.checkSelfIntersection(path)) {
        hasSelfIntersections = true
        issues.push({
          type: 'WARNING',
          code: 'SELF_INTERSECTION',
          message: `Path ${path.id} has self-intersections`,
          segmentId: path.id
        })
      }
    }

    // 3. Check for duplicates
    const hasDuplicateLines = this.checkDuplicateLines(dieLine.paths)
    if (hasDuplicateLines) {
      issues.push({
        type: 'WARNING',
        code: 'DUPLICATE_LINES',
        message: 'Duplicate lines detected (overlapping segments)'
      })
    }
    
    // 4. Check dimensions
    const dimensionsMatch = dieLine.width > 0 && dieLine.height > 0
    if (!dimensionsMatch) {
      issues.push({
        type: 'ERROR',
        code: 'INVALID_DIMENSIONS',
        message: 'Die line has zero width or height'
      })
    }

    const errorCount = issues.filter(i => i.type === 'ERROR').length

    return {
      isValid: errorCount === 0,
      isClosed: allPathsClosed,
      hasSelfIntersections,
      hasDuplicateLines,
      hasOpenContours: !allPathsClosed,
      dimensionsMatch,
      materialValid: true, // Placeholder logic
      structuralIntegrity: true, // Placeholder logic
      issues
    }
  }

  /**
   * Validate individual path
   */
  private validatePath(path: DiePath): DieIssue[] {
    const issues: DieIssue[] = []
    
    // Check continuity (gaps between segments)
    for (let i = 0; i < path.segments.length - 1; i++) {
      const current = path.segments[i]
      const next = path.segments[i + 1]
      
      if (!this.pointsMatch(current.end, next.start)) {
        issues.push({
          type: 'ERROR',
          code: 'GAP_DETECTED',
          message: `Gap detected between segments ${current.id} and ${next.id}`,
          segmentId: current.id,
          point: current.end
        })
      }
    }
    
    // Check if closed (for CUT lines)
    if (path.lineType === 'CUT') {
      const first = path.segments[0]
      const last = path.segments[path.segments.length - 1]
      
      if (first && last && !this.pointsMatch(first.start, last.end)) {
        // Only warn if explicitly marked as closed but geometry is open
        // Logic might need adjustment depending on how parser sets isClosed
        if (path.isClosed) {
          issues.push({
            type: 'WARNING',
            code: 'OPEN_CONTOUR',
            message: `Path ${path.id} is marked as closed but endpoints do not meet`,
            segmentId: path.id,
            point: last.end
          })
        }
      }
    }
    
    return issues
  }

  /**
   * Check if two points are effectively the same (within tolerance)
   */
  private pointsMatch(p1: Point2D, p2: Point2D, tolerance = 0.01): boolean {
    const dx = Math.abs(p1.x - p2.x)
    const dy = Math.abs(p1.y - p2.y)
    return dx <= tolerance && dy <= tolerance
  }

  /**
   * Check for duplicate lines (overlapping segments)
   * Simplified O(n^2) check
   */
  private checkDuplicateLines(paths: DiePath[]): boolean {
    const allSegments: DieSegment[] = paths.flatMap(p => p.segments)
    
    for (let i = 0; i < allSegments.length; i++) {
      for (let j = i + 1; j < allSegments.length; j++) {
        const s1 = allSegments[i]
        const s2 = allSegments[j]
        
        // Only check lines for now
        if (s1.type === 'LINE' && s2.type === 'LINE') {
          if (this.areSegmentsIdentical(s1, s2)) {
            return true
          }
        }
      }
    }
    
    return false
  }

  /**
   * Check if two segments are identical (same start/end or reversed)
   */
  private areSegmentsIdentical(s1: DieSegment, s2: DieSegment): boolean {
    // Check exact match
    if (this.pointsMatch(s1.start, s2.start) && this.pointsMatch(s1.end, s2.end)) return true
    
    // Check reversed match
    if (this.pointsMatch(s1.start, s2.end) && this.pointsMatch(s1.end, s2.start)) return true
    
    return false
  }

  /**
   * Check for self-intersections
   * Simplified placeholder
   */
  private checkSelfIntersection(path: DiePath): boolean {
    // Real implementation would use sweep-line algorithm or similar
    // For now, return false to avoid false positives without proper math lib
    return false
  }
}

export const dieLineValidator = new DieLineValidator()
