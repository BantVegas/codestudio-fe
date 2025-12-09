/**
 * GPCS CodeStudio - Preflight Engine
 * 
 * Automated prepress quality control system
 * Checks PDF files against configurable rules
 */

import type {
  PDFPage,
  PDFObject,
  PDFDocumentInfo,
  PreflightProfile,
  PreflightRule,
  PreflightResult,
  PreflightIssue,
  PreflightCategory,
  PreflightCheckType,
  PreflightSettings,
  SpotColorInfo,
  ExtendedColor,
  ImageData,
  TextData,
} from '../types/PrepressTypes'
import { DEFAULT_PREFLIGHT_RULES, PREFLIGHT_PROFILES } from './PreflightRules'

/**
 * Preflight progress callback
 */
export type PreflightProgressCallback = (progress: {
  phase: string
  currentCheck: string
  progress: number
  issuesFound: number
}) => void

/**
 * Preflight Engine class
 */
export class PreflightEngine {
  private currentProfile: PreflightProfile
  private results: PreflightIssue[] = []
  private documentInfo: PDFDocumentInfo | null = null
  private pages: PDFPage[] = []
  
  constructor() {
    // Use default profile
    this.currentProfile = PREFLIGHT_PROFILES[0]
  }
  
  /**
   * Set preflight profile
   */
  setProfile(profile: PreflightProfile): void {
    this.currentProfile = profile
  }
  
  /**
   * Get current profile
   */
  getProfile(): PreflightProfile {
    return this.currentProfile
  }
  
  /**
   * Get available profiles
   */
  getAvailableProfiles(): PreflightProfile[] {
    return PREFLIGHT_PROFILES
  }
  
  /**
   * Run preflight check
   */
  async runPreflight(
    documentInfo: PDFDocumentInfo,
    pages: PDFPage[],
    onProgress?: PreflightProgressCallback
  ): Promise<PreflightResult> {
    this.documentInfo = documentInfo
    this.pages = pages
    this.results = []
    
    const startTime = new Date()
    const enabledRules = this.currentProfile.rules.filter(r => r.enabled)
    let checksCompleted = 0
    
    // Run document-level checks
    onProgress?.({
      phase: 'Document checks',
      currentCheck: 'Analyzing document...',
      progress: 0,
      issuesFound: this.results.length
    })
    
    await this.runDocumentChecks(enabledRules)
    checksCompleted += enabledRules.filter(r => r.category === 'DOCUMENT').length
    
    // Run page-level checks
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      
      onProgress?.({
        phase: `Page ${page.pageNumber}`,
        currentCheck: 'Checking page...',
        progress: (checksCompleted / enabledRules.length) * 100,
        issuesFound: this.results.length
      })
      
      await this.runPageChecks(page, enabledRules)
      
      // Run object-level checks
      for (const obj of page.objects) {
        await this.runObjectChecks(obj, page, enabledRules)
      }
      
      checksCompleted += enabledRules.filter(r => 
        r.category !== 'DOCUMENT'
      ).length / pages.length
    }
    
    const endTime = new Date()
    
    // Categorize results
    const errors = this.results.filter(r => r.severity === 'ERROR')
    const warnings = this.results.filter(r => r.severity === 'WARNING')
    const info = this.results.filter(r => r.severity === 'INFO')
    
