/**
 * GPCS CodeStudio - Auto-Trapping Engine
 * Main Export Module
 * 
 * Professional prepress trapping system
 */

// Types
export * from './types/trappingTypes'

// Core modules
export * from './core/ColorAnalyzer'
export * from './core/TrapRuleEngine'
export * from './core/TrapGenerator'
export * from './core/PDFExportEngine'
export * from './core/QualityChecks'

// Components
export { TrappingPanel } from './components/TrappingPanel'
export { TrapOverlayLayer, TrapTooltip } from './components/TrapOverlayLayer'

// Re-export commonly used types for convenience
export type {
  TrapSettings,
  TrapLayer,
  TrapObject,
  TrapDecision,
  TrapWarning,
  ColorDefinition,
  TrappingDocument,
  ExportOptions,
  ViewMode,
  PrintingTechnology,
} from './types/trappingTypes'
