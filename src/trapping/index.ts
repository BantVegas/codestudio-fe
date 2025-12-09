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

// Advanced Path Offset Engine (Phase 2)
export * from './core/AdvancedPathOffset'

// Image-to-Vector Trapping (Phase 2)
export * from './core/ImageTrapping'

// Components
export { TrappingPanel } from './components/TrappingPanel'
export { TrapOverlayLayer, TrapTooltip } from './components/TrapOverlayLayer'

// Hooks
export { useTrapping } from './hooks/useTrapping'
export type { UseTrappingResult } from './hooks/useTrapping'

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
  TrapTag,
  TrapTagMode,
  TrapTagDirection,
  TrapTagGroup,
} from './types/trappingTypes'

// Re-export TrapTag functions
export {
  resolveTrapTag,
  applyTrapTagDirection,
  applyTrapTagWidth,
  shouldTrapObject,
} from './core/TrapRuleEngine'
