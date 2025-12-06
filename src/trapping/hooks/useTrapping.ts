/**
 * GPCS CodeStudio - Auto-Trapping Engine
 * React Hook for Trapping Management
 */

import { useState, useCallback, useMemo } from 'react'
import type {
  TrapSettings,
  TrapLayer,
  TrapWarning,
  TrappingDocument,
  ColorAdjacencyMap,
  ViewMode,
  ExportOptions,
} from '../types/trappingTypes'
import { DEFAULT_TRAP_SETTINGS, DEFAULT_EXPORT_OPTIONS } from '../types/trappingTypes'
import { buildColorAdjacencyMap, getTrapRequiredAdjacencies } from '../core/ColorAnalyzer'
import { TrapRuleEngine } from '../core/TrapRuleEngine'
import { buildTrapLayer } from '../core/TrapGenerator'
import { runQualityChecks, generateQCReport } from '../core/QualityChecks'
import { exportWithTrapping, downloadPDF } from '../core/PDFExportEngine'

export interface UseTrappingResult {
  // State
  settings: TrapSettings
  trapLayer: TrapLayer | null
  adjacencyMap: ColorAdjacencyMap | null
  warnings: TrapWarning[]
  isProcessing: boolean
  viewMode: ViewMode
  
  // Actions
  updateSettings: (settings: Partial<TrapSettings>) => void
  generateTraps: (document: TrappingDocument) => Promise<void>
  clearTraps: () => void
  setViewMode: (mode: ViewMode) => void
  
  // Export
  exportPDF: (document: TrappingDocument, options?: Partial<ExportOptions>) => Promise<void>
  
  // QC
  runQC: (document: TrappingDocument) => void
  qcReport: string | null
}

export function useTrapping(): UseTrappingResult {
  // State
  const [settings, setSettings] = useState<TrapSettings>(DEFAULT_TRAP_SETTINGS)
  const [trapLayer, setTrapLayer] = useState<TrapLayer | null>(null)
  const [adjacencyMap, setAdjacencyMap] = useState<ColorAdjacencyMap | null>(null)
  const [warnings, setWarnings] = useState<TrapWarning[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('NORMAL')
  const [qcReport, setQcReport] = useState<string | null>(null)

  // Rule engine instance
  const ruleEngine = useMemo(() => new TrapRuleEngine(settings), [settings])

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<TrapSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      ruleEngine.updateSettings(updated)
      return updated
    })
  }, [ruleEngine])

  // Generate traps
  const generateTraps = useCallback(async (document: TrappingDocument) => {
    if (!settings.enabled) return

    setIsProcessing(true)
    setWarnings([])

    try {
      // Step 1: Build color adjacency map
      const adjMap = buildColorAdjacencyMap(document)
      setAdjacencyMap(adjMap)

      // Step 2: Get trap-required adjacencies
      const trapAdjacencies = getTrapRequiredAdjacencies(adjMap)

      // Step 3: Generate trap decisions
      const decisions = trapAdjacencies.map(({ regionA, regionB, adjacency }) => {
        return ruleEngine.decide(
          regionA,
          regionB,
          adjacency,
          document.objects.get(regionA.objectId)?.riskFactors || {
            isSmallText: false,
            isThinLine: false,
            hasSharpAngles: false,
            isHighDetail: false,
            requiresSpecialHandling: false,
            warnings: []
          },
          document.objects.get(regionB.objectId)?.riskFactors || {
            isSmallText: false,
            isThinLine: false,
            hasSharpAngles: false,
            isHighDetail: false,
            requiresSpecialHandling: false,
            warnings: []
          }
        )
      })

      // Collect warnings from decisions
      const allWarnings: TrapWarning[] = []
      for (const decision of decisions) {
        allWarnings.push(...decision.warnings)
      }

      // Step 4: Generate trap geometry
      const layer = buildTrapLayer(
        document.id,
        decisions,
        adjMap.regions,
        settings
      )

      setTrapLayer(layer)
      setWarnings(allWarnings)

      // Auto-switch to trap overlay view
      setViewMode('TRAP_OVERLAY')

    } catch (error) {
      console.error('Trapping generation failed:', error)
      setWarnings([{
        type: 'COMPLEX_GEOMETRY',
        severity: 'ERROR',
        message: `Trapping generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }])
    } finally {
      setIsProcessing(false)
    }
  }, [settings, ruleEngine])

  // Clear traps
  const clearTraps = useCallback(() => {
    setTrapLayer(null)
    setAdjacencyMap(null)
    setWarnings([])
    setViewMode('NORMAL')
    setQcReport(null)
  }, [])

  // Export PDF
  const exportPDF = useCallback(async (
    document: TrappingDocument,
    options?: Partial<ExportOptions>
  ) => {
    setIsProcessing(true)

    try {
      const exportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options }
      const blob = await exportWithTrapping(document, trapLayer, exportOptions)
      
      const filename = `${document.name}_trapped_${new Date().toISOString().slice(0, 10)}.pdf`
      downloadPDF(blob, filename)

    } catch (error) {
      console.error('PDF export failed:', error)
      setWarnings(prev => [...prev, {
        type: 'COMPLEX_GEOMETRY',
        severity: 'ERROR',
        message: `PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }])
    } finally {
      setIsProcessing(false)
    }
  }, [trapLayer])

  // Run QC checks
  const runQC = useCallback((document: TrappingDocument) => {
    const result = runQualityChecks(document, trapLayer, adjacencyMap, settings)
    
    // Add QC warnings to main warnings
    setWarnings(prev => [
      ...prev.filter(w => !w.message.startsWith('[QC]')),
      ...result.warnings.map(w => ({ ...w, message: `[QC] ${w.message}` })),
      ...result.errors.map(w => ({ ...w, message: `[QC] ${w.message}` }))
    ])

    // Generate report
    const report = generateQCReport(result)
    setQcReport(report)

  }, [trapLayer, adjacencyMap, settings])

  return {
    settings,
    trapLayer,
    adjacencyMap,
    warnings,
    isProcessing,
    viewMode,
    updateSettings,
    generateTraps,
    clearTraps,
    setViewMode,
    exportPDF,
    runQC,
    qcReport
  }
}

export default useTrapping
