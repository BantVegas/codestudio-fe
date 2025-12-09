/**
 * GPCS CodeStudio - Professional Prepress Engine
 * Main Export Module
 * 
 * ESKO-level prepress tools for label printing
 */

// Types - export first
export * from './types/PrepressTypes'

// Core PDF Engine
export { PDFImportEngine, pdfImportEngine, DEFAULT_IMPORT_OPTIONS } from './core/PDFImportEngine'
export { PDFDocumentModel, pdfDocumentModel } from './core/PDFDocumentModel'
export type { DocumentStatistics } from './core/PDFDocumentModel'
export { ColorExtractor } from './core/ColorExtractor'
export { LayerManager } from './core/LayerManager'
export { ObjectExtractor } from './core/ObjectExtractor'

// Separation & Preview
export { SeparationEngine, separationEngine, DEFAULT_SEPARATION_OPTIONS, SCREEN_ANGLES } from './separation/SeparationEngine'
export type { SeparationRenderOptions } from './separation/SeparationEngine'
export { OverprintSimulator, overprintSimulator, DEFAULT_OVERPRINT_OPTIONS } from './separation/OverprintSimulator'
export type { OverprintMode, OverprintPreviewOptions, OverprintAnalysis, OverprintIssue, OverprintIssueType } from './separation/OverprintSimulator'
export { InkCoverageCalculator, inkCoverageCalculator, DEFAULT_COVERAGE_OPTIONS, TAC_LIMITS } from './separation/InkCoverageCalculator'
export type { InkCoverageOptions } from './separation/InkCoverageCalculator'

// Preflight
export { PreflightEngine, preflightEngine } from './preflight/PreflightEngine'
export type { PreflightProgressCallback } from './preflight/PreflightEngine'
export { DEFAULT_PREFLIGHT_RULES, PREFLIGHT_PROFILES, DEFAULT_PREFLIGHT_SETTINGS, getPreflightProfile, createCustomProfile, getRulesByCategory } from './preflight/PreflightRules'
export { PreflightReportGenerator, preflightReportGenerator, DEFAULT_REPORT_OPTIONS } from './preflight/PreflightReport'
export type { ReportFormat, ReportOptions } from './preflight/PreflightReport'

// Color Management
export { ColorManagementSystem, colorManagement, DEFAULT_CONVERSION_OPTIONS } from './color/ColorManagement'
export type { ColorConversionOptions, RenderingIntent } from './color/ColorManagement'
export { SpotColorLibrary, spotColorLibrary } from './color/SpotColorLibrary'
export type { SpotColorDefinition } from './color/SpotColorLibrary'
export { ICCProfileManager, iccProfileManager } from './color/ICCProfileManager'

// Die Line Management
export { DieLineManager, dieLineManager } from './dieline/DieLineManager'
export { DieLineParser, dieLineParser } from './dieline/DieLineParser'
export { DieLineValidator, dieLineValidator } from './dieline/DieLineValidator'
export type { DieLineInfo, DiePath, DieSegment, DieValidationResult } from './dieline/DieLineTypes'

// Die Line UI
export { DieLineWorkspace } from './dieline/components/DieLineWorkspace'
export { DieLineViewer } from './dieline/components/DieLineViewer'
export { DieLinePanel } from './dieline/components/DieLinePanel'

