/**
 * GPCS CodeStudio - Auto-Trapping Engine
 * React Hook for Trapping Management
 */

import { useState, useCallback, useMemo } from 'react'
import type {
  TrapSettings,
  TrapLayer,
  TrapObject,
  TrapWarning,
  TrappingDocument,
  ColorAdjacencyMap,
  ViewMode,
  ExportOptions,
  TrapTag,
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
  
  // Trap Selection
  selectedTrapId: string | null
  hoveredTrapId: string | null
  selectedTrap: TrapObject | null
  selectTrap: (trapId: string | null) => void
  hoverTrap: (trapId: string | null) => void
  
  // TrapTags
  trapTags: TrapTag[]
  addTrapTag: (tag: Omit<TrapTag, 'id' | 'createdAt' | 'modifiedAt'>) => void
  updateTrapTag: (id: string, updates: Partial<TrapTag>) => void
  deleteTrapTag: (id: string) => void
  clearTrapTags: () => void
  
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
  
  // Trap Selection state
  const [selectedTrapId, setSelectedTrapId] = useState<string | null>(null)
  const [hoveredTrapId, setHoveredTrapId] = useState<string | null>(null)
  
  // TrapTags state
  const [trapTags, setTrapTags] = useState<TrapTag[]>([])

  // Rule engine instance
  const ruleEngine = useMemo(() => new TrapRuleEngine(settings), [settings])

  // Get selected trap object
  const selectedTrap = useMemo((): TrapObject | null => {
    if (!selectedTrapId || !trapLayer) return null
    return trapLayer.traps.find(t => t.id === selectedTrapId) || null
  }, [selectedTrapId, trapLayer])

  // Trap selection functions
  const selectTrap = useCallback((trapId: string | null) => {
    setSelectedTrapId(trapId)
    // Log trap info when selected
    if (trapId && trapLayer) {
      const trap = trapLayer.traps.find(t => t.id === trapId)
      if (trap) {
        console.log('Selected trap:', {
          id: trap.id,
          direction: trap.decision.direction,
          width: trap.widthMm,
          sourceRegion: trap.sourceRegionId,
          targetRegion: trap.targetRegionId,
          style: trap.style
        })
      }
    }
  }, [trapLayer])

  const hoverTrap = useCallback((trapId: string | null) => {
    setHoveredTrapId(trapId)
  }, [])

  // TrapTag management
  const addTrapTag = useCallback((tag: Omit<TrapTag, 'id' | 'createdAt' | 'modifiedAt'>) => {
    const newTag: TrapTag = {
      ...tag,
      id: `trap_tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      modifiedAt: new Date(),
    }
    setTrapTags(prev => [...prev, newTag])
  }, [])

  const updateTrapTag = useCallback((id: string, updates: Partial<TrapTag>) => {
    setTrapTags(prev => prev.map(tag => 
      tag.id === id 
        ? { ...tag, ...updates, modifiedAt: new Date() }
        : tag
    ))
  }, [])

  const deleteTrapTag = useCallback((id: string) => {
    setTrapTags(prev => prev.filter(tag => tag.id !== id))
  }, [])

  const clearTrapTags = useCallback(() => {
    setTrapTags([])
  }, [])

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

      // Step 4: Generate trap geometry (with TrapTags support)
      const layer = buildTrapLayer(
        document.id,
        decisions,
        adjMap.regions,
        settings,
        trapTags  // Pass TrapTags for selective trapping
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
  }, [settings, ruleEngine, trapTags])

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
    // Trap Selection
    selectedTrapId,
    hoveredTrapId,
    selectedTrap,
    selectTrap,
    hoverTrap,
    // TrapTags
    trapTags,
    addTrapTag,
    updateTrapTag,
    deleteTrapTag,
    clearTrapTags,
    // Actions
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
