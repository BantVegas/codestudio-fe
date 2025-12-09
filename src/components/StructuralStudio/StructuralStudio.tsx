/**
 * GPCS CodeStudio - Structural Studio
 * 
 * Professional Die Line Management Interface
 * ESKO ArtiosCAD-level functionality
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { DieLineInfo, DieLineType, MaterialSpec } from '../../prepress/dieline/DieLineTypes'
import { dieLineManager } from '../../prepress/dieline/DieLineManager'
import { parametricEngine } from '../../prepress/dieline/parametric/ParametricEngine'
import { materialLibrary } from '../../prepress/dieline/MaterialLibrary'
import { pdfDieLineIO } from '../../prepress/dieline/PDFDieLineIO'
import { DieLineViewer3D } from './DieLineViewer3D'
import { useDieLineEditor, EDITOR_TOOLS, LINE_TYPE_OPTIONS, type EditorTool } from './DieLineEditor'
import { validateDieLine, generateValidationReport, VALIDATION_PROFILES, type ValidationResult } from './ValidationEngine'
import { ShapeTools, createRectangle, createRoundedRectangle, createEllipse, createPolygon } from './ShapeTools'
import { ExportEngine, exportToSVG, exportToDXF, exportToCFF2, generateProductionPack } from './ExportEngine'
import { MeasureTools, measureDistance, measurePerimeter, measureArea } from './MeasureTools'

interface StructuralStudioProps {
  onBack: () => void
  onApplyToLayout?: (dieLine: DieLineInfo) => void
}

// Material category type
type MaterialCategory = 'ALL' | 'PAPER' | 'FILM' | 'WINE' | 'SPECIALTY' | 'CARTON'

// Line type colors
const LINE_COLORS: Record<DieLineType, string> = {
  'CUT': '#ef4444',
  'CREASE': '#22c55e',
  'PERFORATION': '#eab308',
  'PARTIAL_CUT': '#f97316',
  'REVERSE_CREASE': '#10b981',
  'SCORE': '#14b8a6',
  'ZIPPER': '#8b5cf6',
  'BLEED': '#3b82f6',
  'ANNOTATION': '#6b7280',
  'GLUE': '#a855f7',
  'VARNISH_FREE': '#ec4899',
  'STRIPPING': '#64748b',
  'REGISTER': '#06b6d4',
  'UNKNOWN': '#9ca3af'
}

export const StructuralStudio: React.FC<StructuralStudioProps> = ({ onBack, onApplyToLayout }) => {
  // State
  const [activeDieLine, setActiveDieLine] = useState<DieLineInfo | null>(null)
  const [activeTab, setActiveTab] = useState<'IMPORT' | 'LIBRARY' | 'VALIDATE' | '3D' | 'EDIT'>('IMPORT')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  
  // Label parametric state
  const [labelWidth, setLabelWidth] = useState(100)
  const [labelHeight, setLabelHeight] = useState(60)
  const [cornerRadius, setCornerRadius] = useState(5)
  const [bleed, setBleed] = useState(3)
  const [labelShape, setLabelShape] = useState<'RECTANGLE' | 'ROUNDED_RECTANGLE' | 'OVAL' | 'CIRCLE'>('RECTANGLE')
  const [selectedMaterialId, setSelectedMaterialId] = useState(materialLibrary.getAllMaterials()[0]?.id || '')
  const [materialCategory, setMaterialCategory] = useState<MaterialCategory>('ALL')

  // Editor hook
  const editor = useDieLineEditor({
    dieLine: activeDieLine,
    onDieLineChange: setActiveDieLine
  })

  // Interactive editor state
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<'SELECT' | 'MOVE' | 'MEASURE' | 'ADD_LINE'>('SELECT')
  const [measureStart, setMeasureStart] = useState<{x: number, y: number} | null>(null)
  const [measureEnd, setMeasureEnd] = useState<{x: number, y: number} | null>(null)
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null)
  const [drawingLine, setDrawingLine] = useState<{start: {x: number, y: number}, end: {x: number, y: number}} | null>(null)
  const [newLineType, setNewLineType] = useState<DieLineType>('CUT')
  
  // View options
  const [showGrid, setShowGrid] = useState(true)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D')
  const [foldAngle, setFoldAngle] = useState(0)
  const [showHelp, setShowHelp] = useState(true)
  const [helpStep, setHelpStep] = useState(0)

  // Advanced features state
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [selectedValidationProfile, setSelectedValidationProfile] = useState('flexo')
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandSearch, setCommandSearch] = useState('')
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [snapToGuides, setSnapToGuides] = useState(true)
  const [gridSize, setGridSize] = useState(5) // mm
  const [guides, setGuides] = useState<{ horizontal: number[], vertical: number[] }>({ horizontal: [], vertical: [] })
  const [showTolerances, setShowTolerances] = useState(false)
  const [unit, setUnit] = useState<'mm' | 'inch'>('mm')
  const [precision, setPrecision] = useState(2)
  const [historyStack, setHistoryStack] = useState<DieLineInfo[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(prev => !prev)
      }
      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      // Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        handleRedo()
      }
      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedSegmentId) {
          e.preventDefault()
          deleteSelectedSegment()
        }
      }
      // Escape
      if (e.key === 'Escape') {
        setSelectedSegmentId(null)
        setShowCommandPalette(false)
        setDrawingLine(null)
        setMeasureStart(null)
        setMeasureEnd(null)
      }
      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v': setEditorMode('SELECT'); break
          case 'm': setEditorMode('MOVE'); break
          case 'r': setEditorMode('MEASURE'); break
          case 'l': setEditorMode('ADD_LINE'); break
          case 'g': setShowGrid(prev => !prev); break
          case 'd': setShowDimensions(prev => !prev); break
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedSegmentId])

  // Undo/Redo functions
  const saveToHistory = useCallback((dieLine: DieLineInfo) => {
    setHistoryStack(prev => [...prev.slice(0, historyIndex + 1), dieLine])
    setHistoryIndex(prev => prev + 1)
  }, [historyIndex])

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1)
      setActiveDieLine(historyStack[historyIndex - 1])
    }
  }, [historyIndex, historyStack])

  const handleRedo = useCallback(() => {
    if (historyIndex < historyStack.length - 1) {
      setHistoryIndex(prev => prev + 1)
      setActiveDieLine(historyStack[historyIndex + 1])
    }
  }, [historyIndex, historyStack])

  // Get filtered materials based on category
  const getFilteredMaterials = (): MaterialSpec[] => {
    const allMaterials = materialLibrary.getAllMaterials()
    switch (materialCategory) {
      case 'PAPER':
        return allMaterials.filter(m => m.id.startsWith('PAPER_'))
      case 'FILM':
        return allMaterials.filter(m => 
          m.id.startsWith('PP_') || m.id.startsWith('PE_') || 
          m.id.startsWith('PET_') || m.id.startsWith('BOPP_')
        )
      case 'WINE':
        return allMaterials.filter(m => m.id.startsWith('WINE_'))
      case 'SPECIALTY':
        return allMaterials.filter(m => 
          m.id.startsWith('VINYL_') || m.id.startsWith('TYPAR') || 
          m.id.startsWith('VOID_') || m.id.startsWith('DESTRUCTIBLE') ||
          m.id.startsWith('REMOVABLE') || m.id.startsWith('FREEZER') ||
          m.id.startsWith('HIGH_TEMP') || m.id.startsWith('WATER_') ||
          m.id.includes('SHRINK')
        )
      case 'CARTON':
        return allMaterials.filter(m => 
          m.type === 'FOLDING_CARTON' || m.type === 'CORRUGATED'
        )
      default:
        return allMaterials
    }
  }

  // Tutorial steps
  const tutorialSteps = [
    {
      title: 'Vitajte v Structural Studio',
      description: 'Profesionálny nástroj na tvorbu a správu die line štruktúr pre obalový priemysel.',
      icon: '🎉',
      highlight: null
    },
    {
      title: '1. Import alebo vytvorenie',
      description: 'Začnite importom CAD súboru (CFF2, DXF) v záložke IMPORT, alebo vygenerujte štruktúru z knižnice v záložke LIBRARY.',
      icon: '📁',
      highlight: 'tabs'
    },
    {
      title: '2. Nastavte rozmery',
      description: 'V záložke LIBRARY zadajte rozmery krabice (dĺžka, šírka, hĺbka) a vyberte materiál.',
      icon: '📐',
      highlight: 'library'
    },
    {
      title: '3. Validácia štruktúry',
      description: 'V záložke VALIDATE skontrolujte správnosť štruktúry - systém automaticky detekuje chyby a upozornenia.',
      icon: '✅',
      highlight: 'validate'
    },
    {
      title: '4. 3D náhľad',
      description: 'Prepnite do 3D režimu a sledujte ako sa krabica skladá. Použite slider pre animáciu skladania.',
      icon: '📦',
      highlight: '3d'
    },
    {
      title: '5. Export a použitie',
      description: 'Exportujte štruktúru do CFF2 formátu alebo ju aplikujte priamo na layout v Code Generator.',
      icon: '💾',
      highlight: 'toolbar'
    }
  ]

  // Fit to screen when die line changes
  useEffect(() => {
    if (activeDieLine && canvasRef.current) {
      fitToScreen()
    }
  }, [activeDieLine])

  // Convert screen coords to canvas coords
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = (screenX - rect.left) * (canvas.width / rect.width)
    const y = (screenY - rect.top) * (canvas.height / rect.height)
    return {
      x: (x - offset.x) / scale,
      y: (y - offset.y) / scale
    }
  }, [offset, scale])

  // Find segment near point
  const findSegmentAtPoint = useCallback((px: number, py: number, threshold: number = 5): string | null => {
    if (!activeDieLine) return null
    
    for (const path of activeDieLine.paths) {
      for (const seg of path.segments) {
        // Distance from point to line segment
        const dx = seg.end.x - seg.start.x
        const dy = seg.end.y - seg.start.y
        const len2 = dx * dx + dy * dy
        
        let t = 0
        if (len2 > 0) {
          t = Math.max(0, Math.min(1, ((px - seg.start.x) * dx + (py - seg.start.y) * dy) / len2))
        }
        
        const nearX = seg.start.x + t * dx
        const nearY = seg.start.y + t * dy
        const dist = Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2)
        
        if (dist < threshold / scale) {
          return seg.id
        }
      }
    }
    return null
  }, [activeDieLine, scale])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(scale, scale)

    if (showGrid) {
      drawGrid(ctx, canvas.width / scale, canvas.height / scale)
    }

    if (activeDieLine) {
      drawDieLine(ctx, activeDieLine)
      
      // Draw selection/hover highlights
      activeDieLine.paths.forEach(path => {
        path.segments.forEach(seg => {
          const isSelected = seg.id === selectedSegmentId
          const isHovered = seg.id === hoveredSegmentId && !isSelected
          
          if (isSelected || isHovered) {
            ctx.beginPath()
            ctx.strokeStyle = isSelected ? '#22c55e' : '#60a5fa'
            ctx.lineWidth = (isSelected ? 4 : 3) / scale
            ctx.setLineDash([])
            ctx.moveTo(seg.start.x, seg.start.y)
            ctx.lineTo(seg.end.x, seg.end.y)
            ctx.stroke()
            
            // Draw handles for selected segment
            if (isSelected) {
              const handleSize = 6 / scale
              ctx.fillStyle = '#22c55e'
              ctx.fillRect(seg.start.x - handleSize/2, seg.start.y - handleSize/2, handleSize, handleSize)
              ctx.fillRect(seg.end.x - handleSize/2, seg.end.y - handleSize/2, handleSize, handleSize)
              
              // Midpoint handle
              const midX = (seg.start.x + seg.end.x) / 2
              const midY = (seg.start.y + seg.end.y) / 2
              ctx.beginPath()
              ctx.arc(midX, midY, handleSize/2, 0, Math.PI * 2)
              ctx.fill()
            }
          }
        })
      })
      
      if (showDimensions) {
        drawDimensions(ctx, activeDieLine)
      }
    }

    // Draw measure line
    if (editorMode === 'MEASURE' && measureStart && measureEnd) {
      ctx.beginPath()
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 2 / scale
      ctx.setLineDash([5 / scale, 5 / scale])
      ctx.moveTo(measureStart.x, measureStart.y)
      ctx.lineTo(measureEnd.x, measureEnd.y)
      ctx.stroke()
      ctx.setLineDash([])
      
      // Draw distance label
      const dist = Math.sqrt((measureEnd.x - measureStart.x) ** 2 + (measureEnd.y - measureStart.y) ** 2)
      const midX = (measureStart.x + measureEnd.x) / 2
      const midY = (measureStart.y + measureEnd.y) / 2
      
      ctx.fillStyle = '#f59e0b'
      ctx.font = `${14 / scale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`${dist.toFixed(2)} mm`, midX, midY - 10 / scale)
      
      // Draw endpoints
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(measureStart.x, measureStart.y, 4 / scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(measureEnd.x, measureEnd.y, 4 / scale, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw line being created
    if (editorMode === 'ADD_LINE' && drawingLine) {
      const lineColor = LINE_COLORS[newLineType] || LINE_COLORS.CUT
      ctx.beginPath()
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 2 / scale
      
      // Set dash pattern based on line type
      if (newLineType === 'CREASE' || newLineType === 'REVERSE_CREASE') {
        ctx.setLineDash([8 / scale, 4 / scale])
      } else if (newLineType === 'PERFORATION') {
        ctx.setLineDash([3 / scale, 3 / scale])
      } else if (newLineType === 'PARTIAL_CUT') {
        ctx.setLineDash([12 / scale, 3 / scale])
      } else {
        ctx.setLineDash([])
      }
      
      ctx.moveTo(drawingLine.start.x, drawingLine.start.y)
      ctx.lineTo(drawingLine.end.x, drawingLine.end.y)
      ctx.stroke()
      ctx.setLineDash([])
      
      // Draw endpoints
      ctx.fillStyle = lineColor
      ctx.beginPath()
      ctx.arc(drawingLine.start.x, drawingLine.start.y, 4 / scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(drawingLine.end.x, drawingLine.end.y, 4 / scale, 0, Math.PI * 2)
      ctx.fill()
      
      // Show length and type
      const len = Math.sqrt((drawingLine.end.x - drawingLine.start.x) ** 2 + (drawingLine.end.y - drawingLine.start.y) ** 2)
      const midX = (drawingLine.start.x + drawingLine.end.x) / 2
      const midY = (drawingLine.start.y + drawingLine.end.y) / 2
      ctx.fillStyle = lineColor
      ctx.font = `${12 / scale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`${newLineType}: ${len.toFixed(1)} mm`, midX, midY - 8 / scale)
    }

    ctx.restore()
  }, [activeDieLine, scale, offset, showGrid, showDimensions, selectedSegmentId, hoveredSegmentId, measureStart, measureEnd, editorMode, drawingLine, newLineType])

  const fitToScreen = useCallback(() => {
    if (!activeDieLine || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const padding = 80
    const availWidth = canvas.width - padding * 2
    const availHeight = canvas.height - padding * 2
    
    const scaleX = availWidth / (activeDieLine.width || 100)
    const scaleY = availHeight / (activeDieLine.height || 100)
    const newScale = Math.min(scaleX, scaleY, 5)
    
    setScale(newScale)
    setOffset({
      x: (canvas.width - (activeDieLine.width || 100) * newScale) / 2,
      y: (canvas.height - (activeDieLine.height || 100) * newScale) / 2
    })
  }, [activeDieLine])

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 10
    
    ctx.beginPath()
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1 / scale

    for (let x = -1000; x <= 1000; x += gridSize) {
      ctx.moveTo(x, -1000)
      ctx.lineTo(x, 1000)
    }
    for (let y = -1000; y <= 1000; y += gridSize) {
      ctx.moveTo(-1000, y)
      ctx.lineTo(1000, y)
    }
    ctx.stroke()
    
    // Major grid
    ctx.beginPath()
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1.5 / scale
    for (let x = -1000; x <= 1000; x += 50) {
      ctx.moveTo(x, -1000)
      ctx.lineTo(x, 1000)
    }
    for (let y = -1000; y <= 1000; y += 50) {
      ctx.moveTo(-1000, y)
      ctx.lineTo(1000, y)
    }
    ctx.stroke()
    
    // Origin
    ctx.beginPath()
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 2 / scale
    ctx.moveTo(-30, 0)
    ctx.lineTo(30, 0)
    ctx.moveTo(0, -30)
    ctx.lineTo(0, 30)
    ctx.stroke()
  }

  const drawDieLine = (ctx: CanvasRenderingContext2D, dieLine: DieLineInfo) => {
    dieLine.paths.forEach(path => {
      path.segments.forEach((seg, index) => {
        const color = LINE_COLORS[seg.lineType] || LINE_COLORS['UNKNOWN']
        
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = 2 / scale
        
        // Set dash pattern based on line type
        if (seg.lineType === 'CREASE' || seg.lineType === 'REVERSE_CREASE') {
          ctx.setLineDash([8 / scale, 4 / scale])
        } else if (seg.lineType === 'PERFORATION') {
          ctx.setLineDash([3 / scale, 3 / scale])
        } else if (seg.lineType === 'PARTIAL_CUT') {
          ctx.setLineDash([12 / scale, 3 / scale])
        } else {
          ctx.setLineDash([])
        }
        
        ctx.moveTo(seg.start.x, seg.start.y)
        
        if (seg.type === 'LINE') {
          ctx.lineTo(seg.end.x, seg.end.y)
        } else if (seg.type === 'ARC' && seg.center) {
          // Simplified arc
          ctx.lineTo(seg.end.x, seg.end.y)
        }
        
        ctx.stroke()
      })
    })
    
    ctx.setLineDash([])
  }

  const drawDimensions = (ctx: CanvasRenderingContext2D, dieLine: DieLineInfo) => {
    const { width, height } = dieLine
    const padding = 15
    
    ctx.fillStyle = '#94a3b8'
    ctx.font = `${14 / scale}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'
    
    // Width dimension
    ctx.fillText(`${width.toFixed(1)} mm`, width / 2, height + padding + 5)
    
    // Height dimension
    ctx.save()
    ctx.translate(-padding - 5, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(`${height.toFixed(1)} mm`, 0, 0)
    ctx.restore()
  }

  // File handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      let dieLine: DieLineInfo
      const fileName = file.name.toLowerCase()

      // Route to appropriate parser based on file extension
      if (fileName.endsWith('.pdf') || fileName.endsWith('.ai') || 
          fileName.endsWith('.svg') || fileName.endsWith('.eps')) {
        // Vector graphics formats - use PDFDieLineIO
        dieLine = await pdfDieLineIO.importFromFile(file)
      } else {
        // CAD formats (DXF, CFF2, ARD, CDR) - use DieLineManager
        const text = await file.text()
        dieLine = await dieLineManager.loadDieLine(text, file.name)
      }
      
      // Check if import was successful
      if (dieLine.paths.length === 0) {
        setError('Žiadne cesty neboli nájdené. Pre najlepšie výsledky exportujte ako SVG.')
        if (dieLine.warnings.length > 0) {
          console.warn('Import warnings:', dieLine.warnings)
        }
      } else {
        setActiveDieLine(dieLine)
        const segCount = dieLine.paths.reduce((a, p) => a + p.segments.length, 0)
        setSuccessMessage(`Súbor "${file.name}" bol úspešne načítaný (${segCount} segmentov)`)
        setTimeout(() => setSuccessMessage(null), 3000)
        // Auto-switch to EDIT tab
        setActiveTab('EDIT')
      }
    } catch (err) {
      setError('Nepodarilo sa načítať súbor. Skúste exportovať ako SVG z Illustratora.')
      console.error(err)
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Export to PDF
  const handleExportPDF = () => {
    if (!activeDieLine) {
      setError('Najprv načítajte alebo vygenerujte štruktúru')
      return
    }
    pdfDieLineIO.downloadPDF(activeDieLine)
    setSuccessMessage('PDF bol exportovaný')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // Export to SVG (recommended for Illustrator)
  const handleExportSVG = () => {
    if (!activeDieLine) {
      setError('Najprv načítajte alebo vygenerujte štruktúru')
      return
    }
    pdfDieLineIO.downloadSVG(activeDieLine)
    setSuccessMessage('SVG bol exportovaný')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleGenerateBox = () => {
    const material = materialLibrary.getMaterialById(selectedMaterialId)

    setError(null)
    setSuccessMessage(null)

    const dieLine = parametricEngine.generateLabel(
      labelShape,
      { width: labelWidth, height: labelHeight, cornerRadius, bleed },
      material || undefined
    )
    setActiveDieLine(dieLine)
    setSuccessMessage(`Etiketa ${labelShape} (${labelWidth}×${labelHeight} mm) bola vygenerovaná`)
    
    // Auto-hide success message
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // Export CFF2
  const handleExportCFF2 = () => {
    if (!activeDieLine) {
      setError('Najprv načítajte alebo vygenerujte štruktúru')
      return
    }

    // Generate CFF2 content
    const cff2Lines: string[] = [
      'BOF',
      'CFF2',
      `UNITS,${activeDieLine.unit}`,
      `NAME,${activeDieLine.name}`,
      ''
    ]

    // Export paths
    for (const path of activeDieLine.paths) {
      for (const seg of path.segments) {
        const typeCode = seg.lineType === 'CUT' ? 1 : seg.lineType === 'CREASE' ? 2 : 0
        if (seg.type === 'LINE') {
          cff2Lines.push(`L,${seg.start.x.toFixed(3)},${seg.start.y.toFixed(3)},${seg.end.x.toFixed(3)},${seg.end.y.toFixed(3)},${typeCode}`)
        } else if (seg.type === 'ARC' && seg.center) {
          const dir = seg.clockwise ? 0 : 1
          cff2Lines.push(`A,${seg.start.x.toFixed(3)},${seg.start.y.toFixed(3)},${seg.end.x.toFixed(3)},${seg.end.y.toFixed(3)},${seg.center.x.toFixed(3)},${seg.center.y.toFixed(3)},${dir},${typeCode}`)
        }
      }
    }

    cff2Lines.push('', 'EOF')

    // Create and download file
    const content = cff2Lines.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeDieLine.name.replace(/\.[^.]+$/, '')}_export.cff`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setSuccessMessage('Súbor bol exportovaný')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // Apply to Layout
  const handleApplyToLayout = () => {
    if (!activeDieLine) {
      setError('Najprv načítajte alebo vygenerujte štruktúru')
      return
    }

    if (onApplyToLayout) {
      onApplyToLayout(activeDieLine)
      setSuccessMessage('Štruktúra bola aplikovaná na layout')
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      // If no callback, show info about the structure
      setSuccessMessage(`Štruktúra pripravená: ${activeDieLine.width.toFixed(1)}×${activeDieLine.height.toFixed(1)} mm`)
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }

  // Run validation
  const runValidation = useCallback(() => {
    if (!activeDieLine) return
    const profile = VALIDATION_PROFILES.find(p => p.id === selectedValidationProfile) || VALIDATION_PROFILES[0]
    const results = validateDieLine(activeDieLine, profile)
    setValidationResults(results)
    
    const errors = results.filter(r => r.severity === 'ERROR').length
    const warnings = results.filter(r => r.severity === 'WARNING').length
    
    if (errors === 0 && warnings === 0) {
      setSuccessMessage('✅ Validácia úspešná - žiadne problémy')
    } else {
      setError(`Validácia: ${errors} chýb, ${warnings} varovaní`)
    }
    setTimeout(() => { setError(null); setSuccessMessage(null) }, 5000)
  }, [activeDieLine, selectedValidationProfile])

  // Export production pack
  const handleExportProductionPack = async () => {
    if (!activeDieLine) return
    
    setIsLoading(true)
    try {
      const files = await generateProductionPack(activeDieLine, {
        includeReport: true,
        includePreview: true,
        includeSVG: true,
        includeDXF: true,
        includeCFF2: true,
        validationProfile: selectedValidationProfile
      })
      
      // Create and download zip (simplified - in production use JSZip)
      for (const file of files) {
        const url = URL.createObjectURL(file.content)
        const a = document.createElement('a')
        a.href = url
        a.download = file.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      
      setSuccessMessage(`Production pack exportovaný (${files.length} súborov)`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (e) {
      setError('Chyba pri exporte production pack')
    } finally {
      setIsLoading(false)
    }
  }

  // Add shape to die line
  const addShape = (shapeType: 'RECTANGLE' | 'ROUNDED_RECT' | 'ELLIPSE' | 'POLYGON', sides?: number) => {
    const centerX = activeDieLine ? activeDieLine.width / 2 : 50
    const centerY = activeDieLine ? activeDieLine.height / 2 : 50
    
    let newPath
    switch (shapeType) {
      case 'RECTANGLE':
        newPath = createRectangle({ width: 40, height: 30, centerX, centerY, lineType: newLineType })
        break
      case 'ROUNDED_RECT':
        newPath = createRoundedRectangle({ width: 40, height: 30, centerX, centerY, cornerRadius: 5, lineType: newLineType })
        break
      case 'ELLIPSE':
        newPath = createEllipse({ radiusX: 20, radiusY: 15, centerX, centerY, lineType: newLineType })
        break
      case 'POLYGON':
        newPath = createPolygon({ radius: 20, sides: sides || 6, centerX, centerY, lineType: newLineType })
        break
    }
    
    if (newPath) {
      if (activeDieLine) {
        const updated = { ...activeDieLine, paths: [...activeDieLine.paths, newPath], modified: new Date() }
        setActiveDieLine(updated)
        saveToHistory(updated)
      } else {
        const newDieLine: DieLineInfo = {
          id: `dieline_${Date.now()}`,
          name: 'Nový die line',
          format: 'CFF2',
          unit: 'MM',
          width: 100,
          height: 100,
          created: new Date(),
          modified: new Date(),
          layers: [],
          paths: [newPath],
          errors: [],
          warnings: []
        }
        setActiveDieLine(newDieLine)
        saveToHistory(newDieLine)
      }
    }
  }

  // Generate bleed/safe area
  const generateBleedSafe = (type: 'BLEED' | 'SAFE', amount: number) => {
    if (!activeDieLine) return
    
    const cutPaths = activeDieLine.paths.filter(p => 
      p.segments.some(s => s.lineType === 'CUT')
    )
    
    if (cutPaths.length === 0) {
      setError('Nenašla sa žiadna CUT vrstva')
      return
    }
    
    const newPaths = cutPaths.map(path => 
      type === 'BLEED' 
        ? ShapeTools.generateBleed(path, amount)
        : ShapeTools.generateSafeArea(path, amount)
    )
    
    const updated = { 
      ...activeDieLine, 
      paths: [...activeDieLine.paths, ...newPaths],
      modified: new Date()
    }
    setActiveDieLine(updated)
    saveToHistory(updated)
    setSuccessMessage(`${type === 'BLEED' ? 'Bleed' : 'Safe area'} vygenerovaný (${amount} mm)`)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // One-click cleanup
  const handleCleanup = () => {
    if (!activeDieLine) return
    
    // Remove duplicate segments, very short segments, etc.
    let cleaned = 0
    const newPaths = activeDieLine.paths.map(path => {
      const uniqueSegments: typeof path.segments = []
      const seen = new Set<string>()
      
      path.segments.forEach(seg => {
        const key = `${seg.start.x.toFixed(2)},${seg.start.y.toFixed(2)}-${seg.end.x.toFixed(2)},${seg.end.y.toFixed(2)}`
        const keyReverse = `${seg.end.x.toFixed(2)},${seg.end.y.toFixed(2)}-${seg.start.x.toFixed(2)},${seg.start.y.toFixed(2)}`
        
        // Skip duplicates
        if (seen.has(key) || seen.has(keyReverse)) {
          cleaned++
          return
        }
        
        // Skip very short segments
        const len = Math.sqrt((seg.end.x - seg.start.x) ** 2 + (seg.end.y - seg.start.y) ** 2)
        if (len < 0.1) {
          cleaned++
          return
        }
        
        seen.add(key)
        uniqueSegments.push(seg)
      })
      
      return { ...path, segments: uniqueSegments }
    }).filter(path => path.segments.length > 0)
    
    const updated = { ...activeDieLine, paths: newPaths, modified: new Date() }
    setActiveDieLine(updated)
    saveToHistory(updated)
    setSuccessMessage(`Cleanup dokončený: odstránených ${cleaned} segmentov`)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // Mouse handlers for interactive editing
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvasPos = screenToCanvas(e.clientX, e.clientY)
    console.log('Mouse down at', canvasPos, 'mode:', editorMode)
    
    if (editorMode === 'SELECT') {
      // Try to select a segment
      const segId = findSegmentAtPoint(canvasPos.x, canvasPos.y)
      console.log('Found segment:', segId)
      if (segId) {
        console.log('Setting selectedSegmentId to:', segId)
        setSelectedSegmentId(segId)
        setDragStart(canvasPos)
      } else {
        setSelectedSegmentId(null)
        // Start panning
        setIsDragging(true)
        setLastPos({ x: e.clientX, y: e.clientY })
      }
    } else if (editorMode === 'MOVE') {
      const segId = findSegmentAtPoint(canvasPos.x, canvasPos.y)
      if (segId) {
        setSelectedSegmentId(segId)
        setDragStart(canvasPos)
      } else {
        setIsDragging(true)
        setLastPos({ x: e.clientX, y: e.clientY })
      }
    } else if (editorMode === 'MEASURE') {
      setMeasureStart(canvasPos)
      setMeasureEnd(canvasPos)
    } else if (editorMode === 'ADD_LINE') {
      // Start drawing a new line
      setDrawingLine({ start: canvasPos, end: canvasPos })
    } else {
      setIsDragging(true)
      setLastPos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvasPos = screenToCanvas(e.clientX, e.clientY)
    
    // Update hover state
    if (editorMode === 'SELECT' || editorMode === 'MOVE') {
      const segId = findSegmentAtPoint(canvasPos.x, canvasPos.y)
      setHoveredSegmentId(segId)
    }
    
    if (editorMode === 'MEASURE' && measureStart) {
      setMeasureEnd(canvasPos)
    } else if (editorMode === 'ADD_LINE' && drawingLine) {
      // Update line end point while drawing
      setDrawingLine({ ...drawingLine, end: canvasPos })
    } else if (editorMode === 'MOVE' && dragStart && selectedSegmentId && activeDieLine) {
      // Move selected segment
      const dx = canvasPos.x - dragStart.x
      const dy = canvasPos.y - dragStart.y
      
      const newPaths = activeDieLine.paths.map(path => ({
        ...path,
        segments: path.segments.map(seg => {
          if (seg.id === selectedSegmentId) {
            return {
              ...seg,
              start: { x: seg.start.x + dx, y: seg.start.y + dy },
              end: { x: seg.end.x + dx, y: seg.end.y + dy }
            }
          }
          return seg
        })
      }))
      
      setActiveDieLine({ ...activeDieLine, paths: newPaths })
      setDragStart(canvasPos)
    } else if (isDragging) {
      const dx = e.clientX - lastPos.x
      const dy = e.clientY - lastPos.y
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      setLastPos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    // Finish drawing line
    if (editorMode === 'ADD_LINE' && drawingLine) {
      const lineLength = Math.sqrt(
        (drawingLine.end.x - drawingLine.start.x) ** 2 + 
        (drawingLine.end.y - drawingLine.start.y) ** 2
      )
      
      // Only add if line is long enough (> 2mm)
      if (lineLength > 2) {
        const newSegment = {
          id: `seg_${Date.now()}`,
          type: 'LINE' as const,
          lineType: newLineType,
          start: drawingLine.start,
          end: drawingLine.end
        }
        
        if (activeDieLine) {
          // Add to existing die line
          const newPaths = [...activeDieLine.paths]
          if (newPaths.length > 0) {
            newPaths[0] = {
              ...newPaths[0],
              segments: [...newPaths[0].segments, newSegment]
            }
          } else {
            newPaths.push({
              id: `path_${Date.now()}`,
              segments: [newSegment],
              isClosed: false,
              lineType: newLineType,
              bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }
            })
          }
          setActiveDieLine({ ...activeDieLine, paths: newPaths })
        } else {
          // Create new die line
          setActiveDieLine({
            id: `dieline_${Date.now()}`,
            name: 'Nový die line',
            format: 'CFF2',
            unit: 'MM',
            width: 200,
            height: 200,
            created: new Date(),
            modified: new Date(),
            layers: [],
            paths: [{
              id: `path_${Date.now()}`,
              segments: [newSegment],
              isClosed: false,
              lineType: newLineType,
              bounds: { minX: 0, minY: 0, maxX: 200, maxY: 200, width: 200, height: 200 }
            }],
            errors: [],
            warnings: []
          })
        }
      }
      setDrawingLine(null)
    }
    
    setIsDragging(false)
    setDragStart(null)
    if (editorMode === 'MEASURE' && measureStart && measureEnd) {
      // Keep measure visible
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomFactor = 0.001
    const newScale = scale * (1 - e.deltaY * zoomFactor)
    setScale(Math.max(0.1, Math.min(20, newScale)))
  }

  // Delete selected segment
  const deleteSelectedSegment = () => {
    if (!selectedSegmentId || !activeDieLine) return
    
    const newPaths = activeDieLine.paths.map(path => ({
      ...path,
      segments: path.segments.filter(seg => seg.id !== selectedSegmentId)
    })).filter(path => path.segments.length > 0)
    
    setActiveDieLine({ ...activeDieLine, paths: newPaths })
    setSelectedSegmentId(null)
  }

  // Change line type of selected segment
  const changeSelectedSegmentType = (newType: DieLineType) => {
    if (!selectedSegmentId || !activeDieLine) {
      console.log('No segment selected or no die line')
      return
    }
    
    console.log('Changing segment', selectedSegmentId, 'to type', newType)
    
    const updatedPaths = activeDieLine.paths.map(path => ({
      ...path,
      segments: path.segments.map(seg => {
        if (seg.id === selectedSegmentId) {
          console.log('Found segment, changing from', seg.lineType, 'to', newType)
          return { ...seg, lineType: newType }
        }
        return seg
      })
    }))
    
    const updatedDieLine = { 
      ...activeDieLine, 
      paths: updatedPaths,
      modified: new Date()
    }
    
    console.log('Updated die line:', updatedDieLine)
    setActiveDieLine(updatedDieLine)
  }

  // Change ALL segments to a specific type
  const changeAllSegmentsType = (newType: DieLineType) => {
    if (!activeDieLine) return
    
    const updatedPaths = activeDieLine.paths.map(path => ({
      ...path,
      segments: path.segments.map(seg => ({ ...seg, lineType: newType }))
    }))
    
    setActiveDieLine({ 
      ...activeDieLine, 
      paths: updatedPaths,
      modified: new Date()
    })
  }

  // Get selected segment info
  const getSelectedSegment = () => {
    if (!selectedSegmentId || !activeDieLine) return null
    for (const path of activeDieLine.paths) {
      const seg = path.segments.find(s => s.id === selectedSegmentId)
      if (seg) return seg
    }
    return null
  }

  const selectedSegment = getSelectedSegment()

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-80 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                title="Späť na výber modulu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold text-emerald-400">Structural Studio</h1>
                <p className="text-xs text-slate-500">Die Line Management</p>
              </div>
            </div>
            <button
              onClick={() => { setShowHelp(true); setHelpStep(0); }}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-emerald-400"
              title="Zobraziť návod"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {([
            { id: 'IMPORT' as const, label: 'IMPORT', tooltip: 'Import súborov (SVG, PDF, DXF, AI, EPS)' },
            { id: 'LIBRARY' as const, label: 'LIBRARY', tooltip: 'Generovať štruktúru z knižnice' },
            { id: 'EDIT' as const, label: 'EDIT', tooltip: 'Nástroje na úpravu die line' },
            { id: 'VALIDATE' as const, label: 'VALIDATE', tooltip: 'Validácia a kontrola štruktúry' },
            { id: '3D' as const, label: '3D', tooltip: '3D náhľad' }
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.tooltip}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {successMessage}
            </div>
          )}

          {activeTab === 'IMPORT' && (
            <div className="space-y-6">
              {/* Recommendation tip */}
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-xs text-orange-300 leading-relaxed">
                    <strong>Odporúčanie:</strong> Pre najlepšie výsledky exportujte z Illustratora ako <span className="text-orange-400 font-bold">SVG</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Import súboru</h3>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-emerald-400">Kliknite pre nahratie</span> alebo pretiahnite
                    </p>
                    <p className="text-xs text-slate-600 mt-1">SVG, PDF, AI, EPS, DXF, CFF2</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".svg,.pdf,.ai,.eps,.cf2,.cff,.dxf,.ard,.cdr"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Podporované formáty</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="w-10 text-orange-400 font-bold">SVG</span>
                    <span className="text-orange-300">Odporúčané</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="w-10 text-red-400 font-medium">PDF</span>
                    <span>Illustrator</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="w-10 text-purple-400 font-medium">AI</span>
                    <span>Illustrator</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="w-10 text-pink-400 font-medium">EPS</span>
                    <span>PostScript</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="w-10 text-blue-400 font-medium">DXF</span>
                    <span>AutoCAD</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="w-10 text-yellow-400 font-medium">CFF2</span>
                    <span>ArtiosCAD</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="w-10 text-cyan-400 font-medium">CDR</span>
                    <span>CorelDRAW</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="w-10 text-green-400 font-medium">ARD</span>
                    <span>EngView</span>
                  </div>
                </div>
              </div>

              {/* How to export from Illustrator */}
              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Ako exportovať z Illustratora</h3>
                <ol className="space-y-2 text-xs text-slate-400 list-decimal list-inside">
                  <li>File → Export → Export As...</li>
                  <li>Vyberte formát <span className="text-orange-400">SVG</span></li>
                  <li>Nastavte "Styling" na "Presentation Attributes"</li>
                  <li>Kliknite Export</li>
                </ol>
              </div>

              {/* Alternative action */}
              <div className="border-t border-slate-800 pt-4">
                <p className="text-xs text-slate-500 text-center mb-3">Nemáte súbor?</p>
                <button
                  onClick={() => setActiveTab('LIBRARY')}
                  className="w-full py-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  → Vygenerujte štruktúru z knižnice
                </button>
              </div>
            </div>
          )}

          {activeTab === 'LIBRARY' && (
            <div className="space-y-6">
              {/* Contextual tip */}
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Vyberte tvar etikety, zadajte rozmery v <span className="text-emerald-400">mm</span> a vygenerujte die line.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Tvar etikety</h3>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'RECTANGLE', label: 'Obdĺžnik', icon: '▭' },
                    { id: 'ROUNDED_RECTANGLE', label: 'Zaoblený', icon: '▢' },
                    { id: 'OVAL', label: 'Ovál', icon: '⬭' },
                    { id: 'CIRCLE', label: 'Kruh', icon: '○' }
                  ] as const).map(shape => (
                    <button
                      key={shape.id}
                      onClick={() => setLabelShape(shape.id)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        labelShape === shape.id
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-emerald-500/30'
                      }`}
                    >
                      <div className="text-2xl mb-1">{shape.icon}</div>
                      <div className="text-xs">{shape.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Rozmery</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Šírka</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={labelWidth}
                        onChange={e => setLabelWidth(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">mm</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Výška</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={labelHeight}
                        onChange={e => setLabelHeight(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">mm</span>
                    </div>
                  </div>
                  {labelShape === 'ROUNDED_RECTANGLE' && (
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Polomer rohov</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={cornerRadius}
                          onChange={e => setCornerRadius(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">mm</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Bleed (spadávka)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={bleed}
                        onChange={e => setBleed(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">mm</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Materiál</h3>
                
                {/* Category filter */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {([
                    { id: 'ALL', label: 'Všetky' },
                    { id: 'PAPER', label: 'Papier' },
                    { id: 'FILM', label: 'Fólie' },
                    { id: 'WINE', label: 'Vínne' },
                    { id: 'SPECIALTY', label: 'Špeciálne' },
                    { id: 'CARTON', label: 'Kartón' }
                  ] as const).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setMaterialCategory(cat.id)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        materialCategory === cat.id
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <select
                  value={selectedMaterialId}
                  onChange={e => setSelectedMaterialId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  {getFilteredMaterials().map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                
                {/* Material count */}
                <p className="text-xs text-slate-600 mt-2">
                  {getFilteredMaterials().length} materiálov v kategórii
                </p>
              </div>

              <button
                onClick={handleGenerateBox}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg font-semibold text-sm hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25"
              >
                Generovať Die Line
              </button>
            </div>
          )}

          {activeTab === 'EDIT' && (
            <div className="space-y-4">
              {activeDieLine ? (
                <>
                  {/* Instructions */}
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <h4 className="text-xs font-semibold text-blue-400 mb-2">📌 Ako zmeniť typ čiary:</h4>
                    <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                      <li>Kliknite na <span className="text-emerald-400">Výber</span> v toolbare hore</li>
                      <li>Kliknite na čiaru na plátne (zvýrazní sa zelene)</li>
                      <li>Vyberte nový typ čiary nižšie</li>
                    </ol>
                  </div>

                  {/* Line Type Selection */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">
                      {selectedSegmentId ? '✓ Zmeniť typ vybranej čiary' : 'Typ čiary'}
                    </h3>
                    {selectedSegmentId ? (
                      <p className="text-xs text-emerald-400 mb-2">Segment vybraný! Kliknite na typ pre zmenu.</p>
                    ) : (
                      <p className="text-xs text-slate-500 mb-2">Najprv vyberte čiaru na plátne</p>
                    )}
                    <div className="space-y-1">
                      {([
                        { id: 'CUT' as DieLineType, label: 'CUT (Rez)', color: LINE_COLORS.CUT },
                        { id: 'CREASE' as DieLineType, label: 'CREASE (Ohyb)', color: LINE_COLORS.CREASE },
                        { id: 'PERFORATION' as DieLineType, label: 'PERFORATION', color: LINE_COLORS.PERFORATION },
                        { id: 'PARTIAL_CUT' as DieLineType, label: 'PARTIAL CUT', color: LINE_COLORS.PARTIAL_CUT },
                        { id: 'REVERSE_CREASE' as DieLineType, label: 'REVERSE CREASE', color: LINE_COLORS.REVERSE_CREASE },
                        { id: 'SCORE' as DieLineType, label: 'SCORE (Ryha)', color: LINE_COLORS.SCORE },
                        { id: 'ZIPPER' as DieLineType, label: 'ZIPPER', color: LINE_COLORS.ZIPPER },
                        { id: 'BLEED' as DieLineType, label: 'BLEED (Spadávka)', color: LINE_COLORS.BLEED }
                      ]).map(lt => {
                        const isCurrentType = selectedSegment?.lineType === lt.id
                        return (
                          <button
                            key={lt.id}
                            onClick={() => {
                              if (selectedSegmentId) {
                                changeSelectedSegmentType(lt.id)
                              }
                              setNewLineType(lt.id)
                            }}
                            disabled={!selectedSegmentId}
                            className={`w-full p-2 rounded flex items-center gap-3 transition-all border-2 ${
                              isCurrentType
                                ? ''
                                : selectedSegmentId 
                                  ? 'bg-slate-800 hover:bg-slate-700 border-transparent'
                                  : 'bg-slate-800/50 border-transparent opacity-50 cursor-not-allowed'
                            }`}
                            style={{
                              backgroundColor: isCurrentType ? `${lt.color}20` : undefined,
                              borderColor: isCurrentType ? lt.color : 'transparent'
                            }}
                          >
                            <div className="w-8 h-0.5 rounded" style={{ backgroundColor: lt.color }} />
                            <span className="text-xs" style={{ color: isCurrentType ? lt.color : '#94a3b8' }}>{lt.label}</span>
                            {isCurrentType && <span className="ml-auto text-xs text-emerald-400">✓ aktuálny</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Change ALL button */}
                  <div className="border-t border-slate-800 pt-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Hromadná zmena</h3>
                    <p className="text-xs text-slate-500 mb-2">Zmeniť všetky čiary naraz:</p>
                    <div className="grid grid-cols-2 gap-1">
                      {([
                        { id: 'CUT' as DieLineType, label: 'CUT', color: LINE_COLORS.CUT },
                        { id: 'CREASE' as DieLineType, label: 'CREASE', color: LINE_COLORS.CREASE },
                        { id: 'PERFORATION' as DieLineType, label: 'PERF', color: LINE_COLORS.PERFORATION },
                        { id: 'BLEED' as DieLineType, label: 'BLEED', color: LINE_COLORS.BLEED }
                      ]).map(lt => (
                        <button
                          key={lt.id}
                          onClick={() => changeAllSegmentsType(lt.id)}
                          className="p-2 text-xs bg-slate-800 hover:bg-slate-700 rounded flex items-center gap-2"
                        >
                          <div className="w-3 h-0.5 rounded" style={{ backgroundColor: lt.color }} />
                          <span>Všetky → {lt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Segment Info */}
                  {selectedSegment && (
                    <div className="border-t border-slate-800 pt-4">
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">Vybraný segment</h3>
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Typ:</span>
                            <span className="text-emerald-400 font-medium">{selectedSegment.lineType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Dĺžka:</span>
                            <span className="text-slate-300">
                              {Math.sqrt((selectedSegment.end.x - selectedSegment.start.x) ** 2 + (selectedSegment.end.y - selectedSegment.start.y) ** 2).toFixed(2)} mm
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={deleteSelectedSegment}
                          className="w-full mt-3 py-2 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded"
                        >
                          Zmazať segment
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Transform All */}
                  <div className="border-t border-slate-800 pt-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Transformovať všetko</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => editor.scale(1.1)} className="py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded" title="Zväčšiť o 10%">+10%</button>
                      <button onClick={() => editor.scale(0.9)} className="py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded" title="Zmenšiť o 10%">-10%</button>
                      <button onClick={() => editor.rotate(90)} className="py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded" title="Otočiť o 90° v smere hodinových ručičiek">↻ 90°</button>
                      <button onClick={() => editor.rotate(-90)} className="py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded" title="Otočiť o 90° proti smeru hodinových ručičiek">↺ -90°</button>
                      <button onClick={() => editor.mirror('horizontal')} className="py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded" title="Prevrátiť horizontálne">⇆ Flip H</button>
                      <button onClick={() => editor.mirror('vertical')} className="py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded" title="Prevrátiť vertikálne">⇅ Flip V</button>
                    </div>
                  </div>

                  {/* Add Shapes */}
                  <div className="border-t border-slate-800 pt-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Pridať tvar</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => addShape('RECTANGLE')} 
                        className="py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center gap-1"
                        title="Pridať obdĺžnik 40×30mm"
                      >
                        ▭ Obdĺžnik
                      </button>
                      <button 
                        onClick={() => addShape('ROUNDED_RECT')} 
                        className="py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center gap-1"
                        title="Pridať zaoblený obdĺžnik s rádiusom 5mm"
                      >
                        ▢ Zaoblený
                      </button>
                      <button 
                        onClick={() => addShape('ELLIPSE')} 
                        className="py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center gap-1"
                        title="Pridať elipsu"
                      >
                        ⬭ Elipsa
                      </button>
                      <button 
                        onClick={() => addShape('POLYGON', 6)} 
                        className="py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center gap-1"
                        title="Pridať 6-uholník"
                      >
                        ⬡ Polygon
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="border-t border-slate-800 pt-4">
                    <div className="p-3 rounded-lg bg-slate-800/50 text-xs text-slate-400">
                      <div className="flex justify-between mb-1">
                        <span>Segmenty:</span>
                        <span className="text-slate-300">{activeDieLine.paths.reduce((a, p) => a + p.segments.length, 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rozmery:</span>
                        <span className="text-slate-300">{activeDieLine.width.toFixed(1)} × {activeDieLine.height.toFixed(1)} mm</span>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="border-t border-slate-800 pt-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Ovládanie</h3>
                    <div className="space-y-1 text-xs text-slate-500">
                      <div>• <span className="text-slate-400">Klik na čiaru</span> = výber</div>
                      <div>• <span className="text-slate-400">Ťahanie</span> = presun (v MOVE móde)</div>
                      <div>• <span className="text-slate-400">Scroll</span> = zoom</div>
                      <div>• <span className="text-slate-400">Ťahanie mimo</span> = posun plátna</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-4xl mb-3">✏️</div>
                  <p className="text-sm">Najprv importujte alebo vygenerujte die line</p>
                  <button
                    onClick={() => setActiveTab('IMPORT')}
                    className="mt-3 text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    → Prejsť na Import
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'VALIDATE' && (
            <div className="space-y-4">
              {activeDieLine ? (
                <>
                  {/* Validation Profile Selection */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Validačný profil</h4>
                    <select
                      value={selectedValidationProfile}
                      onChange={e => setSelectedValidationProfile(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    >
                      {VALIDATION_PROFILES.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - {p.description}</option>
                      ))}
                    </select>
                  </div>

                  {/* Run Validation Button */}
                  <button
                    onClick={runValidation}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg font-semibold text-sm hover:from-emerald-400 hover:to-teal-500 transition-all"
                  >
                    ✅ Spustiť validáciu
                  </button>

                  {/* Structure Info */}
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Informácie o štruktúre</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Názov</span>
                        <span className="text-slate-300">{activeDieLine.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Formát</span>
                        <span className="text-slate-300">{activeDieLine.format}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rozmery</span>
                        <span className="text-slate-300">{activeDieLine.width.toFixed(1)} × {activeDieLine.height.toFixed(1)} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cesty</span>
                        <span className="text-slate-300">{activeDieLine.paths.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Segmenty</span>
                        <span className="text-slate-300">{activeDieLine.paths.reduce((a, p) => a + p.segments.length, 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Validation Results */}
                  {validationResults.length > 0 && (
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">Výsledky validácie</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {validationResults.map((r, i) => (
                          <div 
                            key={i} 
                            className={`p-2 rounded text-xs flex items-start gap-2 ${
                              r.severity === 'ERROR' ? 'bg-red-500/10 text-red-400' :
                              r.severity === 'WARNING' ? 'bg-yellow-500/10 text-yellow-400' :
                              r.severity === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' :
                              'bg-blue-500/10 text-blue-400'
                            }`}
                          >
                            <span>
                              {r.severity === 'ERROR' ? '❌' : 
                               r.severity === 'WARNING' ? '⚠️' : 
                               r.severity === 'PASS' ? '✅' : 'ℹ️'}
                            </span>
                            <div>
                              <div className="font-medium">{r.message}</div>
                              {r.details && <div className="text-slate-500 mt-0.5">{r.details}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="border-t border-slate-800 pt-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Rýchle akcie</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleCleanup}
                        className="py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center gap-2"
                        title="Odstráni duplicitné a príliš krátke segmenty"
                      >
                        🧹 Cleanup
                      </button>
                      <button
                        onClick={() => generateBleedSafe('BLEED', 3)}
                        className="py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center gap-2"
                        title="Vygeneruje bleed vrstvu 3mm od CUT"
                      >
                        📏 +Bleed 3mm
                      </button>
                      <button
                        onClick={() => generateBleedSafe('SAFE', 2)}
                        className="py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center gap-2"
                        title="Vygeneruje safe area 2mm od CUT"
                      >
                        🛡️ +Safe 2mm
                      </button>
                      <button
                        onClick={handleExportProductionPack}
                        className="py-2 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg flex items-center justify-center gap-2"
                        title="Exportuje všetky formáty + report"
                      >
                        📦 Production Pack
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-sm">Najprv načítajte alebo vygenerujte die line</p>
                  <button
                    onClick={() => setActiveTab('IMPORT')}
                    className="mt-3 text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    → Prejsť na Import
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === '3D' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">3D Preview</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Visualize the folded structure in 3D. Use the slider to animate folding.
                </p>
                
                <button
                  onClick={() => setViewMode(viewMode === '2D' ? '3D' : '2D')}
                  className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                    viewMode === '3D'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500'
                  }`}
                >
                  {viewMode === '3D' ? 'Switch to 2D View' : 'Open 3D View'}
                </button>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Fold Animation</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-500">Fold Angle</span>
                      <span className="text-emerald-400">{foldAngle}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={foldAngle}
                      onChange={e => setFoldAngle(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>Flat</span>
                      <span>Folded</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFoldAngle(0)}
                      className="flex-1 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setFoldAngle(50)}
                      className="flex-1 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      50%
                    </button>
                    <button
                      onClick={() => setFoldAngle(100)}
                      className="flex-1 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      100%
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Controls</h3>
                <div className="space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-400">Drag</kbd>
                    <span>Rotate view</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-400">Scroll</kbd>
                    <span>Zoom in/out</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Main Toolbar */}
        <div className="h-14 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={fitToScreen}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Fit
            </button>
            <div className="px-3 py-1.5 text-xs bg-slate-800/50 rounded-lg text-slate-400">
              {(scale * 100).toFixed(0)}%
            </div>
            <div className="w-px h-6 bg-slate-700 mx-2" />
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={e => setShowGrid(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              Grid
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showDimensions}
                onChange={e => setShowDimensions(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              Dimensions
            </label>
            <div className="w-px h-6 bg-slate-700 mx-2" />
            <div className="flex rounded-lg overflow-hidden border border-slate-700">
              <button
                onClick={() => setViewMode('2D')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === '2D' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                2D
              </button>
              <button
                onClick={() => setViewMode('3D')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === '3D' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                3D
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportPDF}
              disabled={!activeDieLine}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeDieLine 
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30' 
                  : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
              }`}
              title={activeDieLine ? 'Exportovať do PDF' : 'Najprv načítajte štruktúru'}
            >
              Export PDF
            </button>
            <button 
              onClick={handleExportSVG}
              disabled={!activeDieLine}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeDieLine 
                  ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30' 
                  : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
              }`}
              title={activeDieLine ? 'Exportovať do SVG (pre Illustrator)' : 'Najprv načítajte štruktúru'}
            >
              Export SVG
            </button>
            <button 
              onClick={handleExportCFF2}
              disabled={!activeDieLine}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeDieLine 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' 
                  : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
              }`}
              title={activeDieLine ? 'Exportovať do CFF2 formátu' : 'Najprv načítajte štruktúru'}
            >
              Export CFF2
            </button>
            <button 
              onClick={handleApplyToLayout}
              disabled={!activeDieLine}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeDieLine 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white' 
                  : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
              }`}
              title={activeDieLine ? 'Aplikovať štruktúru na layout' : 'Najprv načítajte štruktúru'}
            >
              Apply to Layout
            </button>
          </div>
        </div>

        {/* Interactive Edit Toolbar */}
        {viewMode === '2D' && (
          <div className="h-10 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 px-4">
            {/* Mode buttons */}
            <div className="flex items-center gap-1">
              {([
                { id: 'SELECT' as const, icon: '↖', label: 'Výber' },
                { id: 'MOVE' as const, icon: '✥', label: 'Presun' },
                { id: 'MEASURE' as const, icon: '📏', label: 'Meranie' },
                { id: 'ADD_LINE' as const, icon: '/', label: 'Kresliť' }
              ]).map(mode => (
                <button
                  key={mode.id}
                  onClick={() => { setEditorMode(mode.id); setMeasureStart(null); setMeasureEnd(null); setDrawingLine(null); }}
                  className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 transition-colors ${
                    editorMode === mode.id
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                  title={mode.label}
                >
                  <span>{mode.icon}</span>
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>

            {/* Line type selector - shown when drawing OR when segment is selected */}
            {(editorMode === 'ADD_LINE' || selectedSegmentId) && (
              <>
                <div className="w-px h-6 bg-slate-700" />
                <div className="flex items-center gap-1 overflow-x-auto">
                  <span className="text-xs text-slate-500 mr-1">{selectedSegmentId ? 'Zmeniť:' : 'Typ:'}</span>
                  {([
                    { id: 'CUT' as DieLineType, label: 'CUT', color: LINE_COLORS.CUT },
                    { id: 'CREASE' as DieLineType, label: 'CREASE', color: LINE_COLORS.CREASE },
                    { id: 'PERFORATION' as DieLineType, label: 'PERF', color: LINE_COLORS.PERFORATION },
                    { id: 'PARTIAL_CUT' as DieLineType, label: 'PARTIAL', color: LINE_COLORS.PARTIAL_CUT },
                    { id: 'REVERSE_CREASE' as DieLineType, label: 'REV_CR', color: LINE_COLORS.REVERSE_CREASE },
                    { id: 'SCORE' as DieLineType, label: 'SCORE', color: LINE_COLORS.SCORE },
                    { id: 'ZIPPER' as DieLineType, label: 'ZIPPER', color: LINE_COLORS.ZIPPER },
                    { id: 'BLEED' as DieLineType, label: 'BLEED', color: LINE_COLORS.BLEED }
                  ]).map(lt => {
                    const isActive = selectedSegment 
                      ? selectedSegment.lineType === lt.id 
                      : newLineType === lt.id
                    return (
                      <button
                        key={lt.id}
                        onClick={() => {
                          console.log('Button clicked:', lt.id, 'selectedSegment:', selectedSegment, 'selectedSegmentId:', selectedSegmentId)
                          if (selectedSegmentId) {
                            changeSelectedSegmentType(lt.id)
                          } else {
                            setNewLineType(lt.id)
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-all whitespace-nowrap border-2 ${
                          isActive
                            ? 'scale-105'
                            : 'bg-slate-800 hover:bg-slate-700 opacity-60 hover:opacity-100 border-transparent'
                        }`}
                        style={{
                          backgroundColor: isActive ? `${lt.color}30` : undefined,
                          borderColor: isActive ? lt.color : 'transparent',
                          boxShadow: isActive ? `0 0 8px ${lt.color}50` : undefined
                        }}
                      >
                        <div className="w-4 h-1 rounded" style={{ backgroundColor: lt.color }} />
                        <span style={{ color: lt.color, fontWeight: isActive ? 'bold' : 'normal' }}>{lt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <div className="w-px h-6 bg-slate-700" />

            {/* Selected segment info */}
            {selectedSegment && editorMode !== 'ADD_LINE' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400">Vybrané:</span>
                <span className="text-slate-300">{selectedSegment.lineType}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-300">
                  {Math.sqrt((selectedSegment.end.x - selectedSegment.start.x) ** 2 + (selectedSegment.end.y - selectedSegment.start.y) ** 2).toFixed(1)} mm
                </span>
                <button
                  onClick={deleteSelectedSegment}
                  className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded"
                >
                  Zmazať
                </button>
              </div>
            )}

            {/* Measure info */}
            {editorMode === 'MEASURE' && measureStart && measureEnd && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-amber-400 font-medium">
                  {Math.sqrt((measureEnd.x - measureStart.x) ** 2 + (measureEnd.y - measureStart.y) ** 2).toFixed(2)} mm
                </span>
                <span className="text-slate-500">
                  (ΔX: {(measureEnd.x - measureStart.x).toFixed(1)}, ΔY: {(measureEnd.y - measureStart.y).toFixed(1)})
                </span>
              </div>
            )}

            {/* Info */}
            {activeDieLine && (
              <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                <span>{activeDieLine.width.toFixed(1)} × {activeDieLine.height.toFixed(1)} mm</span>
                <span>{activeDieLine.paths.reduce((a, p) => a + p.segments.length, 0)} seg</span>
              </div>
            )}
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          {/* 2D View */}
          {viewMode === '2D' && (
            <>
              <canvas
                ref={canvasRef}
                width={1400}
                height={900}
                className={`absolute inset-0 w-full h-full ${
                  editorMode === 'MEASURE' ? 'cursor-crosshair' : 
                  editorMode === 'MOVE' ? 'cursor-move' : 'cursor-default'
                }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              />

              {/* Empty state */}
              {!activeDieLine && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center">
                      <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-400 mb-2">No Structure Loaded</h3>
                    <p className="text-sm text-slate-600">Import a CAD file or generate from library</p>
                  </div>
                </div>
              )}


              {/* Legend */}
              {showLegend && activeDieLine && (
                <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-slate-900/90 border border-slate-700 backdrop-blur-sm">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Line Types</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(LINE_COLORS).slice(0, 8).map(([type, color]) => (
                      <div key={type} className="flex items-center gap-2">
                        <div className="w-4 h-0.5" style={{ backgroundColor: color }} />
                        <span className="text-xs text-slate-500">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 3D View */}
          {viewMode === '3D' && (
            <DieLineViewer3D dieLine={activeDieLine} foldAngle={foldAngle} />
          )}

          {/* View mode indicator */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 backdrop-blur-sm">
            <span className="text-xs font-medium text-slate-400">
              {viewMode === '2D' ? '2D Flat View' : '3D Folded View'}
            </span>
          </div>

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <svg className="w-8 h-8 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm text-slate-400">Loading structure...</span>
              </div>
            </div>
          )}

          {/* Quick tips - bottom right */}
          {!activeDieLine && viewMode === '2D' && (
            <div className="absolute bottom-4 right-4 max-w-xs">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-400 mb-1">Rýchly štart</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Prejdite do záložky <span className="text-emerald-400 font-medium">LIBRARY</span>, nastavte rozmery a kliknite na <span className="text-emerald-400 font-medium">Generate Structure</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Help button */}
          <button
            onClick={() => { setShowHelp(true); setHelpStep(0); }}
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            style={{ display: activeDieLine ? 'flex' : 'none' }}
            title="Zobraziť nápovedu (tutorial)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Command Palette button */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="absolute bottom-4 right-16 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
            style={{ display: activeDieLine ? 'flex' : 'none' }}
            title="Command Palette (Ctrl+K)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Keyboard shortcuts button */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="absolute bottom-4 right-28 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
            style={{ display: activeDieLine ? 'flex' : 'none' }}
            title="Klávesové skratky (?)"
          >
            <span className="text-sm font-bold">⌨</span>
          </button>
        </div>
      </main>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div 
            className="relative w-full max-w-lg mx-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden"
            style={{ animation: 'fadeInUp 0.3s ease-out' }}
          >
            {/* Progress bar */}
            <div className="h-1 bg-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${((helpStep + 1) / tutorialSteps.length) * 100}%` }}
              />
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">{tutorialSteps[helpStep].icon}</div>
                <h2 className="text-xl font-bold text-slate-100 mb-2">
                  {tutorialSteps[helpStep].title}
                </h2>
                <p className="text-slate-400 leading-relaxed">
                  {tutorialSteps[helpStep].description}
                </p>
              </div>

              {/* Step indicator */}
              <div className="flex justify-center gap-2 mb-6">
                {tutorialSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setHelpStep(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === helpStep 
                        ? 'w-6 bg-emerald-500' 
                        : index < helpStep 
                          ? 'bg-emerald-500/50' 
                          : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                {helpStep > 0 && (
                  <button
                    onClick={() => setHelpStep(helpStep - 1)}
                    className="flex-1 py-3 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
                  >
                    Späť
                  </button>
                )}
                {helpStep < tutorialSteps.length - 1 ? (
                  <button
                    onClick={() => setHelpStep(helpStep + 1)}
                    className="flex-1 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-400 hover:to-teal-500 transition-all"
                  >
                    Ďalej
                  </button>
                ) : (
                  <button
                    onClick={() => setShowHelp(false)}
                    className="flex-1 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-400 hover:to-teal-500 transition-all"
                  >
                    Začať pracovať
                  </button>
                )}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Skip link */}
            <div className="px-8 pb-4 text-center">
              <button
                onClick={() => setShowHelp(false)}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                Preskočiť návod
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowCommandPalette(false)}>
          <div 
            className="w-full max-w-xl mx-4 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={commandSearch}
                  onChange={e => setCommandSearch(e.target.value)}
                  placeholder="Hľadať príkaz... (napr. 'export', 'validate', 'shape')"
                  className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none"
                  autoFocus
                />
                <kbd className="px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded">ESC</kbd>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {[
                { icon: '📂', label: 'Import súbor', shortcut: 'Ctrl+O', action: () => fileInputRef.current?.click() },
                { icon: '💾', label: 'Export SVG', shortcut: 'Ctrl+S', action: () => handleExportSVG() },
                { icon: '📦', label: 'Export Production Pack', shortcut: 'Ctrl+Shift+E', action: () => handleExportProductionPack() },
                { icon: '✅', label: 'Validovať', shortcut: 'Ctrl+V', action: () => runValidation() },
                { icon: '🧹', label: 'Cleanup', shortcut: 'Ctrl+L', action: () => handleCleanup() },
                { icon: '⬜', label: 'Pridať obdĺžnik', shortcut: 'R', action: () => addShape('RECTANGLE') },
                { icon: '⬜', label: 'Pridať zaoblený obdĺžnik', shortcut: '', action: () => addShape('ROUNDED_RECT') },
                { icon: '⭕', label: 'Pridať elipsu', shortcut: 'E', action: () => addShape('ELLIPSE') },
                { icon: '⬡', label: 'Pridať polygon', shortcut: 'P', action: () => addShape('POLYGON', 6) },
                { icon: '📏', label: 'Generovať Bleed (3mm)', shortcut: '', action: () => generateBleedSafe('BLEED', 3) },
                { icon: '🛡️', label: 'Generovať Safe Area (2mm)', shortcut: '', action: () => generateBleedSafe('SAFE', 2) },
                { icon: '↩️', label: 'Undo', shortcut: 'Ctrl+Z', action: () => handleUndo() },
                { icon: '↪️', label: 'Redo', shortcut: 'Ctrl+Y', action: () => handleRedo() },
                { icon: '🔍', label: 'Fit to screen', shortcut: 'F', action: () => fitToScreen() },
                { icon: '⌨️', label: 'Klávesové skratky', shortcut: '?', action: () => { setShowCommandPalette(false); setShowShortcuts(true) } },
              ].filter(cmd => 
                commandSearch === '' || 
                cmd.label.toLowerCase().includes(commandSearch.toLowerCase())
              ).map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => { cmd.action(); setShowCommandPalette(false); setCommandSearch('') }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors text-left"
                >
                  <span className="text-xl">{cmd.icon}</span>
                  <span className="flex-1 text-slate-200">{cmd.label}</span>
                  {cmd.shortcut && <kbd className="px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded">{cmd.shortcut}</kbd>}
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-slate-800 text-xs text-slate-500 text-center">
              Tip: Stlačte <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Ctrl+K</kbd> kedykoľvek pre otvorenie
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div 
            className="w-full max-w-2xl mx-4 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">⌨️ Klávesové skratky</h2>
              <button onClick={() => setShowShortcuts(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6 max-h-96 overflow-y-auto">
              <div>
                <h3 className="text-sm font-semibold text-emerald-400 mb-3">Nástroje</h3>
                <div className="space-y-2">
                  {[
                    { key: 'V', desc: 'Výber' },
                    { key: 'M', desc: 'Presun' },
                    { key: 'R', desc: 'Meranie' },
                    { key: 'L', desc: 'Kresliť čiaru' },
                    { key: 'G', desc: 'Prepnúť mriežku' },
                    { key: 'D', desc: 'Prepnúť rozmery' },
                  ].map(s => (
                    <div key={s.key} className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">{s.desc}</span>
                      <kbd className="px-2 py-1 text-xs bg-slate-800 text-slate-300 rounded">{s.key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-400 mb-3">Editácia</h3>
                <div className="space-y-2">
                  {[
                    { key: 'Ctrl+Z', desc: 'Späť' },
                    { key: 'Ctrl+Y', desc: 'Znova' },
                    { key: 'Delete', desc: 'Zmazať vybrané' },
                    { key: 'Escape', desc: 'Zrušiť výber' },
                    { key: 'Ctrl+K', desc: 'Command palette' },
                  ].map(s => (
                    <div key={s.key} className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">{s.desc}</span>
                      <kbd className="px-2 py-1 text-xs bg-slate-800 text-slate-300 rounded">{s.key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-400 mb-3">Navigácia</h3>
                <div className="space-y-2">
                  {[
                    { key: 'Scroll', desc: 'Zoom' },
                    { key: 'Drag', desc: 'Posun plátna' },
                    { key: 'F', desc: 'Fit to screen' },
                  ].map(s => (
                    <div key={s.key} className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">{s.desc}</span>
                      <kbd className="px-2 py-1 text-xs bg-slate-800 text-slate-300 rounded">{s.key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-400 mb-3">Export</h3>
                <div className="space-y-2">
                  {[
                    { key: 'Ctrl+S', desc: 'Export SVG' },
                    { key: 'Ctrl+Shift+E', desc: 'Production Pack' },
                  ].map(s => (
                    <div key={s.key} className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">{s.desc}</span>
                      <kbd className="px-2 py-1 text-xs bg-slate-800 text-slate-300 rounded">{s.key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
