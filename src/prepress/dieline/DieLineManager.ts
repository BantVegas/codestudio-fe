/**
 * GPCS CodeStudio - Die Line Manager
 * 
 * Main entry point for Die Line Management subsystem.
 * Handles loading, validation, and manipulation of die lines.
 */

import type { DieLineInfo, DieValidationResult } from './DieLineTypes'
import { dieLineParser } from './DieLineParser'
import { dieLineValidator } from './DieLineValidator'

export class DieLineManager {
  private activeDieLine: DieLineInfo | null = null
  private validationResult: DieValidationResult | null = null

  /**
   * Load die line from file content
   */
  public async loadDieLine(content: string, fileName: string): Promise<DieLineInfo> {
    try {
      // 1. Parse content
      const dieLine = dieLineParser.parse(content, fileName)
      
      // 2. Validate
      const validation = dieLineValidator.validate(dieLine)
      
      this.activeDieLine = dieLine
      this.validationResult = validation
      
      // 3. Add validation issues to the die line info
      this.activeDieLine.errors = validation.issues
        .filter(i => i.type === 'ERROR')
        .map(i => i.message)
        
      this.activeDieLine.warnings = validation.issues
        .filter(i => i.type === 'WARNING')
        .map(i => i.message)

      return this.activeDieLine
    } catch (error) {
      console.error('Failed to load die line:', error)
      throw error
    }
  }

  /**
   * Get current die line
   */
  public getActiveDieLine(): DieLineInfo | null {
    return this.activeDieLine
  }

  /**
   * Get validation result
   */
  public getValidationResult(): DieValidationResult | null {
    return this.validationResult
  }

  /**
   * Clear current die line
   */
  public clear(): void {
    this.activeDieLine = null
    this.validationResult = null
  }

  /**
   * Get bounding box of the active die line
   */
  public getBounds(): { width: number; height: number } | null {
    if (!this.activeDieLine) return null
    return {
      width: this.activeDieLine.width,
      height: this.activeDieLine.height
    }
  }
}

export const dieLineManager = new DieLineManager()