    return {
      documentId: documentInfo.id,
      profileId: this.currentProfile.id,
      profileName: this.currentProfile.name,
      status: errors.length > 0 ? 'ERRORS' : warnings.length > 0 ? 'WARNINGS' : 'PASSED',
      errors,
      warnings,
      info,
      totalChecks: enabledRules.length,
      passedChecks: enabledRules.length - errors.length - warnings.length,
      failedChecks: errors.length + warnings.length,
      startedAt: startTime,
      completedAt: endTime,
      duration: endTime.getTime() - startTime.getTime()
    }
  }
  
  /**
   * Run document-level checks
   */
  private async runDocumentChecks(rules: PreflightRule[]): Promise<void> {
    const documentRules = rules.filter(r => r.category === 'DOCUMENT' || r.category === 'OUTPUT_INTENT')
    
    for (const rule of documentRules) {
      switch (rule.checkType) {
        case 'PDF_VERSION':
          this.checkPDFVersion(rule)
          break
        case 'OUTPUT_INTENT':
          this.checkOutputIntent(rule)
          break
        case 'TRAPPED_KEY':
          this.checkTrappedKey(rule)
          break
        case 'ENCRYPTION':
          this.checkEncryption(rule)
          break
      }
    }
  }
  
  /**
   * Run page-level checks
   */
  private async runPageChecks(page: PDFPage, rules: PreflightRule[]): Promise<void> {
    const pageRules = rules.filter(r => 
      r.category === 'PAGE' || r.category === 'BLEED' || r.category === 'LAYER'
    )
    
    for (const rule of pageRules) {
      switch (rule.checkType) {
        case 'PAGE_SIZE':
          this.checkPageSize(page, rule)
          break
        case 'PAGE_BOXES':
          this.checkPageBoxes(page, rule)
          break
        case 'BLEED_SIZE':
          this.checkBleedSize(page, rule)
          break
        case 'TRIM_SIZE':
          this.checkTrimSize(page, rule)
          break
        case 'LAYER_VISIBILITY':
          this.checkLayerVisibility(page, rule)
          break
        case 'LAYER_PRINTABILITY':
          this.checkLayerPrintability(page, rule)
          break
      }
    }
    
    // Color checks at page level
    const colorRules = rules.filter(r => r.category === 'COLOR')
    for (const rule of colorRules) {
      switch (rule.checkType) {
        case 'SPOT_COLOR':
          this.checkSpotColors(page, rule)
          break
        case 'INK_COVERAGE':
          this.checkInkCoverage(page, rule)
          break
        case 'TAC_LIMIT':
          this.checkTACLimit(page, rule)
          break
      }
    }
  }
  
  /**
   * Run object-level checks
   */
  private async runObjectChecks(
    obj: PDFObject,
    page: PDFPage,
    rules: PreflightRule[]
  ): Promise<void> {
    // Color checks
    const colorRules = rules.filter(r => r.category === 'COLOR')
    for (const rule of colorRules) {
      switch (rule.checkType) {
        case 'RGB_OBJECTS':
          this.checkRGBObject(obj, page, rule)
          break
        case 'LAB_OBJECTS':
          this.checkLABObject(obj, page, rule)
          break
        case 'REGISTRATION_COLOR':
          this.checkRegistrationColor(obj, page, rule)
          break
        case 'RICH_BLACK':
          this.checkRichBlack(obj, page, rule)
          break
      }
    }
    
    // Font checks
    if (obj.type === 'TEXT' && obj.textData) {
      const fontRules = rules.filter(r => r.category === 'FONT')
      for (const rule of fontRules) {
        switch (rule.checkType) {
          case 'FONT_EMBEDDED':
            this.checkFontEmbedded(obj, page, rule)
            break
          case 'MINIMUM_FONT_SIZE':
            this.checkMinimumFontSize(obj, page, rule)
            break
        }
      }
    }
    
    // Image checks
    if (obj.type === 'IMAGE' && obj.imageData) {
      const imageRules = rules.filter(r => r.category === 'IMAGE')
      for (const rule of imageRules) {
        switch (rule.checkType) {
          case 'IMAGE_RESOLUTION':
            this.checkImageResolution(obj, page, rule)
            break
          case 'IMAGE_COLOR_SPACE':
            this.checkImageColorSpace(obj, page, rule)
            break
        }
      }
    }
    
    // Transparency checks
    const transparencyRules = rules.filter(r => r.category === 'TRANSPARENCY')
    for (const rule of transparencyRules) {
      switch (rule.checkType) {
        case 'TRANSPARENCY_USED':
          this.checkTransparency(obj, page, rule)
          break
        case 'BLEND_MODE':
          this.checkBlendMode(obj, page, rule)
          break
      }
    }
    
    // Overprint checks
    const overprintRules = rules.filter(r => r.category === 'OVERPRINT')
    for (const rule of overprintRules) {
      switch (rule.checkType) {
        case 'OVERPRINT_WHITE':
          this.checkOverprintWhite(obj, page, rule)
          break
        case 'OVERPRINT_BLACK':
          this.checkOverprintBlack(obj, page, rule)
          break
      }
    }
  }
  
  // ============================================
  // DOCUMENT CHECKS
  // ============================================
  
  private checkPDFVersion(rule: PreflightRule): void {
    const requiredVersion = rule.parameters.minVersion as string || '1.4'
    const currentVersion = this.documentInfo?.pdfVersion || '1.0'
    
    if (this.compareVersions(currentVersion, requiredVersion) < 0) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: `PDF version ${currentVersion} is below required ${requiredVersion}`,
        expectedValue: requiredVersion,
        actualValue: currentVersion,
        canAutoFix: false
      })
    }
  }
  
  private checkOutputIntent(rule: PreflightRule): void {
    if (rule.parameters.required && !this.documentInfo?.outputIntent) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: 'Document has no output intent defined',
        canAutoFix: true,
        fixDescription: 'Add output intent for target printing condition'
      })
    }
  }
  
  private checkTrappedKey(rule: PreflightRule): void {
    if (this.documentInfo?.trapped === 'Unknown') {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: 'INFO',
        message: 'Trapped key is not set in document',
        canAutoFix: true,
        fixDescription: 'Set trapped key to True or False'
      })
    }
  }
  
  private checkEncryption(rule: PreflightRule): void {
    if (this.documentInfo?.isEncrypted) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: 'Document is encrypted which may cause printing issues',
        canAutoFix: false
      })
    }
  }
  
  // ============================================
  // PAGE CHECKS
  // ============================================
  
  private checkPageSize(page: PDFPage, rule: PreflightRule): void {
    const minWidth = rule.parameters.minWidth as number || 0
    const minHeight = rule.parameters.minHeight as number || 0
    const maxWidth = rule.parameters.maxWidth as number || Infinity
    const maxHeight = rule.parameters.maxHeight as number || Infinity
    
    if (page.mediaBox.width < minWidth || page.mediaBox.height < minHeight) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: `Page ${page.pageNumber} is smaller than minimum size`,
        pageNumber: page.pageNumber,
        expectedValue: `${minWidth}x${minHeight}mm`,
        actualValue: `${page.mediaBox.width.toFixed(2)}x${page.mediaBox.height.toFixed(2)}mm`,
        canAutoFix: false
      })
    }
    
    if (page.mediaBox.width > maxWidth || page.mediaBox.height > maxHeight) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: `Page ${page.pageNumber} exceeds maximum size`,
        pageNumber: page.pageNumber,
        expectedValue: `max ${maxWidth}x${maxHeight}mm`,
        actualValue: `${page.mediaBox.width.toFixed(2)}x${page.mediaBox.height.toFixed(2)}mm`,
        canAutoFix: false
      })
    }
  }
  
  private checkPageBoxes(page: PDFPage, rule: PreflightRule): void {
    if (!page.trimBox) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: `Page ${page.pageNumber} has no TrimBox defined`,
        pageNumber: page.pageNumber,
        canAutoFix: true,
        fixDescription: 'Set TrimBox to match CropBox or MediaBox'
      })
    }
    
    if (!page.bleedBox) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: 'INFO',
        message: `Page ${page.pageNumber} has no BleedBox defined`,
        pageNumber: page.pageNumber,
        canAutoFix: true,
        fixDescription: 'Set BleedBox based on required bleed'
      })
    }
  }
  
  private checkBleedSize(page: PDFPage, rule: PreflightRule): void {
    const requiredBleed = rule.parameters.minBleed as number || 3
    
    if (page.trimBox && page.bleedBox) {
      const leftBleed = page.trimBox.x - page.bleedBox.x
      const rightBleed = (page.bleedBox.x + page.bleedBox.width) - (page.trimBox.x + page.trimBox.width)
      const topBleed = (page.bleedBox.y + page.bleedBox.height) - (page.trimBox.y + page.trimBox.height)
      const bottomBleed = page.trimBox.y - page.bleedBox.y
      
      const minBleed = Math.min(leftBleed, rightBleed, topBleed, bottomBleed)
      
      if (minBleed < requiredBleed) {
        this.addIssue({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          message: `Page ${page.pageNumber} has insufficient bleed`,
          pageNumber: page.pageNumber,
          expectedValue: `${requiredBleed}mm`,
          actualValue: `${minBleed.toFixed(2)}mm`,
          canAutoFix: false
        })
      }
    }
  }
  
  private checkTrimSize(page: PDFPage, rule: PreflightRule): void {
    // Check if trim size matches expected
    const expectedWidth = rule.parameters.width as number
    const expectedHeight = rule.parameters.height as number
    const tolerance = rule.parameters.tolerance as number || 0.5
    
    if (expectedWidth && expectedHeight && page.trimBox) {
      const widthDiff = Math.abs(page.trimBox.width - expectedWidth)
      const heightDiff = Math.abs(page.trimBox.height - expectedHeight)
      
      if (widthDiff > tolerance || heightDiff > tolerance) {
        this.addIssue({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          message: `Page ${page.pageNumber} trim size doesn't match expected`,
          pageNumber: page.pageNumber,
          expectedValue: `${expectedWidth}x${expectedHeight}mm`,
          actualValue: `${page.trimBox.width.toFixed(2)}x${page.trimBox.height.toFixed(2)}mm`,
          canAutoFix: false
        })
      }
    }
  }
  
  private checkLayerVisibility(page: PDFPage, rule: PreflightRule): void {
    for (const layer of page.layers) {
      if (!layer.visible && layer.printable) {
        this.addIssue({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: 'WARNING',
          message: `Layer "${layer.name}" is hidden but set to print`,
          pageNumber: page.pageNumber,
          canAutoFix: true,
          fixDescription: 'Make layer visible or set to non-printable'
        })
      }
    }
  }
  
  private checkLayerPrintability(page: PDFPage, rule: PreflightRule): void {
    for (const layer of page.layers) {
      if (layer.layerType === 'TECHNICAL' && layer.printable) {
        this.addIssue({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: 'WARNING',
          message: `Technical layer "${layer.name}" is set to print`,
          pageNumber: page.pageNumber,
          canAutoFix: true,
          fixDescription: 'Set technical layer to non-printable'
        })
      }
    }
  }
  
  // ============================================
  // COLOR CHECKS
  // ============================================
  
  private checkSpotColors(page: PDFPage, rule: PreflightRule): void {
    const maxSpotColors = rule.parameters.maxCount as number || 10
    
    if (page.spotColors.length > maxSpotColors) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: `Page ${page.pageNumber} has ${page.spotColors.length} spot colors (max: ${maxSpotColors})`,
        pageNumber: page.pageNumber,
        expectedValue: `max ${maxSpotColors}`,
        actualValue: page.spotColors.length.toString(),
        affectedItems: page.spotColors.map(s => s.name),
        canAutoFix: false
      })
    }
  }
  
  private checkRGBObject(obj: PDFObject, page: PDFPage, rule: PreflightRule): void {
    if (obj.fillColor?.space === 'DeviceRGB' || obj.strokeColor?.space === 'DeviceRGB') {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: `RGB color found in ${obj.type.toLowerCase()} object`,
        pageNumber: page.pageNumber,
        objectId: obj.id,
        objectType: obj.type,
        location: obj.bounds,
        canAutoFix: true,
        fixDescription: 'Convert RGB to CMYK'
      })
    }
  }
  
  private checkLABObject(obj: PDFObject, page: PDFPage, rule: PreflightRule): void {
    if (obj.fillColor?.space === 'Lab' || obj.strokeColor?.space === 'Lab') {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: `LAB color found in ${obj.type.toLowerCase()} object`,
        pageNumber: page.pageNumber,
        objectId: obj.id,
        objectType: obj.type,
        location: obj.bounds,
        canAutoFix: true,
        fixDescription: 'Convert LAB to CMYK'
      })
    }
  }
  
  private checkRegistrationColor(obj: PDFObject, page: PDFPage, rule: PreflightRule): void {
    if (this.isRegistrationColor(obj.fillColor) || this.isRegistrationColor(obj.strokeColor)) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: `Registration color found in artwork`,
        pageNumber: page.pageNumber,
        objectId: obj.id,
        objectType: obj.type,
        location: obj.bounds,
        canAutoFix: false
      })
    }
  }
  
  private checkRichBlack(obj: PDFObject, page: PDFPage, rule: PreflightRule): void {
    const maxCMY = rule.parameters.maxCMY as number || 0.6
    
    if (obj.fillColor?.cmyk) {
      const cmyk = obj.fillColor.cmyk
      if (cmyk.k > 0.9) {
        const cmyTotal = cmyk.c + cmyk.m + cmyk.y
        if (cmyTotal > maxCMY * 3) {
          this.addIssue({
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            severity: 'INFO',
            message: `Rich black with high CMY values (${(cmyTotal * 100 / 3).toFixed(0)}% average)`,
            pageNumber: page.pageNumber,
            objectId: obj.id,
            objectType: obj.type,
            location: obj.bounds,
            expectedValue: `max ${maxCMY * 100}% CMY`,
            actualValue: `${(cmyTotal * 100 / 3).toFixed(0)}% CMY`,
            canAutoFix: true,
            fixDescription: 'Reduce CMY values in rich black'
          })
        }
      }
    }
  }
  
  private checkInkCoverage(page: PDFPage, rule: PreflightRule): void {
    if (page.inkCoverage) {
      for (const sep of page.inkCoverage.separations) {
        const maxCoverage = rule.parameters.maxCoverage as number || 100
        if (sep.maxCoverage > maxCoverage) {
          this.addIssue({
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            message: `${sep.separationName} coverage exceeds ${maxCoverage}%`,
            pageNumber: page.pageNumber,
            expectedValue: `max ${maxCoverage}%`,
            actualValue: `${sep.maxCoverage.toFixed(1)}%`,
            canAutoFix: false
          })
        }
      }
    }
  }
  
  private checkTACLimit(page: PDFPage, rule: PreflightRule): void {
    const tacLimit = rule.parameters.limit as number || 300
    
    if (page.inkCoverage?.tac) {
      if (page.inkCoverage.tac.maxTAC > tacLimit) {
        this.addIssue({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          message: `Total Area Coverage exceeds ${tacLimit}%`,
          pageNumber: page.pageNumber,
          expectedValue: `max ${tacLimit}%`,
          actualValue: `${page.inkCoverage.tac.maxTAC.toFixed(1)}%`,
          location: page.inkCoverage.tac.maxTACLocation 
            ? { x: page.inkCoverage.tac.maxTACLocation.x, y: page.inkCoverage.tac.maxTACLocation.y, width: 10, height: 10 }
            : undefined,
          canAutoFix: false
        })
      }
    }
  }
  
  // ============================================
  // FONT CHECKS
  // ============================================
  
  private checkFontEmbedded(obj: PDFObject, page: PDFPage, rule: PreflightRule): void {
    if (obj.textData && !obj.textData.isEmbedded) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: `Font "${obj.textData.fontName}" is not embedded`,
        pageNumber: page.pageNumber,
        objectId: obj.id,
        objectType: obj.type,
        location: obj.bounds,
        canAutoFix: true,
        fixDescription: 'Embed font in document'
      })
    }
  }
  
  private checkMinimumFontSize(obj: PDFObject, page: PDFPage, rule: PreflightRule): void {
    const minSize = rule.parameters.minSize as number || 6
    
    if (obj.textData && obj.textData.fontSize < minSize) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: `Text size ${obj.textData.fontSize}pt is below minimum ${minSize}pt`,
        pageNumber: page.pageNumber,
        objectId: obj.id,
        objectType: obj.type,
        location: obj.bounds,
        expectedValue: `min ${minSize}pt`,
        actualValue: `${obj.textData.fontSize}pt`,
        canAutoFix: false
      })
    }
  }
  
  // ============================================
  // IMAGE CHECKS
  // ============================================
  
  private checkImageResolution(obj: PDFObject, page: PDFPage, rule: PreflightRule): void {
    const minResolution = rule.parameters.minDPI as number || 300
    
    if (obj.imageData) {
      const effectiveDPI = Math.min(
        obj.imageData.effectiveDPI.horizontal,
        obj.imageData.effectiveDPI.vertical
      )
      
      if (effectiveDPI < minResolution) {
        this.addIssue({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          message: `Image resolution ${effectiveDPI.toFixed(0)} DPI is below minimum ${minResolution} DPI`,
          pageNumber: page.pageNumber,
          objectId: obj.id,
          objectType: obj.type,
          location: obj.bounds,
          expectedValue: `min ${minResolution} DPI`,
          actualValue: `${effectiveDPI.toFixed(0)} DPI`,
          canAutoFix: false
        })
      }
    }
  }
  
  private checkImageColorSpace(obj: PDFObject, page: PDFPage, rule: PreflightRule): void {
    if (obj.imageData && obj.imageData.colorSpace === 'DeviceRGB') {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: `Image uses RGB color space`,
        pageNumber: page.pageNumber,
        objectId: obj.id,
        objectType: obj.type,
        location: obj.bounds,
        canAutoFix: true,
        fixDescription: 'Convert image to CMYK'
      })
    }
  }
  
  // ============================================
  // TRANSPARENCY CHECKS
  // ============================================
  
  private checkTransparency(obj: PDFObject, page: PDFPage, rule: PreflightRule): void {
    if (obj.opacity < 1) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: `Object uses transparency (opacity: ${(obj.opacity * 100).toFixed(0)}%)`,
        pageNumber: page.pageNumber,
        objectId: obj.id,
        objectType: obj.type,
        location: obj.bounds,
        canAutoFix: true,
        fixDescription: 'Flatten transparency'
      })
    }
  }
  
  private checkBlendMode(obj: PDFObject, page: PDFPage, rule: PreflightRule): void {
    if (obj.blendMode !== 'Normal') {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        message: `Object uses blend mode: ${obj.blendMode}`,
        pageNumber: page.pageNumber,
        objectId: obj.id,
        objectType: obj.type,
        location: obj.bounds,
        canAutoFix: true,
        fixDescription: 'Flatten blend mode'
      })
    }
  }
  
  // ============================================
  // OVERPRINT CHECKS
  // ============================================
  
  private checkOverprintWhite(obj: PDFObject, page: PDFPage, rule: PreflightRule): void {
    if (obj.overprint && this.isWhiteColor(obj.fillColor)) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: 'ERROR',
        message: `White object set to overprint will disappear`,
        pageNumber: page.pageNumber,
        objectId: obj.id,
        objectType: obj.type,
        location: obj.bounds,
        canAutoFix: true,
        fixDescription: 'Set white object to knockout'
      })
    }
  }
  
  private checkOverprintBlack(obj: PDFObject, page: PDFPage, rule: PreflightRule): void {
    if (!obj.overprint && this.isBlackOnly(obj.fillColor)) {
      this.addIssue({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: 'INFO',
        message: `Black text/object not set to overprint`,
        pageNumber: page.pageNumber,
        objectId: obj.id,
        objectType: obj.type,
        location: obj.bounds,
        canAutoFix: true,
        fixDescription: 'Set black to overprint for better registration'
      })
    }
  }
  
  // ============================================
  // HELPER METHODS
  // ============================================
  
  private isRegistrationColor(color: ExtendedColor | undefined): boolean {
    if (!color?.cmyk) return false
    return color.cmyk.c === 1 && color.cmyk.m === 1 && 
           color.cmyk.y === 1 && color.cmyk.k === 1
  }
  
  private isWhiteColor(color: ExtendedColor | undefined): boolean {
    if (!color) return false
    if (color.cmyk) {
      return color.cmyk.c === 0 && color.cmyk.m === 0 && 
             color.cmyk.y === 0 && color.cmyk.k === 0
    }
    return false
  }
  
  private isBlackOnly(color: ExtendedColor | undefined): boolean {
    if (!color?.cmyk) return false
    return color.cmyk.c === 0 && color.cmyk.m === 0 && 
           color.cmyk.y === 0 && color.cmyk.k > 0.9
  }
  
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0
      const p2 = parts2[i] || 0
      if (p1 < p2) return -1
      if (p1 > p2) return 1
    }
    return 0
  }
  
  private addIssue(issue: Omit<PreflightIssue, 'ruleId' | 'ruleName' | 'category' | 'severity'> & Partial<PreflightIssue>): void {
    this.results.push(issue as PreflightIssue)
  }
}

// Export singleton
export const preflightEngine = new PreflightEngine()
