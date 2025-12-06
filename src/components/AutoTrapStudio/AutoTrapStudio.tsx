/**
 * GPCS CodeStudio - AutoTrap Studio
 * Profesionálna aplikácia pre automatický trapping
 * Kompatibilná s ESKO workflow
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import { AdvancedTrappingPanel } from './AdvancedTrappingPanel'
import { TrapLayerManager, type TrapLayerInfo, type TrapObject } from './TrapLayerManager'
import { ColorPairsPalette, type ColorPair } from './ColorPairsPalette'
import { TrapSelectTool } from './TrapSelectTool'
import { DensitometerTool } from './DensitometerTool'
import { RichBlackDialog, type RichBlackSettings } from './RichBlackDialog'
import { WhiteUnderprintDialog, type WhiteUnderprintSettings } from './WhiteUnderprintDialog'
import { TrapTagsPanel, type TrapTag } from './TrapTagsPanel'
import { TrapRulesPanel, type TrapEngineRule } from './TrapRulesPanel'
import type { ToolType } from './TrapToolbar'
import { useTrapping } from '../../trapping/hooks/useTrapping'
import type { TrapDirection } from '../../trapping/types/trappingTypes'
import { DEFAULT_TRAP_RULES } from '../../trapping/types/trappingTypes'

// Typ pre detekovanú farebnú hranicu
interface ColorEdge {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  color1: { r: number; g: number; b: number }
  color2: { r: number; g: number; b: number }
  direction: TrapDirection
  width: number
  contrast: number
}

// Typ pre vygenerovaný trap
interface GeneratedTrap {
  id: string
  path: string
  color: string
  direction: TrapDirection
  width: number
  opacity: number
}

interface AutoTrapStudioProps {
  onBack: () => void
}

export const AutoTrapStudio: React.FC<AutoTrapStudioProps> = ({ onBack }) => {
  const {
    settings,
    warnings,
    isProcessing,
    updateSettings,
    clearTraps,
    qcReport,
  } = useTrapping()

  // View mode (local state)
  const [viewMode, setViewMode] = useState<'NORMAL' | 'TRAP_OVERLAY' | 'TRAP_ONLY'>('TRAP_OVERLAY')

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Canvas state
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)

  // Trapping state
  const [generatedTraps, setGeneratedTraps] = useState<GeneratedTrap[]>([])
  const [colorEdges, setColorEdges] = useState<ColorEdge[]>([])
  const [trapProcessing, setTrapProcessing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [showQcModal, setShowQcModal] = useState(false)
  const [qcResults, setQcResults] = useState<string | null>(null)

  // New ESKO-compatible states
  const [, setActiveTool] = useState<ToolType>('SELECT')
  const [showColorEdges, setShowColorEdges] = useState(true)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [rightPanelTab, setRightPanelTab] = useState<'layers' | 'colors' | 'select' | 'density' | 'tags' | 'rules'>('layers')
  
  // Dialogs
  const [showRichBlackDialog, setShowRichBlackDialog] = useState(false)
  const [showWhiteUnderprintDialog, setShowWhiteUnderprintDialog] = useState(false)
  
  // Trap Layers
  const [trapLayers, setTrapLayers] = useState<TrapLayerInfo[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  
  // Výsledný obrázok s aplikovanými trapmi
  const [trappedImageUrl, setTrappedImageUrl] = useState<string | null>(null)
  const [showTrappedImage, setShowTrappedImage] = useState(false)
  
  // Registration Error Simulation
  const [misregistrationUrl, setMisregistrationUrl] = useState<string | null>(null)
  const [showMisregistration, setShowMisregistration] = useState(false)
  const [misregistrationOffset, setMisregistrationOffset] = useState({ x: 2, y: 1 })
  
  // Help/Onboarding
  const [showHelp, setShowHelp] = useState(false)
  
  // Color Pairs
  const [colorPairs, setColorPairs] = useState<ColorPair[]>([])
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null)
  
  // Trap Objects for selection
  const [trapObjects, setTrapObjects] = useState<TrapObject[]>([])
  const [selectedTraps, setSelectedTraps] = useState<TrapObject[]>([])
  
  // Densitometer
  const [densitometerActive, setDensitometerActive] = useState(false)
  const [densitometerReading, setDensitometerReading] = useState<{
    x: number; y: number;
    rgb: { r: number; g: number; b: number };
    cmyk: { c: number; m: number; y: number; k: number };
    lab: { l: number; a: number; b: number };
    density: number; luminance: number; hexColor: string;
  } | null>(null)
  const [densitometerHistory, setDensitometerHistory] = useState<typeof densitometerReading[]>([])
  
  // Rich Black & White Underprint settings
  const [richBlackSettings, setRichBlackSettings] = useState<RichBlackSettings>({
    enabled: false, addInk: 'CYAN', customInkName: '', density: 40,
    offset: 0.1, miterLimit: 4, cornerStyle: 'MITER', minDensityFilter: 2.5
  })
  const [whiteUnderprintSettings, setWhiteUnderprintSettings] = useState<WhiteUnderprintSettings>({
    enabled: false, inkName: 'OPAQUE_WHITE', customInkName: '', chokeDistance: 0.15,
    createSeparateLayer: true, layerName: 'White Underprint', applyTo: 'ALL',
    excludeWhite: true, excludeMetallic: false, density: 100
  })

  // Trap Tags (ESKO-style selective trapping)
  const [trapTags, setTrapTags] = useState<TrapTag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([])

  // Trap Rules Engine
  const [trapRules, setTrapRules] = useState<TrapEngineRule[]>(
    DEFAULT_TRAP_RULES.map(r => ({ ...r })) // Clone defaults
  )

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedFile(file)

    // Create preview URL
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }, [])

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return

    setUploadedFile(file)
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 5))
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.2))
  const handleZoomReset = () => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  // Výpočet optickej hustoty (ESKO štandard)
  const calculateOpticalDensity = (r: number, g: number, b: number): number => {
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b
    return luminance / 255
  }

  // Určenie smeru trapu podľa optickej hustoty
  const determineTrapDirection = (
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number }
  ): TrapDirection => {
    const density1 = calculateOpticalDensity(color1.r, color1.g, color1.b)
    const density2 = calculateOpticalDensity(color2.r, color2.g, color2.b)
    
    const diff = Math.abs(density1 - density2)
    
    if (diff < 0.1) return 'CENTERLINE'
    return density1 > density2 ? 'CHOKE' : 'SPREAD'
  }

  // Výpočet farby trapu (svetlejšia farba sa rozširuje)
  const calculateTrapColor = (
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number },
    direction: TrapDirection
  ): string => {
    if (direction === 'CENTERLINE') {
      // Blend oboch farieb
      const r = Math.round((color1.r + color2.r) / 2)
      const g = Math.round((color1.g + color2.g) / 2)
      const b = Math.round((color1.b + color2.b) / 2)
      return `rgb(${r}, ${g}, ${b})`
    }
    
    const density1 = calculateOpticalDensity(color1.r, color1.g, color1.b)
    const density2 = calculateOpticalDensity(color2.r, color2.g, color2.b)
    
    // Svetlejšia farba sa rozširuje pod tmavšiu
    const lighter = density1 > density2 ? color1 : color2
    return `rgb(${lighter.r}, ${lighter.g}, ${lighter.b})`
  }

  // Analýza obrázka a detekcia farebných hrán - asynchrónne spracovanie
  const analyzeImage = useCallback(async (): Promise<ColorEdge[]> => {
    if (!imageRef.current || !canvasRef.current) return []

    const img = imageRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return []

    // Škáluj obrázok pre rýchlejšiu analýzu
    const maxSize = 400
    const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight, 1)
    const width = Math.floor(img.naturalWidth * scale)
    const height = Math.floor(img.naturalHeight * scale)
    
    canvas.width = width
    canvas.height = height
    ctx.drawImage(img, 0, 0, width, height)

    const imageData = ctx.getImageData(0, 0, width, height)
    const pixels = imageData.data

    const edges: ColorEdge[] = []
    const edgeThreshold = 25 // Minimálny kontrast pre detekciu hrany
    const stepSize = Math.max(2, Math.floor(Math.min(width, height) / 100))
    const scaleBack = 1 / scale // Pre mapovanie späť na originálne súradnice

    // Spracuj po riadkoch s yieldom pre UI
    const processChunk = (startY: number, endY: number): ColorEdge[] => {
      const chunkEdges: ColorEdge[] = []
      
      for (let y = startY; y < endY && y < height - stepSize; y += stepSize) {
        for (let x = stepSize; x < width - stepSize; x += stepSize) {
          const idx = (y * width + x) * 4
          const r = pixels[idx]
          const g = pixels[idx + 1]
          const b = pixels[idx + 2]

          // Kontrola horizontálnej hrany
          const rightIdx = (y * width + (x + stepSize)) * 4
          const rRight = pixels[rightIdx]
          const gRight = pixels[rightIdx + 1]
          const bRight = pixels[rightIdx + 2]

          const hDiff = Math.abs(r - rRight) + Math.abs(g - gRight) + Math.abs(b - bRight)

          if (hDiff > edgeThreshold * 3) {
            const color1 = { r, g, b }
            const color2 = { r: rRight, g: gRight, b: bRight }
            const direction = determineTrapDirection(color1, color2)
            
            chunkEdges.push({
              id: `edge_h_${x}_${y}`,
              x1: Math.round(x * scaleBack),
              y1: Math.round(y * scaleBack),
              x2: Math.round(x * scaleBack),
              y2: Math.round((y + stepSize * 2) * scaleBack),
              color1,
              color2,
              direction,
              width: settings.defaultWidthMm * 3,
              contrast: hDiff / 3
            })
          }

          // Kontrola vertikálnej hrany
          const bottomIdx = ((y + stepSize) * width + x) * 4
          const rBottom = pixels[bottomIdx]
          const gBottom = pixels[bottomIdx + 1]
          const bBottom = pixels[bottomIdx + 2]

          const vDiff = Math.abs(r - rBottom) + Math.abs(g - gBottom) + Math.abs(b - bBottom)

          if (vDiff > edgeThreshold * 3) {
            const color1 = { r, g, b }
            const color2 = { r: rBottom, g: gBottom, b: bBottom }
            const direction = determineTrapDirection(color1, color2)
            
            chunkEdges.push({
              id: `edge_v_${x}_${y}`,
              x1: Math.round(x * scaleBack),
              y1: Math.round(y * scaleBack),
              x2: Math.round((x + stepSize * 2) * scaleBack),
              y2: Math.round(y * scaleBack),
              color1,
              color2,
              direction,
              width: settings.defaultWidthMm * 3,
              contrast: vDiff / 3
            })
          }
        }
      }
      return chunkEdges
    }

    // Spracuj po chunkoch asynchrónne
    const chunkSize = Math.max(10, Math.floor(height / 10))
    
    for (let startY = stepSize; startY < height - stepSize; startY += chunkSize) {
      const endY = Math.min(startY + chunkSize, height - stepSize)
      const chunkEdges = processChunk(startY, endY)
      edges.push(...chunkEdges)
      
      // Update progress a yield pre UI
      const progress = Math.floor((startY / height) * 80)
      setAnalysisProgress(progress)
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    return edges
  }, [settings.defaultWidthMm])

  // Generovanie trapov z detekovaných hrán
  const generateTrapsFromEdges = useCallback((edges: ColorEdge[]): GeneratedTrap[] => {
    const traps: GeneratedTrap[] = []
    const trapWidth = settings.defaultWidthMm * 3

    // Zoskupenie blízkych hrán
    const processedEdges = new Set<string>()

    for (const edge of edges) {
      if (processedEdges.has(edge.id)) continue
      processedEdges.add(edge.id)

      // Nájdi susedné hrany pre spojenie
      const connectedEdges = edges.filter(e => {
        if (processedEdges.has(e.id)) return false
        const dist = Math.sqrt(
          Math.pow(e.x1 - edge.x2, 2) + Math.pow(e.y1 - edge.y2, 2)
        )
        return dist < trapWidth * 2 && e.direction === edge.direction
      })

      // Vytvor path pre trap
      let pathD = `M ${edge.x1} ${edge.y1} L ${edge.x2} ${edge.y2}`
      
      for (const connected of connectedEdges) {
        processedEdges.add(connected.id)
        pathD += ` L ${connected.x2} ${connected.y2}`
      }

      const trapColor = calculateTrapColor(edge.color1, edge.color2, edge.direction)

      traps.push({
        id: `trap_${traps.length}`,
        path: pathD,
        color: trapColor,
        direction: edge.direction,
        width: trapWidth,
        opacity: edge.direction === 'CENTERLINE' ? 0.5 : 0.7
      })
    }

    return traps
  }, [settings.defaultWidthMm])

  // Hlavná funkcia pre generovanie trapov
  const handleGenerateTraps = useCallback(async () => {
    if (!uploadedFile || !imageRef.current) {
      alert('Najprv nahrajte obrázok')
      return
    }

    setTrapProcessing(true)
    setAnalysisProgress(0)
    setGeneratedTraps([])

    try {
      // Krok 1: Analýza obrázka
      await new Promise(resolve => setTimeout(resolve, 100)) // Allow UI update
      const edges = await analyzeImage()
      setColorEdges(edges)

      // Krok 2: Generovanie trapov
      setAnalysisProgress(80)
      const traps = generateTrapsFromEdges(edges)
      
      setAnalysisProgress(100)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      setGeneratedTraps(traps)
      setViewMode('TRAP_OVERLAY')

      // Krok 3: Vytvorenie Trap Layer ak neexistuje
      const layerType = settings.mode === 'REVERSE' ? 'REVERSE' : 'AUTOMATIC'
      const existingLayer = trapLayers.find(l => l.type === layerType)
      
      if (!existingLayer) {
        const newLayer: TrapLayerInfo = {
          id: `layer_${Date.now()}`,
          name: `${layerType === 'AUTOMATIC' ? 'Automatic' : 'Reverse'} Trap Layer`,
          type: layerType,
          visible: true,
          locked: false,
          trapCount: traps.length,
          createdAt: new Date(),
          modifiedAt: new Date()
        }
        setTrapLayers([newLayer])
        setSelectedLayerId(newLayer.id)
      } else {
        // Update existujúcej vrstvy
        setTrapLayers(layers => layers.map(l => 
          l.id === existingLayer.id 
            ? { ...l, trapCount: traps.length, modifiedAt: new Date() }
            : l
        ))
      }

      // Krok 4: Vytvorenie Color Pairs z detekovaných hrán
      const pairsMap = new Map<string, ColorPair>()
      edges.forEach(edge => {
        const key = `${edge.color1.r}_${edge.color1.g}_${edge.color1.b}_${edge.color2.r}_${edge.color2.g}_${edge.color2.b}`
        const existing = pairsMap.get(key)
        if (existing) {
          existing.occurrences++
        } else {
          const density1 = (edge.color1.r * 0.299 + edge.color1.g * 0.587 + edge.color1.b * 0.114) / 255
          const density2 = (edge.color2.r * 0.299 + edge.color2.g * 0.587 + edge.color2.b * 0.114) / 255
          pairsMap.set(key, {
            id: `pair_${pairsMap.size}`,
            fromColor: {
              name: `RGB(${edge.color1.r}, ${edge.color1.g}, ${edge.color1.b})`,
              rgb: edge.color1,
              type: 'PROCESS',
              density: 1 - density1
            },
            toColor: {
              name: `RGB(${edge.color2.r}, ${edge.color2.g}, ${edge.color2.b})`,
              rgb: edge.color2,
              type: 'PROCESS',
              density: 1 - density2
            },
            trapDirection: edge.direction === 'SPREAD' ? 'FROM_TO' : edge.direction === 'CHOKE' ? 'TO_FROM' : 'BOTH',
            trapDistance: settings.defaultWidthMm,
            occurrences: 1,
            isCustom: false
          })
        }
      })
      setColorPairs(Array.from(pairsMap.values()).slice(0, 50)) // Limit na 50 párov

      // Krok 5: Vytvorenie Trap Objects pre výber
      const newTrapObjects: TrapObject[] = traps.map((trap, index) => {
        // Konvertuj TrapDirection na TrapObject direction
        let objDirection: 'SPREAD' | 'CHOKE' | 'CENTERLINE' = 'SPREAD'
        if (trap.direction === 'CHOKE') objDirection = 'CHOKE'
        else if (trap.direction === 'CENTERLINE') objDirection = 'CENTERLINE'
        
        return {
          id: trap.id,
          layerId: trapLayers[0]?.id || 'default',
          path: trap.path,
          color: trap.color,
          width: trap.width,
          direction: objDirection,
          fromColor: edges[index]?.color1 || { r: 0, g: 0, b: 0 },
          toColor: edges[index]?.color2 || { r: 255, g: 255, b: 255 },
          selected: false,
          tagged: false,
          x: edges[index]?.x1 || 0,
          y: edges[index]?.y1 || 0
        }
      })
      setTrapObjects(newTrapObjects)
      setSelectedTraps([])

      // Krok 6: Výsledný obrázok sa vytvorí pri exporte
      // (applyTrapsToImage je príliš pomalé pre real-time)
      setAnalysisProgress(100)

    } catch (error) {
      console.error('Trap generation failed:', error)
      alert('Chyba pri generovaní trapov')
    } finally {
      setTrapProcessing(false)
      setAnalysisProgress(0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFile, analyzeImage, generateTrapsFromEdges, setViewMode, settings.mode, settings.defaultWidthMm, trapLayers])

  // RÝCHLE APLIKOVANIE TRAPOV - kreslenie cez Canvas API (nie pixel po pixeli)
  const applyTrapsToImage = useCallback(async (_edges: ColorEdge[]): Promise<string | null> => {
    if (!imageRef.current || !canvasRef.current) return null

    const img = imageRef.current
    const canvas = canvasRef.current
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Nakresli originálny obrázok
    ctx.drawImage(img, 0, 0)

    // Trap width v pixeloch
    const trapWidthPx = Math.max(1, Math.round(settings.defaultWidthMm * 11.81))
    
    console.log(`Aplikujem ${generatedTraps.length} trapov, šírka ${trapWidthPx}px`)

    // Nakresli trapy priamo cez Canvas API (rýchle!)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 0.85
    ctx.lineWidth = trapWidthPx

    for (const trap of generatedTraps) {
      ctx.strokeStyle = trap.color
      ctx.beginPath()
      
      // Parse SVG path
      const pathParts = trap.path.split(/[ML]/).filter(Boolean)
      let first = true
      for (const part of pathParts) {
        const coords = part.trim().split(' ').map(Number)
        if (coords.length >= 2) {
          if (first) {
            ctx.moveTo(coords[0], coords[1])
            first = false
          } else {
            ctx.lineTo(coords[0], coords[1])
          }
        }
      }
      ctx.stroke()
    }

    ctx.globalAlpha = 1.0
    console.log(`Trapy aplikované: ${generatedTraps.length}`)

    // Vytvor URL pre výsledný obrázok
    return canvas.toDataURL('image/png')
  }, [settings.defaultWidthMm, generatedTraps])

  // REGISTRATION ERROR SIMULATION - simulácia nepresného súladu farieb
  const simulateMisregistration = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) {
      alert('Najprv nahrajte obrázok')
      return
    }

    const img = imageRef.current
    const canvas = canvasRef.current
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Získaj pixel data z originálneho obrázka
    ctx.drawImage(img, 0, 0)
    const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const original = originalData.data
    
    // Vytvor nový image data pre výsledok
    const resultData = ctx.createImageData(canvas.width, canvas.height)
    const result = resultData.data
    
    const width = canvas.width
    const height = canvas.height
    const offsetX = misregistrationOffset.x
    const offsetY = misregistrationOffset.y

    // Simuluj CMYK separáciu s posunom
    // Cyan (C) - posun doprava/dole
    // Magenta (M) - bez posunu (referencia)
    // Yellow (Y) - posun doľava/hore
    // Black (K) - malý posun
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        
        // Originálne RGB
        const r = original[idx]
        const g = original[idx + 1]
        const b = original[idx + 2]
        const a = original[idx + 3]
        
        // Konverzia RGB na CMYK
        const k = 1 - Math.max(r, g, b) / 255
        const m = k < 1 ? (1 - g / 255 - k) / (1 - k) : 0
        
        // Získaj posunuté hodnoty pre jednotlivé kanály
        // Cyan - posunutý
        const cX = Math.min(width - 1, Math.max(0, x + offsetX))
        const cY = Math.min(height - 1, Math.max(0, y + offsetY))
        const cIdx = (cY * width + cX) * 4
        const cR = original[cIdx]
        const cK = 1 - Math.max(cR, original[cIdx + 1], original[cIdx + 2]) / 255
        const cC = cK < 1 ? (1 - cR / 255 - cK) / (1 - cK) : 0
        
        // Yellow - opačný posun
        const yX = Math.min(width - 1, Math.max(0, x - offsetX))
        const yY = Math.min(height - 1, Math.max(0, y - offsetY))
        const yIdx = (yY * width + yX) * 4
        const yB = original[yIdx + 2]
        const yK = 1 - Math.max(original[yIdx], original[yIdx + 1], yB) / 255
        const yY2 = yK < 1 ? (1 - yB / 255 - yK) / (1 - yK) : 0
        
        // Kombinuj posunuté CMYK späť na RGB
        const finalC = cC
        const finalM = m
        const finalY = yY2
        const finalK = k
        
        const finalR = 255 * (1 - finalC) * (1 - finalK)
        const finalG = 255 * (1 - finalM) * (1 - finalK)
        const finalB = 255 * (1 - finalY) * (1 - finalK)
        
        result[idx] = Math.round(finalR)
        result[idx + 1] = Math.round(finalG)
        result[idx + 2] = Math.round(finalB)
        result[idx + 3] = a
      }
    }
    
    ctx.putImageData(resultData, 0, 0)
    
    // Ulož výsledok
    const url = canvas.toDataURL('image/png')
    setMisregistrationUrl(url)
    setShowMisregistration(true)
    
    console.log(`Misregistration simulácia: offset ${offsetX}px, ${offsetY}px`)
  }, [misregistrationOffset])

  // QC Check
  const handleQCCheck = useCallback(() => {
    const issues: string[] = []
    
    // Analýza trapov
    const spreadCount = generatedTraps.filter(t => t.direction === 'SPREAD').length
    const chokeCount = generatedTraps.filter(t => t.direction === 'CHOKE').length
    const centerlineCount = generatedTraps.filter(t => t.direction === 'CENTERLINE').length
    
    let report = `╔══════════════════════════════════════════════════════════════╗
║                    GPCS AutoTrap QC Report                    ║
╠══════════════════════════════════════════════════════════════╣
║  Súbor: ${uploadedFile?.name?.padEnd(52) || 'N/A'.padEnd(52)}║
║  Dátum: ${new Date().toLocaleString('sk-SK').padEnd(52)}║
╠══════════════════════════════════════════════════════════════╣
║  ŠTATISTIKY TRAPOV                                           ║
╠══════════════════════════════════════════════════════════════╣
║  Celkový počet trapov: ${String(generatedTraps.length).padEnd(37)}║
║  ├─ SPREAD (svetlá → tmavá): ${String(spreadCount).padEnd(31)}║
║  ├─ CHOKE (tmavá → svetlá): ${String(chokeCount).padEnd(32)}║
║  └─ CENTERLINE: ${String(centerlineCount).padEnd(44)}║
║                                                              ║
║  Detekované farebné hrany: ${String(colorEdges.length).padEnd(33)}║
║  Priemerný kontrast: ${String(Math.round(colorEdges.reduce((a, e) => a + e.contrast, 0) / (colorEdges.length || 1))).padEnd(39)}║
╠══════════════════════════════════════════════════════════════╣
║  NASTAVENIA                                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Technológia: ${settings.technology.padEnd(45)}║
║  Šírka trapu: ${(settings.defaultWidthMm + ' mm').padEnd(45)}║
║  Min. kontrast: ${String(15).padEnd(43)}║
╠══════════════════════════════════════════════════════════════╣
║  KONTROLY                                                    ║
╠══════════════════════════════════════════════════════════════╣\n`

    // QC kontroly
    if (generatedTraps.length === 0) {
      issues.push('⚠️  Žiadne trapy neboli vygenerované')
    } else {
      issues.push('✓  Trapy boli úspešne vygenerované')
    }

    if (colorEdges.length < 10 && uploadedFile) {
      issues.push('⚠️  Nízky počet detekovaných hrán - skontrolujte kontrast')
    } else if (colorEdges.length > 0) {
      issues.push('✓  Farebné hrany boli správne detekované')
    }

    if (settings.defaultWidthMm < 0.05) {
      issues.push('⚠️  Šírka trapu je príliš malá pre flexo tlač')
    } else {
      issues.push('✓  Šírka trapu je v odporúčanom rozsahu')
    }

    if (spreadCount > 0 && chokeCount > 0) {
      issues.push('✓  Správna kombinácia SPREAD a CHOKE trapov')
    }

    for (const issue of issues) {
      report += `║  ${issue.padEnd(60)}║\n`
    }

    report += `╠══════════════════════════════════════════════════════════════╣
║  ODPORÚČANIA                                                 ║
╠══════════════════════════════════════════════════════════════╣
║  • Pre flexo tlač použite šírku 0.1-0.15 mm                  ║
║  • Pre digitálnu tlač stačí 0.05-0.08 mm                     ║
║  • Skontrolujte oblasti s vysokým kontrastom                 ║
╚══════════════════════════════════════════════════════════════╝`

    setQcResults(report)
    setShowQcModal(true)
  }, [generatedTraps, colorEdges, uploadedFile, settings])

  // Clear all
  const handleClearAll = useCallback(() => {
    clearTraps()
    setGeneratedTraps([])
    setColorEdges([])
    setViewMode('NORMAL')
    setTrapLayers([])
    setColorPairs([])
    setTrapObjects([])
    setSelectedTraps([])
  }, [clearTraps, setViewMode])

  // Densitometer - meranie farby na pozícii
  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!densitometerActive || !imageRef.current || !canvasRef.current) return

    const rect = e.currentTarget.getBoundingClientRect()
    const img = imageRef.current
    
    // Vypočítaj pozíciu na obrázku
    const scaleX = img.naturalWidth / rect.width
    const scaleY = img.naturalHeight / rect.height
    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = Math.floor((e.clientY - rect.top) * scaleY)

    // Načítaj pixel z canvasu
    const canvas = canvasRef.current
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(img, 0, 0)
    const pixel = ctx.getImageData(x, y, 1, 1).data
    const r = pixel[0], g = pixel[1], b = pixel[2]

    // Výpočet hodnôt
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255 * 100
    const density = -Math.log10(Math.max(0.01, luminance / 100))
    
    // RGB to CMYK aproximácia
    const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255
    const k = 1 - Math.max(rNorm, gNorm, bNorm)
    const c = k < 1 ? (1 - rNorm - k) / (1 - k) * 100 : 0
    const m = k < 1 ? (1 - gNorm - k) / (1 - k) * 100 : 0
    const yVal = k < 1 ? (1 - bNorm - k) / (1 - k) * 100 : 0

    // RGB to LAB aproximácia
    const labL = luminance
    const labA = (r - g) / 2.55
    const labB = (g - b) / 2.55

    const reading = {
      x, y,
      rgb: { r, g, b },
      cmyk: { c, m, y: yVal, k: k * 100 },
      lab: { l: labL, a: labA, b: labB },
      density,
      luminance,
      hexColor: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    }

    setDensitometerReading(reading)
    setDensitometerHistory(prev => [...prev.slice(-9), reading])
  }, [densitometerActive])

  // Výber objektov pre tagging
  const handleTrapClick = useCallback((trapId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const trap = trapObjects.find(t => t.id === trapId)
    if (!trap) return

    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      // Multi-select
      setSelectedObjectIds(prev => {
        const newIds = prev.includes(trapId) 
          ? prev.filter(id => id !== trapId)
          : [...prev, trapId]
        // Synchronizuj selectedTraps
        setSelectedTraps(trapObjects.filter(t => newIds.includes(t.id)))
        return newIds
      })
    } else {
      // Single select
      setSelectedObjectIds([trapId])
      setSelectedTraps([trap])
    }
  }, [trapObjects])

  // Vytvoriť nový tag pre vybrané objekty
  const handleCreateTagForSelection = useCallback((objectIds: string[]) => {
    if (objectIds.length === 0) return
    
    const newTag: TrapTag = {
      id: `tag_${Date.now()}`,
      objectId: objectIds[0],
      objectName: `Selection (${objectIds.length} objects)`,
      trappingMode: 'AUTO',
      trappingDirection: 'AUTO',
      reverseMode: 'AUTO',
      reverseDirection: 'AUTO',
      createdAt: new Date()
    }
    
    setTrapTags(prev => [...prev, newTag])
    
    // Priraď tag k objektom
    setTrapObjects(prev => prev.map(obj => {
      if (objectIds.includes(obj.id)) {
        const currentTags = obj.tagIds || []
        return { ...obj, tagIds: [...currentTags, newTag.id], tagged: true }
      }
      return obj
    }))
    
    console.log(`Vytvorený nový tag pre ${objectIds.length} objektov`)
  }, [])

  // Nahrať nový obrázok
  const handleNewImage = useCallback(() => {
    setUploadedFile(null)
    setPreviewUrl(null)
    setGeneratedTraps([])
    setColorEdges([])
    setImageSize({ width: 0, height: 0 })
    clearTraps()
    setViewMode('NORMAL')
  }, [clearTraps, setViewMode])

  // Export PNG s trapmi
  const handleExportPNG = useCallback(async () => {
    if (generatedTraps.length === 0 || !uploadedFile || !imageRef.current) {
      alert('Najprv vygenerujte trapy')
      return
    }

    try {
      setTrapProcessing(true)
      setAnalysisProgress(50)
      
      const trappedUrl = await applyTrapsToImage(colorEdges)
      
      setAnalysisProgress(90)
      
      if (trappedUrl) {
        const a = document.createElement('a')
        a.href = trappedUrl
        a.download = `${uploadedFile.name.replace(/\.[^.]+$/, '')}_trapped.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        setTrappedImageUrl(trappedUrl)
        setShowTrappedImage(true)
      } else {
        alert('❌ Chyba pri vytváraní výsledného obrázka')
      }

    } catch (error) {
      console.error('Export PNG failed:', error)
      alert('Chyba pri exporte PNG')
    } finally {
      setTrapProcessing(false)
      setAnalysisProgress(0)
    }
  }, [generatedTraps, uploadedFile, colorEdges, applyTrapsToImage])

  // Export PDF s trapmi
  const handleExportPDF = useCallback(async () => {
    if (generatedTraps.length === 0 || !uploadedFile || !imageRef.current) {
      alert('Najprv vygenerujte trapy')
      return
    }

    try {
      setTrapProcessing(true)
      setAnalysisProgress(30)
      
      // Najprv vytvor trapped image
      const trappedUrl = await applyTrapsToImage(colorEdges)
      
      setAnalysisProgress(60)
      
      if (!trappedUrl) {
        alert('❌ Chyba pri vytváraní obrázka')
        return
      }

      // Vytvor PDF
      const img = imageRef.current
      const imgWidth = img.naturalWidth
      const imgHeight = img.naturalHeight
      
      // Orientácia podľa rozmerov
      const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait'
      
      // Vytvor PDF s rozmermi v mm (72 DPI = 25.4mm per inch)
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: [imgWidth * 0.2646, imgHeight * 0.2646] // px to mm at 96 DPI
      })
      
      setAnalysisProgress(80)
      
      // Pridaj obrázok do PDF
      pdf.addImage(trappedUrl, 'PNG', 0, 0, imgWidth * 0.2646, imgHeight * 0.2646)
      
      setAnalysisProgress(95)
      
      // Stiahni PDF
      const fileName = `${uploadedFile.name.replace(/\.[^.]+$/, '')}_trapped.pdf`
      pdf.save(fileName)
      
      // Ulož pre zobrazenie
      setTrappedImageUrl(trappedUrl)
      setShowTrappedImage(true)

    } catch (error) {
      console.error('Export PDF failed:', error)
      alert('Chyba pri exporte PDF')
    } finally {
      setTrapProcessing(false)
      setAnalysisProgress(0)
    }
  }, [generatedTraps, uploadedFile, colorEdges, applyTrapsToImage])

  // Load image dimensions - aj pre už načítané obrázky
  useEffect(() => {
    if (previewUrl && imageRef.current) {
      const img = imageRef.current
      
      const updateSize = () => {
        if (img.naturalWidth > 0) {
          setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
        }
      }
      
      // Ak je už načítaný
      if (img.complete && img.naturalWidth > 0) {
        updateSize()
      }
      
      // Pre nové načítanie
      img.onload = updateSize
    }
  }, [previewUrl])

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Hidden canvas for image analysis */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Hidden image for loading */}
      {previewUrl && (
        <img 
          ref={imageRef} 
          src={previewUrl} 
          alt="" 
          className="hidden"
          crossOrigin="anonymous"
        />
      )}

      {/* Left Sidebar - Advanced Trapping Panel */}
      <div className="w-72 flex-shrink-0 border-r border-slate-800 overflow-y-auto">
        <AdvancedTrappingPanel
          settings={settings}
          onSettingsChange={updateSettings}
          onGenerateTraps={handleGenerateTraps}
          onClearTraps={handleClearAll}
          isProcessing={isProcessing || trapProcessing}
          trapCount={generatedTraps.length}
          colorEdgesCount={colorEdges.length}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar - Compact */}
        <div className="h-10 border-b border-slate-800 flex items-center justify-between px-3 flex-shrink-0">
          {/* Left - Back and title */}
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Späť"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-sm font-semibold">
              <span className="text-pink-400">AutoTrap</span>
            </h1>
            {uploadedFile && (
              <span className="text-xs text-slate-500 truncate max-w-[120px]" title={uploadedFile.name}>
                {uploadedFile.name}
              </span>
            )}
          </div>

          {/* Center - Main actions */}
          <div className="flex items-center gap-1">
            {/* Zoom */}
            <div className="flex items-center bg-slate-800 rounded px-1">
              <button onClick={handleZoomOut} className="p-1 hover:bg-slate-700 rounded text-xs">−</button>
              <button onClick={handleZoomReset} className="text-xs w-10 text-center hover:bg-slate-700 rounded">{Math.round(zoom * 100)}%</button>
              <button onClick={handleZoomIn} className="p-1 hover:bg-slate-700 rounded text-xs">+</button>
            </div>
            
            {/* Reg Error */}
            <div className="flex items-center gap-1 bg-slate-800/50 rounded px-1.5 py-0.5">
              <button
                onClick={simulateMisregistration}
                disabled={!uploadedFile}
                className="px-1.5 py-0.5 text-xs bg-red-900/50 hover:bg-red-800/50 border border-red-500/30 disabled:opacity-50 rounded"
                title="Registration Error Simulation"
              >
                ⚠️ Reg
              </button>
              <input
                type="range" min="0" max="10"
                value={misregistrationOffset.x}
                onChange={(e) => setMisregistrationOffset(prev => ({ ...prev, x: Number(e.target.value) }))}
                className="w-12 h-1 accent-red-500"
                title={`X: ${misregistrationOffset.x}px`}
              />
              <input
                type="range" min="0" max="10"
                value={misregistrationOffset.y}
                onChange={(e) => setMisregistrationOffset(prev => ({ ...prev, y: Number(e.target.value) }))}
                className="w-12 h-1 accent-red-500"
                title={`Y: ${misregistrationOffset.y}px`}
              />
              {showMisregistration && (
                <button
                  onClick={() => setShowMisregistration(false)}
                  className="px-1 text-xs text-green-400 hover:text-green-300"
                >
                  ✓
                </button>
              )}
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-1">
            {uploadedFile && (
              <button
                onClick={handleNewImage}
                className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded"
              >
                📁
              </button>
            )}
            <button
              onClick={handleQCCheck}
              disabled={generatedTraps.length === 0}
              className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded"
              title="QC Check"
            >
              🔍
            </button>
            <button
              onClick={handleExportPNG}
              disabled={generatedTraps.length === 0}
              className="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded"
              title="Export PNG"
            >
              🖼️ PNG
            </button>
            <button
              onClick={handleExportPDF}
              disabled={generatedTraps.length === 0}
              className="px-2 py-1 text-xs bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 disabled:opacity-50 rounded"
              title="Export PDF"
            >
              📄 PDF
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div 
          className="flex-1 relative overflow-hidden bg-slate-900"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {!uploadedFile ? (
            // Upload prompt
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center cursor-pointer hover:border-pink-500/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mb-4 text-6xl">📁</div>
                <h3 className="text-xl font-semibold text-slate-300 mb-2">
                  Nahrajte súbor na spracovanie
                </h3>
                <p className="text-slate-500 mb-4">
                  Podporované formáty: PNG, JPG, TIFF, SVG
                </p>
                <p className="text-sm text-slate-600">
                  Pretiahnite súbor sem alebo kliknite pre výber
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.tiff,.tif,.svg,.bmp,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            // Preview area
            <div 
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: 'center center',
                cursor: densitometerActive ? 'crosshair' : 'default'
              }}
            >
              {previewUrl && (
                <div 
                  className="relative bg-white shadow-2xl"
                  onClick={handleImageClick}
                >
                  {/* MISREGISTRATION SIMULÁCIA - zobraz ak je zapnutá */}
                  {showMisregistration && misregistrationUrl && (
                    <>
                      <img 
                        src={misregistrationUrl} 
                        alt="Misregistration Simulation" 
                        className="max-w-[800px] max-h-[600px] object-contain"
                      />
                      <div className="absolute top-2 left-2 bg-red-900/90 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                        ⚠️ Registration Error Simulation (offset: {misregistrationOffset.x}px, {misregistrationOffset.y}px)
                      </div>
                    </>
                  )}
                  
                  {/* VÝSLEDNÝ OBRÁZOK S TRAPMI - zobraz ak existuje a je zapnutý */}
                  {!showMisregistration && showTrappedImage && trappedImageUrl && (
                    <img 
                      src={trappedImageUrl} 
                      alt="Trapped Image" 
                      className="max-w-[800px] max-h-[600px] object-contain"
                    />
                  )}
                  
                  {/* Original image - zobraz ak nie je trapped alebo v TRAP_ONLY móde */}
                  {!showMisregistration && !showTrappedImage && viewMode !== 'TRAP_ONLY' && (
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-w-[800px] max-h-[600px] object-contain"
                    />
                  )}
                  
                  {/* Placeholder pre TRAP_ONLY mód bez trapped image */}
                  {!showTrappedImage && viewMode === 'TRAP_ONLY' && (
                    <div 
                      className="max-w-[800px] max-h-[600px] bg-slate-800"
                      style={{ width: imageSize.width || 800, height: imageSize.height || 600 }}
                    />
                  )}
                  
                  {/* Color Edges overlay - zobraz keď je zapnuté a nie v NORMAL móde */}
                  {viewMode !== 'NORMAL' && showColorEdges && colorEdges.length > 0 && (
                    <svg 
                      className="absolute inset-0 pointer-events-none"
                      viewBox={`0 0 ${imageSize.width || 800} ${imageSize.height || 600}`}
                      preserveAspectRatio="xMidYMid meet"
                      style={{ width: '100%', height: '100%' }}
                    >
                      {colorEdges.map(edge => (
                        <line
                          key={edge.id}
                          x1={edge.x1}
                          y1={edge.y1}
                          x2={edge.x2}
                          y2={edge.y2}
                          stroke={edge.direction === 'SPREAD' ? '#00ff00' : edge.direction === 'CHOKE' ? '#ff0000' : '#ffff00'}
                          strokeWidth={2}
                          opacity={0.6}
                        />
                      ))}
                    </svg>
                  )}

                  {/* Generated Trap overlay - zobraz v TRAP_OVERLAY a TRAP_ONLY módoch */}
                  {viewMode !== 'NORMAL' && generatedTraps.length > 0 && (
                    <svg 
                      className="absolute inset-0"
                      viewBox={`0 0 ${imageSize.width || 800} ${imageSize.height || 600}`}
                      preserveAspectRatio="xMidYMid meet"
                      style={{ width: '100%', height: '100%' }}
                    >
                      {generatedTraps.map(trap => (
                        <path
                          key={trap.id}
                          d={trap.path}
                          stroke={selectedObjectIds.includes(trap.id) ? '#ff00ff' : trap.color}
                          strokeWidth={selectedObjectIds.includes(trap.id) ? trap.width * 1.5 : trap.width}
                          fill="none"
                          opacity={selectedObjectIds.includes(trap.id) ? 1 : 0.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => handleTrapClick(trap.id, e)}
                        />
                      ))}
                    </svg>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Processing overlay */}
          {(isProcessing || trapProcessing) && (
            <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
              <div className="text-center">
                <div className="mb-4">
                  <svg className="w-16 h-16 animate-spin mx-auto text-pink-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <p className="text-xl text-slate-300 mb-2">Analyzujem obrázok...</p>
                <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden mx-auto">
                  <div 
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {analysisProgress < 80 ? 'Detekcia farebných hrán...' : 'Generovanie trapov...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Status Bar - Compact */}
        <div className="h-7 border-t border-slate-800 flex items-center justify-between px-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800 rounded">
              {(['NORMAL', 'TRAP_OVERLAY', 'TRAP_ONLY'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-1.5 py-0.5 text-xs transition-colors ${
                    viewMode === mode ? 'bg-pink-600 text-white rounded' : 'text-slate-500 hover:text-white'
                  }`}
                  title={mode}
                >
                  {mode === 'NORMAL' ? '📷' : mode === 'TRAP_OVERLAY' ? '🔀' : '🎯'}
                </button>
              ))}
            </div>
            
            <span className="text-slate-600">{settings.technology} | {settings.defaultWidthMm}mm</span>
            
            {colorEdges.length > 0 && <span className="text-cyan-400">{colorEdges.length} hrán</span>}
            {generatedTraps.length > 0 && <span className="text-pink-400">{generatedTraps.length} trapov</span>}
            
            {trappedImageUrl && (
              <button
                onClick={() => setShowTrappedImage(!showTrappedImage)}
                className={`px-2 py-0.5 rounded text-xs ${showTrappedImage ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                {showTrappedImage ? '✅' : '📷'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            {trapTags.length > 0 && <span className="text-purple-400">{trapTags.length}🏷️</span>}
            {warnings.length > 0 && <span className="text-yellow-500">{warnings.length}⚠️</span>}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Tools Panel */}
      {showRightPanel && (
        <div className="w-64 flex-shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col overflow-hidden">
          {/* Tabs - Compact */}
          <div className="grid grid-cols-6 border-b border-slate-800 flex-shrink-0">
            {[
              { id: 'layers', icon: '📑' },
              { id: 'colors', icon: '🎨' },
              { id: 'tags', icon: '🏷️' },
              { id: 'rules', icon: '⚙️' },
              { id: 'select', icon: '🎯' },
              { id: 'density', icon: '🔬' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRightPanelTab(tab.id as typeof rightPanelTab)}
                className={`py-1.5 text-sm transition-colors ${
                  rightPanelTab === tab.id
                    ? 'bg-slate-800 text-pink-400 border-b-2 border-pink-500'
                    : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
                }`}
                title={tab.id}
              >
                {tab.icon}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-2">
            {rightPanelTab === 'layers' && (
              <TrapLayerManager
                layers={trapLayers}
                selectedLayerId={selectedLayerId}
                onLayerSelect={setSelectedLayerId}
                onLayerVisibilityToggle={(id) => {
                  setTrapLayers(layers => layers.map(l => 
                    l.id === id ? { ...l, visible: !l.visible } : l
                  ))
                }}
                onLayerLockToggle={(id) => {
                  setTrapLayers(layers => layers.map(l => 
                    l.id === id ? { ...l, locked: !l.locked } : l
                  ))
                }}
                onLayerDelete={(id) => {
                  setTrapLayers(layers => layers.filter(l => l.id !== id))
                }}
                onLayerRename={(id, name) => {
                  setTrapLayers(layers => layers.map(l => 
                    l.id === id ? { ...l, name } : l
                  ))
                }}
                onCreateLayer={(type) => {
                  const newLayer: TrapLayerInfo = {
                    id: `layer_${Date.now()}`,
                    name: `Trap Layer ${trapLayers.length + 1}`,
                    type,
                    visible: true,
                    locked: false,
                    trapCount: generatedTraps.length,
                    createdAt: new Date(),
                    modifiedAt: new Date()
                  }
                  setTrapLayers([...trapLayers, newLayer])
                  setSelectedLayerId(newLayer.id)
                }}
                onUpdateLayer={() => handleGenerateTraps()}
                hasAutomaticLayer={trapLayers.some(l => l.type === 'AUTOMATIC')}
                hasReverseLayer={trapLayers.some(l => l.type === 'REVERSE')}
              />
            )}

            {rightPanelTab === 'colors' && (
              <ColorPairsPalette
                colorPairs={colorPairs}
                selectedPairId={selectedPairId}
                onPairSelect={setSelectedPairId}
                onPairEdit={(id, updates) => {
                  setColorPairs(pairs => pairs.map(p => 
                    p.id === id ? { ...p, ...updates } : p
                  ))
                }}
                onSaveColorPairs={() => {
                  localStorage.setItem('trapColorPairs', JSON.stringify(colorPairs))
                  alert('Color Pairs uložené!')
                }}
                onLoadColorPairs={() => {
                  const saved = localStorage.getItem('trapColorPairs')
                  if (saved) {
                    setColorPairs(JSON.parse(saved))
                    alert('Color Pairs načítané!')
                  }
                }}
                showColorEdges={showColorEdges}
                onToggleColorEdges={() => setShowColorEdges(!showColorEdges)}
              />
            )}

            {rightPanelTab === 'select' && (
              <TrapSelectTool
                selectedTraps={selectedTraps}
                onInvertDirection={(ids) => {
                  setTrapObjects(objects => objects.map(o => 
                    ids.includes(o.id) ? { ...o, direction: o.direction === 'SPREAD' ? 'CHOKE' : 'SPREAD' } : o
                  ))
                }}
                onAdjustDistance={(ids, distance) => {
                  console.log('Adjust distance', ids, distance)
                }}
                onDeleteTraps={(ids) => {
                  setTrapObjects(objects => objects.filter(o => !ids.includes(o.id)))
                  setSelectedTraps([])
                }}
                onToggleTrapTag={(ids) => {
                  setTrapObjects(objects => objects.map(o => 
                    ids.includes(o.id) ? { ...o, tagged: !o.tagged } : o
                  ))
                }}
                onSelectAll={() => {
                  setSelectedTraps(trapObjects)
                  setSelectedObjectIds(trapObjects.map(t => t.id))
                }}
                onDeselectAll={() => {
                  setSelectedTraps([])
                  setSelectedObjectIds([])
                }}
                totalTraps={trapObjects.length}
                taggedTrapsCount={trapObjects.filter(t => t.tagged).length}
              />
            )}

            {rightPanelTab === 'density' && (
              <DensitometerTool
                isActive={densitometerActive}
                onToggle={() => {
                  setDensitometerActive(!densitometerActive)
                  setActiveTool(densitometerActive ? 'SELECT' : 'DENSITOMETER')
                }}
                currentReading={densitometerReading}
                readings={densitometerHistory.filter(Boolean) as NonNullable<typeof densitometerReading>[]}
                onClearReadings={() => setDensitometerHistory([])}
                onSampleColor={(x, y) => console.log('Sample at', x, y)}
              />
            )}

            {rightPanelTab === 'tags' && (
              <TrapTagsPanel
                tags={trapTags}
                selectedTagIds={selectedTagIds}
                onTagSelect={(tagId, multi) => {
                  if (multi) {
                    setSelectedTagIds(prev => 
                      prev.includes(tagId) 
                        ? prev.filter(id => id !== tagId)
                        : [...prev, tagId]
                    )
                  } else {
                    setSelectedTagIds([tagId])
                  }
                }}
                onTagCreate={(objectIds) => {
                  handleCreateTagForSelection(objectIds)
                }}
                onTagUpdate={(tagId, updates) => {
                  setTrapTags(tags => tags.map(t => 
                    t.id === tagId ? { ...t, ...updates } : t
                  ))
                }}
                onTagDelete={(tagIds) => {
                  setTrapTags(tags => tags.filter(t => !tagIds.includes(t.id)))
                  setSelectedTagIds([])
                  // Odstráň tagy aj z objektov
                  setTrapObjects(prev => prev.map(obj => {
                    if (obj.tagIds) {
                      const newTags = obj.tagIds.filter(id => !tagIds.includes(id))
                      return { ...obj, tagIds: newTags, tagged: newTags.length > 0 }
                    }
                    return obj
                  }))
                }}
                onApplyToSelection={(tagUpdates) => {
                  setTrapTags(tags => tags.map(t => 
                    selectedTagIds.includes(t.id) ? { ...t, ...tagUpdates } : t
                  ))
                }}
                selectedObjectIds={selectedObjectIds}
                totalObjects={trapObjects.length}
              />
            )}

            {rightPanelTab === 'rules' && (
              <TrapRulesPanel
                rules={trapRules}
                onRuleToggle={(ruleId) => {
                  setTrapRules(rules => rules.map(r => 
                    r.id === ruleId ? { ...r, enabled: !r.enabled } : r
                  ))
                }}
                onRuleUpdate={(ruleId, updates) => {
                  setTrapRules(rules => rules.map(r => 
                    r.id === ruleId ? { ...r, ...updates } : r
                  ))
                }}
                onRuleDelete={(ruleId) => {
                  setTrapRules(rules => rules.filter(r => r.id !== ruleId))
                }}
                onRuleCreate={(rule) => {
                  setTrapRules([...trapRules, { ...rule, id: `rule_${Date.now()}` }])
                }}
                onRulesReorder={(ruleIds) => {
                  const reordered = ruleIds.map(id => trapRules.find(r => r.id === id)!).filter(Boolean)
                  setTrapRules(reordered)
                }}
                onResetToDefaults={() => {
                  setTrapRules(DEFAULT_TRAP_RULES.map(r => ({ ...r })))
                }}
              />
            )}
          </div>

          {/* Quick Actions */}
          <div className="p-2 border-t border-slate-800 space-y-1">
            <button
              onClick={() => setShowRichBlackDialog(true)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs flex items-center justify-center gap-2"
            >
              ⬛ Rich Black
            </button>
            <button
              onClick={() => setShowWhiteUnderprintDialog(true)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs flex items-center justify-center gap-2"
            >
              ⬜ White Underprint
            </button>
          </div>
        </div>
      )}

      {/* Toggle Right Panel Button */}
      <button
        onClick={() => setShowRightPanel(!showRightPanel)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-slate-800 hover:bg-slate-700 p-1 rounded-l z-10"
        style={{ right: showRightPanel ? '320px' : '0' }}
      >
        {showRightPanel ? '▶' : '◀'}
      </button>

      {/* QC Report Modal */}
      {(showQcModal || qcReport) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-3xl max-h-[85vh] overflow-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-pink-400">📋 QC Report</h2>
              <button
                onClick={() => {
                  setShowQcModal(false)
                  setQcResults(null)
                }}
                className="text-slate-400 hover:text-white text-2xl leading-none px-2"
              >
                ×
              </button>
            </div>
            <pre className="text-xs text-slate-300 font-mono whitespace-pre bg-slate-950 p-4 rounded-lg overflow-x-auto">
              {qcResults || qcReport}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowQcModal(false)
                  setQcResults(null)
                }}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-400 rounded-lg transition-colors"
              >
                Zavrieť
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rich Black Dialog */}
      <RichBlackDialog
        isOpen={showRichBlackDialog}
        onClose={() => setShowRichBlackDialog(false)}
        settings={richBlackSettings}
        onApply={setRichBlackSettings}
      />

      {/* White Underprint Dialog */}
      <WhiteUnderprintDialog
        isOpen={showWhiteUnderprintDialog}
        onClose={() => setShowWhiteUnderprintDialog(false)}
        settings={whiteUnderprintSettings}
        onApply={setWhiteUnderprintSettings}
      />

      {/* Help/Onboarding Overlay */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-pink-400">
                🎯 AutoTrap Studio - Návod
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                <span className="text-xl w-8 text-center">{uploadedFile ? '✅' : '1️⃣'}</span>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">Nahraj obrázok</div>
                  <div className="text-xs text-slate-400">Pretiahni PNG/JPG do pracovnej plochy</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                <span className="text-xl w-8 text-center">2️⃣</span>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">Nastav parametre</div>
                  <div className="text-xs text-slate-400">Šírka trapu, technológia tlače (ľavý panel)</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30 border border-dashed border-slate-600">
                <span className="text-xl w-8 text-center">{showMisregistration ? '✅' : '⚠️'}</span>
                <div className="flex-1">
                  <div className="font-medium text-slate-300 text-sm">Simuluj chybu <span className="text-slate-500">(voliteľné)</span></div>
                  <div className="text-xs text-slate-500">Tlačidlo "Reg" ukáže registračnú chybu</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                <span className="text-xl w-8 text-center">{generatedTraps.length > 0 ? '✅' : '3️⃣'}</span>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">Generuj trapy</div>
                  <div className="text-xs text-slate-400">Klikni "Generovať trapy" v ľavom paneli</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                <span className="text-xl w-8 text-center">4️⃣</span>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">Skontroluj výsledok</div>
                  <div className="text-xs text-slate-400">View módy: 📷 Originál | 🔀 Overlay | 🎯 Len trapy</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                <span className="text-xl w-8 text-center">{trappedImageUrl ? '✅' : '5️⃣'}</span>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">Exportuj</div>
                  <div className="text-xs text-slate-400">Stiahni ako 🖼️ PNG alebo 📄 PDF</div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
              <div className="text-xs text-slate-400">
                <span className="text-yellow-400">💡 Tip:</span> Trapping prekrýva medzery medzi farbami, 
                ktoré vznikajú pri nepresnom súlade tlačových platní (registračná chyba).
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 flex justify-between items-center">
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input 
                  type="checkbox" 
                  className="rounded"
                  onChange={(e) => {
                    if (e.target.checked) {
                      localStorage.setItem('hideAutoTrapHelp', 'true')
                    }
                  }}
                />
                Nezobrazovať znova
              </label>
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-400 rounded-lg text-sm font-medium"
              >
                Začať prácu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Help Button */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 w-10 h-10 bg-pink-500 hover:bg-pink-400 rounded-full shadow-lg flex items-center justify-center text-lg z-40 transition-transform hover:scale-110"
        title="Nápoveda"
      >
        ?
      </button>

      {/* Contextual Hints - zobrazí sa podľa stavu */}
      {!showHelp && !uploadedFile && (
        <div className="fixed bottom-16 right-4 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg z-30 max-w-xs animate-pulse">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-2xl">📁</span>
            <div>
              <div className="font-medium text-white">Krok 1: Nahraj obrázok</div>
              <div className="text-xs text-slate-400">Pretiahni súbor do pracovnej plochy</div>
            </div>
          </div>
        </div>
      )}

      {!showHelp && uploadedFile && generatedTraps.length === 0 && !trapProcessing && (
        <div className="fixed bottom-16 right-4 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg z-30 max-w-xs">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-2xl">🎨</span>
            <div>
              <div className="font-medium text-white">Krok 2: Generuj trapy</div>
              <div className="text-xs text-slate-400">Klikni "Generovať trapy" v ľavom paneli</div>
            </div>
          </div>
        </div>
      )}

      {!showHelp && generatedTraps.length > 0 && !trappedImageUrl && (
        <div className="fixed bottom-16 right-4 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg z-30 max-w-xs">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-2xl">📤</span>
            <div>
              <div className="font-medium text-white">Krok 3: Exportuj</div>
              <div className="text-xs text-slate-400">Klikni PNG alebo PDF pre stiahnutie</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AutoTrapStudio
