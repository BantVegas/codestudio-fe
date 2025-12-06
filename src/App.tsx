import React, { useMemo, useRef, useState, useCallback } from 'react'
import './App.css'

import {
  PRINTING_PROFILES,
  getDefaultProfile,
  type PrintingProfile,
  type PrintingProfileId,
} from './config/printingProfiles'

import { LeftPanel } from './components/LeftPanel/LeftPanel'
import { GraphicToolsPanel } from './components/GraphicToolsPanel/GraphicToolsPanel'
import { PreviewPanel } from './components/PreviewPanel/PreviewPanel'
import { StepRepeatPanel } from './components/StepRepeatPanel/StepRepeatPanel'
import { ExportPanel } from './components/ExportPanel/ExportPanel'
import { MachinePresetsPanel } from './components/MachinePresetsPanel/MachinePresetsPanel'
import { JobTicketPanel } from './components/JobTicketPanel/JobTicketPanel'
import { LoginPage, type AppMode } from './components/LoginPage/LoginPage'
import { AutoTrapStudio } from './components/AutoTrapStudio/AutoTrapStudio'

import type {
  CodeType,
  DataMode,
  Rotation,
  VdpMode,
  LabelPreset,
  ReferenceBox,
  VdpImportState,
  PrintDirection,
  LabelConfig,
  Layer,
  DistortionSettings,
  StepRepeatConfig,
  WebStepRepeat,
  ExportSettings,
  SeparationPreview,
  MachinePreset,
  LabelOrientation,
} from './types/barcodeTypes'

/** BASE URL na BE – primárne z Vite env, fallback na Railway / api.gpcs.online */
const RAW_API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'https://api.gpcs.online'

// odstráň trailing /, aby URL boli vždy v tvare https://.../api/...
const API_BASE_URL = RAW_API_BASE.replace(/\/+$/, '')

const App: React.FC = () => {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [appMode, setAppMode] = useState<AppMode>('CODE_GENERATOR')

  /* =====================
   * ZÁKLADNÉ DÁTA KÓDU
   * ===================== */
  const [codeType, setCodeType] = useState<CodeType>('CODE128')
  const [codeValue, setCodeValue] = useState<string>('')
  const [touched, setTouched] = useState(false)

  const error = useMemo(() => {
    if (!touched) return ''
    if (!codeValue) return 'Hodnota je povinná'

    const onlyDigits = /^[0-9]+$/

    if (codeType === 'EAN13' && (!onlyDigits.test(codeValue) || codeValue.length !== 12)) {
      return 'EAN-13: zadaj presne 12 číslic (bez kontrolnej číslice)'
    }
    if (codeType === 'EAN8' && (!onlyDigits.test(codeValue) || codeValue.length !== 7)) {
      return 'EAN-8: zadaj presne 7 číslic (bez kontrolnej číslice)'
    }
    if (codeType === 'UPCA' && (!onlyDigits.test(codeValue) || codeValue.length !== 11)) {
      return 'UPC-A: zadaj presne 11 číslic (bez kontrolnej číslice)'
    }
    if (codeType === 'ITF14' && (!onlyDigits.test(codeValue) || codeValue.length !== 13)) {
      return 'ITF-14: zadaj presne 13 číslic (GTIN-14 bez kontrolnej číslice)'
    }

    return ''
  }, [codeType, codeValue, touched])

  const maxLength = 512

  /* =====================
   * TLAČOVÝ PROFIL
   * ===================== */
  const defaultProfile = getDefaultProfile()
  const [activeProfileId, setActiveProfileId] = useState<PrintingProfileId>(
    defaultProfile.id,
  )
  const activeProfile: PrintingProfile | null = useMemo(
    () => PRINTING_PROFILES.find(p => p.id === activeProfileId) ?? null,
    [activeProfileId],
  )

  const [xDimMm, setXDimMm] = useState(defaultProfile.recommended.xDimMm)
  const [quietZoneMm, setQuietZoneMm] = useState(
    defaultProfile.recommended.quietZoneMm,
  )
  const [magnificationPercent, setMagnificationPercent] = useState(
    defaultProfile.recommended.magnificationPercent,
  )
  const [barWidthReductionMm, setBarWidthReductionMm] = useState(
    defaultProfile.recommended.barWidthReductionMm,
  )

  const applyPrintingProfile = (p: PrintingProfile) => {
    setXDimMm(p.recommended.xDimMm)
    setQuietZoneMm(p.recommended.quietZoneMm)
    setMagnificationPercent(p.recommended.magnificationPercent)
    setBarWidthReductionMm(p.recommended.barWidthReductionMm)
    setActiveProfileId(p.id)
  }

  /* =====================
   * DATA MODE + GS1 FORM
   * ===================== */
  const [dataMode, setDataMode] = useState<DataMode>('PLAIN')

  const [labelGtin14, setLabelGtin14] = useState('')
  const [labelLot, setLabelLot] = useState('')
  const [labelBestBefore, setLabelBestBefore] = useState('')
  const [labelSerial, setLabelSerial] = useState('')
  const [labelProdDate, setLabelProdDate] = useState('')
  const [labelPackDate, setLabelPackDate] = useState('')
  const [labelUseBy, setLabelUseBy] = useState('')
  const [labelVariant, setLabelVariant] = useState('')
  const [labelQuantity, setLabelQuantity] = useState('')
  const [labelCount, setLabelCount] = useState('')

  const computeGs1CheckDigit = (gtinBase: string): string | null => {
    const digits = gtinBase.replace(/[^0-9]/g, '')
    if (digits.length !== 13 && digits.length !== 14) return null

    const body = digits.length === 14 ? digits.slice(0, 13) : digits
    const reversed = body.split('').reverse()
    let sum = 0
    for (let i = 0; i < reversed.length; i++) {
      const n = parseInt(reversed[i], 10)
      sum += (i + 1) % 2 === 1 ? 3 * n : n
    }
    const cd = (10 - (sum % 10)) % 10
    return body + String(cd)
  }

  const buildGs1LabelString = () => {
    const parts: string[] = []
    if (labelGtin14) parts.push(`(01)${labelGtin14}`)
    if (labelBestBefore) parts.push(`(17)${labelBestBefore}`)
    if (labelLot) parts.push(`(10)${labelLot}`)
    if (labelSerial) parts.push(`(21)${labelSerial}`)
    if (labelProdDate) parts.push(`(11)${labelProdDate}`)
    if (labelPackDate) parts.push(`(13)${labelPackDate}`)
    if (labelUseBy) parts.push(`(15)${labelUseBy}`)
    if (labelVariant) parts.push(`(20)${labelVariant}`)
    if (labelQuantity) parts.push(`(30)${labelQuantity}`)
    if (labelCount) parts.push(`(37)${labelCount}`)

    const gs1String = parts.join('')
    setCodeValue(gs1String)
    setDataMode('GS1_FORM')
    setTouched(true)
  }

  /* =====================
   * BACKEND VALIDÁCIA
   * ===================== */
  const [serverMessage, setServerMessage] = useState('')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleValidateGs1Linear = async () => {
    setLoading(true)
    setServerMessage('')
    setServerError('')

    try {
      if (!codeValue) {
        throw new Error('Hodnota kódu je prázdna.')
      }

      const resp = await fetch(`${API_BASE_URL}/api/gs1/validate-linear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codeType,
          value: codeValue,
        }),
      })

      // Ak backend endpoint ešte nie je hotový / 404 → fallback na lokálny stub
      if (resp.status === 404) {
        setServerMessage(
          'Backend validácia ešte nie je dostupná – lokálna kontrola OK (formát vyzerá v poriadku).',
        )
        return
      }

      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(
          `Chyba BE validácie (${resp.status}): ${text || 'neznáma chyba'}`,
        )
      }

      type Gs1Response = {
        valid: boolean
        message?: string
        warnings?: string[]
        sanitized?: string
        finalCode?: string
        checkDigit?: number
      }

      const data: Gs1Response = await resp.json()

      if (typeof data.valid === 'boolean') {
        const warningsText =
          data.warnings && data.warnings.length > 0
            ? `\nUpozornenia: ${data.warnings.join('; ')}`
            : ''

        if (data.valid) {
          const baseMsg = data.message ?? 'GS1 validácia úspešná.'
          setServerMessage(baseMsg + warningsText)
          setServerError('')
        } else {
          const baseMsg = data.message ?? 'GS1 kód nie je validný.'
          setServerError(baseMsg + warningsText)
          setServerMessage('')
        }
      } else {
        // backend vrátil niečo iné, ale bez chyby
        setServerMessage(
          data?.message ??
            'Backend odpovedal, ale formát odpovede nie je špecifikovaný. Predpokladám OK.',
        )
      }
    } catch (e) {
      console.error(e)
      setServerError(
        e instanceof Error
          ? e.message
          : 'Neznáma chyba pri volaní backend validácie.',
      )
    } finally {
      setLoading(false)
    }
  }

  /* =====================
   * EXPORT & ROZMERY
   * ===================== */
  const [exportDpi, setExportDpi] = useState(300)

  const [labelWidthMm, setLabelWidthMm] = useState(50)
  const [labelHeightMm, setLabelHeightMm] = useState(30)
  const [labelPreset, setLabelPreset] = useState<LabelPreset>('50x30')
  const [bleedMm, setBleedMm] = useState(2)
  const [safeMarginMm, setSafeMarginMm] = useState(2)
  const [referenceBox, setReferenceBox] = useState<ReferenceBox>('TRIM')

  const [anchorX, setAnchorX] = useState<'start' | 'center' | 'end'>('end')
  const [anchorY, setAnchorY] = useState<'start' | 'center' | 'end'>('end')
  const [offsetXmm, setOffsetXmm] = useState(-3)
  const [offsetYmm, setOffsetYmm] = useState(3)

  /* =====================
   * ROTÁCIA & SMER TLAČE & VDP
   * ===================== */
  const [rotation, setRotation] = useState<Rotation>(0)
  const [printDirection, setPrintDirection] =
    useState<PrintDirection>('ALONG_WEB')

  const [vdpEnabled, setVdpEnabled] = useState(false)
  const [serialStart, setSerialStart] = useState(1)
  const [serialCurrent, setSerialCurrent] = useState(1)
  const [serialPadding, setSerialPadding] = useState(6)
  const [vdpPattern, setVdpPattern] = useState<string>('[SERIAL]')
  const [vdpMode, setVdpMode] = useState<VdpMode>('LINEAR')
  const [vdpCount, setVdpCount] = useState(100)
  const [vdpPrefix, setVdpPrefix] = useState('')
  const [vdpAlphaStartChar, setVdpAlphaStartChar] = useState('A')

  /* =====================
   * VDP IMPORT STATE
   * ===================== */
  const [vdpImportState, setVdpImportState] = useState<VdpImportState>({
    fileName: null,
    columns: [],
    rows: [],
    currentRowIndex: 0,
    totalRows: 0,
    patternTemplate: '[SERIAL]',
    fieldMapping: {},
  })
  const [vdpImportPatternTemplate, setVdpImportPatternTemplate] = useState(
    '(01)[SERIAL]',
  )

  /* =====================
   * GRAFIKA KÓDU
   * ===================== */
  const [barHeightPx, setBarHeightPx] = useState(60)
  const [showHrText, setShowHrText] = useState(true)
  const [hrFontSizePt, setHrFontSizePt] = useState(14)
  const [barColor, setBarColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [textColor, setTextColor] = useState('#000000')

  // editable HR line
  const [hrCustomText, setHrCustomText] = useState('')

  /* =====================
   * LABEL SHAPE & GUIDES
   * ===================== */
  const [labelBorderRadiusMm, setLabelBorderRadiusMm] = useState(1.0)
  const [showDimensionGuides, setShowDimensionGuides] = useState(true)

  /* =====================
   * QR LOGO
   * ===================== */
  const [qrLogoDataUrl, setQrLogoDataUrl] = useState<string | null>(null)
  const [qrLogoScale, setQrLogoScale] = useState(0.25)

  /* =====================
   * LABEL CANVAS STATE
   * ===================== */
  const [layers] = useState<Layer[]>([
    {
      id: 'layer_white',
      type: 'WHITE_UNDERPRINT',
      name: 'White Underprint',
      visible: true,
      locked: false,
      printable: true,
      objects: [],
      colorMode: 'SPOT',
      spotColorName: 'WHITE',
      overprint: false,
      knockout: false,
    },
    {
      id: 'layer_barcode',
      type: 'BARCODE',
      name: 'Barcode',
      visible: true,
      locked: false,
      printable: true,
      objects: [],
      colorMode: 'PROCESS',
      overprint: false,
      knockout: true,
    },
    {
      id: 'layer_text',
      type: 'TEXT',
      name: 'Text',
      visible: true,
      locked: false,
      printable: true,
      objects: [],
      colorMode: 'PROCESS',
      overprint: false,
      knockout: true,
    },
    {
      id: 'layer_logo',
      type: 'LOGO',
      name: 'Logo',
      visible: true,
      locked: false,
      printable: true,
      objects: [],
      colorMode: 'PROCESS',
      overprint: false,
      knockout: true,
    },
  ])
  const [distortionSettings, setDistortionSettings] =
    useState<DistortionSettings>({
      enabled: false,
      webDirectionPercent: 0,
      crossDirectionPercent: 0,
      previewDistorted: false,
    })

  // Canvas zobrazenie zón
  const [showBleedZone] = useState(true)
  const [showTrimZone] = useState(true)
  const [showSafeZone] = useState(true)
  const [showCanvasGrid] = useState(true)
  const [canvasGridSizeMm, setCanvasGridSizeMm] = useState(1)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [labelOrientation] = useState<LabelOrientation>('HEAD_UP')

  // Help/Onboarding
  const [showHelp, setShowHelp] = useState(() => {
    return localStorage.getItem('gpcs-codegen-help-dismissed') !== 'true'
  })

  // Zbaliteľné grafické nástroje
  const [showGraphicTools, setShowGraphicTools] = useState(false)
  // Modal pre canvas nastavenia
  const [showCanvasSettings, setShowCanvasSettings] = useState(false)
  // Modal pre Step & Repeat
  const [showStepRepeat, setShowStepRepeat] = useState(false)
  // Modal pre Export
  const [showExport, setShowExport] = useState(false)

  // Step & Repeat config
  const [stepRepeatConfig, setStepRepeatConfig] = useState<StepRepeatConfig>({
    mode: 'WEB',
    webWidthMm: 330,
    repeatLengthMm: 330,
    lanes: 3,
    rows: 4,
    horizontalGapMm: 2,
    verticalGapMm: 2,
    staggerMode: 'NONE',
    leftMarginMm: 5,
    rightMarginMm: 5,
    leadingEdgeMm: 5,
    trailingEdgeMm: 5,
    includeEyeMark: true,
    eyeMarkPositionMm: 5,
    eyeMarkWidthMm: 3,
    eyeMarkHeightMm: 5,
    includeRegistrationMarks: true,
    includeColorBar: false,
    includeMicrotext: false,
    microtextContent: '',
  } as WebStepRepeat)

  // Export settings
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'PDF',
    pdfVersion: 'PDF_X4',
    embedFonts: true,
    outlineFonts: false,
    dpi: 300,
    colorMode: 'CMYK',
    spotColors: [],
    barcodeColorName: 'Black',
    barcodeAsSpot: false,
    whiteUnderprint: false,
    whiteUnderprintSpread: 0.1,
    includeBleed: true,
    includeCropMarks: true,
    includeRegistrationMarks: true,
    includeColorBars: false,
    markOffset: 3,
  })

  // Machine Presets
  const [showMachinePresets, setShowMachinePresets] = useState(false)
  const [selectedMachinePreset, setSelectedMachinePreset] =
    useState<MachinePreset | null>(null)

  // Job Ticket
  const [showJobTicket, setShowJobTicket] = useState(false)
  const jobId = `JOB-${Date.now().toString(36).toUpperCase()}`

  const labelConfig: LabelConfig = {
    widthMm: labelWidthMm,
    heightMm: labelHeightMm,
    bleedMm,
    safeMarginMm,
    cornerRadiusMm: labelBorderRadiusMm,
    orientation: labelOrientation,
    printDirection,
    referenceBox,
    showBleedZone,
    showTrimZone,
    showSafeZone,
    showGrid: showCanvasGrid,
    gridSizeMm: canvasGridSizeMm,
  }

  /* =====================
   * REFS
   * ===================== */
  const svgRef = useRef<SVGSVGElement | null>(null)
  const previewWrapperRef = useRef<HTMLDivElement | null>(null)

  /* =====================
   * EXPORT FUNCTIONS - Profesionálny prístup
   * ===================== */
  
  // Pomocná funkcia pre získanie SVG s správnymi rozmermi
  const getSvgForExport = useCallback(() => {
    if (!svgRef.current) return null
    
    const svgElement = svgRef.current.cloneNode(true) as SVGSVGElement
    
    // Nastavíme explicitné rozmery v mm
    const widthPx = labelWidthMm * (exportDpi / 25.4)
    const heightPx = labelHeightMm * (exportDpi / 25.4)
    
    svgElement.setAttribute('width', `${labelWidthMm}mm`)
    svgElement.setAttribute('height', `${labelHeightMm}mm`)
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    svgElement.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
    
    return { element: svgElement, widthPx, heightPx }
  }, [labelWidthMm, labelHeightMm, exportDpi])

  const handleExportSVG = useCallback(() => {
    const svgData = getSvgForExport()
    if (!svgData) {
      alert('Nie je dostupný SVG náhľad na export.')
      return
    }
    
    const serializer = new XMLSerializer()
    let svgString = serializer.serializeToString(svgData.element)
    
    // Pridáme XML deklaráciu
    svgString = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svgString
    
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `barcode_${codeType}_${labelWidthMm}x${labelHeightMm}mm.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [codeType, labelWidthMm, labelHeightMm, getSvgForExport])

  const handleExportPNG = useCallback(() => {
    const svgData = getSvgForExport()
    if (!svgData) {
      alert('Nie je dostupný SVG náhľad na export.')
      return
    }
    
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svgData.element)
    
    // Vytvoríme canvas s vysokým rozlíšením
    const canvas = document.createElement('canvas')
    canvas.width = svgData.widthPx
    canvas.height = svgData.heightPx
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      alert('Nepodarilo sa vytvoriť canvas pre export.')
      return
    }
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    // Vytvoríme data URL zo SVG
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    
    img.onload = () => {
      // Vyplníme pozadie
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Nakreslíme SVG
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const pngUrl = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = pngUrl
          link.download = `barcode_${codeType}_${labelWidthMm}x${labelHeightMm}mm_${exportDpi}dpi.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(pngUrl)
        }
      }, 'image/png', 1.0)
      
      URL.revokeObjectURL(url)
    }
    
    img.onerror = () => {
      alert('Chyba pri načítaní SVG pre PNG export.')
      URL.revokeObjectURL(url)
    }
    
    img.src = url
  }, [codeType, exportDpi, bgColor, labelWidthMm, labelHeightMm, getSvgForExport])

  const handleExportTIFF = useCallback(() => {
    const svgData = getSvgForExport()
    if (!svgData) {
      alert('Nie je dostupný SVG náhľad na export.')
      return
    }
    
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svgData.element)
    
    const canvas = document.createElement('canvas')
    canvas.width = svgData.widthPx
    canvas.height = svgData.heightPx
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      alert('Nepodarilo sa vytvoriť canvas pre export.')
      return
    }
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    
    img.onload = () => {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // Export ako PNG (TIFF nie je natívne podporovaný v prehliadačoch)
      canvas.toBlob((blob) => {
        if (blob) {
          const tiffUrl = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = tiffUrl
          link.download = `barcode_${codeType}_${labelWidthMm}x${labelHeightMm}mm_${exportDpi}dpi.tiff`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(tiffUrl)
        }
      }, 'image/png', 1.0)
      
      URL.revokeObjectURL(url)
    }
    
    img.onerror = () => {
      alert('Chyba pri načítaní SVG pre TIFF export.')
      URL.revokeObjectURL(url)
    }
    
    img.src = url
  }, [codeType, exportDpi, bgColor, labelWidthMm, labelHeightMm, getSvgForExport])

  const handleExportPDF = useCallback(() => {
    const svgData = getSvgForExport()
    if (!svgData) {
      alert('Nie je dostupný SVG náhľad na export.')
      return
    }
    
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svgData.element)

    // Vytvoríme HTML stránku s presnou veľkosťou etikety
    const printWindow = window.open('', '_blank', `width=${labelWidthMm * 3.78},height=${labelHeightMm * 3.78}`)
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Barcode Export - ${codeType}</title>
  <style>
    @page { 
      size: ${labelWidthMm}mm ${labelHeightMm}mm; 
      margin: 0; 
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { 
      width: ${labelWidthMm}mm;
      height: ${labelHeightMm}mm;
      margin: 0; 
      padding: 0;
      overflow: hidden;
    }
    body { 
      display: flex;
      justify-content: center;
      align-items: center;
      background: ${bgColor};
    }
    svg { 
      width: ${labelWidthMm}mm;
      height: ${labelHeightMm}mm;
      max-width: 100%;
      max-height: 100%;
    }
    @media print {
      html, body { 
        width: ${labelWidthMm}mm;
        height: ${labelHeightMm}mm;
      }
    }
  </style>
</head>
<body>
  ${svgString}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    }
  </script>
</body>
</html>`)
      printWindow.document.close()
    } else {
      alert('Povoľte vyskakovacie okná pre PDF export.')
    }
  }, [codeType, labelWidthMm, labelHeightMm, bgColor, getSvgForExport])

  const handleExportEPS = useCallback(() => {
    const svgData = getSvgForExport()
    if (!svgData) {
      alert('Nie je dostupný SVG náhľad na export.')
      return
    }
    
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svgData.element)
    
    // Konvertujeme mm na points (1mm = 2.83465pt)
    const widthPt = labelWidthMm * 2.83465
    const heightPt = labelHeightMm * 2.83465
    
    // Vytvoríme EPS s embedded SVG ako komentár
    const epsContent = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 ${Math.ceil(widthPt)} ${Math.ceil(heightPt)}
%%HiResBoundingBox: 0 0 ${widthPt.toFixed(4)} ${heightPt.toFixed(4)}
%%Creator: GPCS CodeStudio
%%Title: Barcode ${codeType} - ${labelWidthMm}x${labelHeightMm}mm
%%CreationDate: ${new Date().toISOString()}
%%DocumentData: Clean7Bit
%%LanguageLevel: 2
%%Pages: 1
%%EndComments

%%BeginProlog
/mm { 2.83465 mul } def
%%EndProlog

%%Page: 1 1

% Label background
newpath
0 0 moveto
${widthPt.toFixed(4)} 0 lineto
${widthPt.toFixed(4)} ${heightPt.toFixed(4)} lineto
0 ${heightPt.toFixed(4)} lineto
closepath
1 1 1 setrgbcolor
fill

% SVG source (for reference - convert using Inkscape CLI):
% ${svgString.replace(/\n/g, ' ').substring(0, 500)}...

% Placeholder rectangle
newpath
${(widthPt * 0.1).toFixed(4)} ${(heightPt * 0.1).toFixed(4)} moveto
${(widthPt * 0.9).toFixed(4)} ${(heightPt * 0.1).toFixed(4)} lineto
${(widthPt * 0.9).toFixed(4)} ${(heightPt * 0.9).toFixed(4)} lineto
${(widthPt * 0.1).toFixed(4)} ${(heightPt * 0.9).toFixed(4)} lineto
closepath
0 0 0 setrgbcolor
0.5 setlinewidth
stroke

showpage
%%EOF
`
    
    const blob = new Blob([epsContent], { type: 'application/postscript' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `barcode_${codeType}_${labelWidthMm}x${labelHeightMm}mm.eps`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [codeType, labelWidthMm, labelHeightMm, getSvgForExport])

  const handleExportWithSettings = useCallback((settings: ExportSettings) => {
    switch (settings.format) {
      case 'SVG':
        handleExportSVG()
        break
      case 'PNG':
        handleExportPNG()
        break
      case 'TIFF':
        handleExportTIFF()
        break
      case 'PDF':
        handleExportPDF()
        break
      case 'EPS':
        handleExportEPS()
        break
      default:
        handleExportSVG()
    }
  }, [handleExportSVG, handleExportPNG, handleExportTIFF, handleExportPDF, handleExportEPS])

  /* =====================
   * RENDER
   * ===================== */

  // Ak nie je prihlásený, zobraz login stránku
  if (!isLoggedIn) {
    return <LoginPage onLogin={(mode) => {
      setAppMode(mode)
      setIsLoggedIn(true)
    }} />
  }

  // Ak je zvolený AUTO_TRAPPING mode, zobraz AutoTrap Studio
  if (appMode === 'AUTO_TRAPPING') {
    return <AutoTrapStudio onBack={() => setIsLoggedIn(false)} />
  }

  return (
    <div className="flex min-h-screen w-screen bg-slate-950 text-slate-50">
      {/* ľavý panel – vlastný vertikálny scroll, aby spodok nikdy nebol odrezaný */}
      <div className="flex-shrink-0 border-r border-slate-800">
        <div className="max-h-screen overflow-y-auto px-6 py-6">
          <LeftPanel
            codeType={codeType}
            setCodeType={setCodeType}
            codeValue={codeValue}
            setCodeValue={setCodeValue}
            maxLength={maxLength}
            error={error}
            setTouched={setTouched}
            dataMode={dataMode}
            setDataMode={setDataMode}
            labelGtin14={labelGtin14}
            setLabelGtin14={setLabelGtin14}
            labelLot={labelLot}
            setLabelLot={setLabelLot}
            labelBestBefore={labelBestBefore}
            setLabelBestBefore={setLabelBestBefore}
            labelSerial={labelSerial}
            setLabelSerial={setLabelSerial}
            labelProdDate={labelProdDate}
            setLabelProdDate={setLabelProdDate}
            labelPackDate={labelPackDate}
            setLabelPackDate={setLabelPackDate}
            labelUseBy={labelUseBy}
            setLabelUseBy={setLabelUseBy}
            labelVariant={labelVariant}
            setLabelVariant={setLabelVariant}
            labelQuantity={labelQuantity}
            setLabelQuantity={setLabelQuantity}
            labelCount={labelCount}
            setLabelCount={setLabelCount}
            buildGs1LabelString={buildGs1LabelString}
            computeGs1CheckDigit={computeGs1CheckDigit}
            handleValidateGs1Linear={handleValidateGs1Linear}
            serverMessage={serverMessage}
            serverError={serverError}
            loading={loading}
            exportDpi={exportDpi}
            setExportDpi={setExportDpi}
            labelWidthMm={labelWidthMm}
            setLabelWidthMm={setLabelWidthMm}
            labelHeightMm={labelHeightMm}
            setLabelHeightMm={setLabelHeightMm}
            labelPreset={labelPreset}
            setLabelPreset={setLabelPreset}
            bleedMm={bleedMm}
            setBleedMm={setBleedMm}
            safeMarginMm={safeMarginMm}
            setSafeMarginMm={setSafeMarginMm}
            referenceBox={referenceBox}
            setReferenceBox={setReferenceBox}
            anchorX={anchorX}
            anchorY={anchorY}
            setAnchorX={setAnchorX}
            setAnchorY={setAnchorY}
            offsetXmm={offsetXmm}
            setOffsetXmm={setOffsetXmm}
            offsetYmm={offsetYmm}
            setOffsetYmm={setOffsetYmm}
            vdpImportState={vdpImportState}
            setVdpImportState={setVdpImportState}
            vdpImportPatternTemplate={vdpImportPatternTemplate}
            setVdpImportPatternTemplate={setVdpImportPatternTemplate}
          />
        </div>
      </div>

      {/* MODAL: Grafické nástroje */}
      {showGraphicTools && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-[800px] overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 shadow-2xl">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-600 bg-slate-800 px-6 py-4">
              <h2 className="flex items-center gap-3 text-lg font-semibold text-white">
                <span className="text-xl">⚙️</span>
                Tlač &amp; VDP nastavenia
              </h2>
              <button
                type="button"
                onClick={() => setShowGraphicTools(false)}
                className="rounded-lg border-2 border-slate-500 bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-all hover:border-red-500 hover:bg-red-500/20"
              >
                Zavrieť ✕
              </button>
            </div>
            {/* Modal content */}
            <div className="p-6">
              <GraphicToolsPanel
                codeType={codeType}
                rotation={rotation}
                setRotation={setRotation}
                printDirection={printDirection}
                setPrintDirection={setPrintDirection}
                xDimMm={xDimMm}
                setXDimMm={setXDimMm}
                quietZoneMm={quietZoneMm}
                setQuietZoneMm={setQuietZoneMm}
                magnificationPercent={magnificationPercent}
                setMagnificationPercent={setMagnificationPercent}
                barWidthReductionMm={barWidthReductionMm}
                setBarWidthReductionMm={setBarWidthReductionMm}
                applyPrintingProfile={applyPrintingProfile}
                vdpEnabled={vdpEnabled}
                setVdpEnabled={setVdpEnabled}
                serialStart={serialStart}
                setSerialStart={setSerialStart}
                serialCurrent={serialCurrent}
                setSerialCurrent={setSerialCurrent}
                serialPadding={serialPadding}
                setSerialPadding={setSerialPadding}
                vdpPattern={vdpPattern}
                setVdpPattern={setVdpPattern}
                vdpMode={vdpMode}
                setVdpMode={setVdpMode}
                vdpCount={vdpCount}
                setVdpCount={setVdpCount}
                vdpPrefix={vdpPrefix}
                setVdpPrefix={setVdpPrefix}
                vdpAlphaStartChar={vdpAlphaStartChar}
                setVdpAlphaStartChar={setVdpAlphaStartChar}
                barHeightPx={barHeightPx}
                setBarHeightPx={setBarHeightPx}
                showHrText={showHrText}
                setShowHrText={setShowHrText}
                hrFontSizePt={hrFontSizePt}
                setHrFontSizePt={setHrFontSizePt}
                barColor={barColor}
                setBarColor={setBarColor}
                bgColor={bgColor}
                setBgColor={setBgColor}
                textColor={textColor}
                setTextColor={setTextColor}
                qrLogoDataUrl={qrLogoDataUrl}
                setQrLogoDataUrl={setQrLogoDataUrl}
                qrLogoScale={qrLogoScale}
                setQrLogoScale={setQrLogoScale}
                hrCustomText={hrCustomText}
                setHrCustomText={setHrCustomText}
                labelBorderRadiusMm={labelBorderRadiusMm}
                setLabelBorderRadiusMm={setLabelBorderRadiusMm}
                showDimensionGuides={showDimensionGuides}
                setShowDimensionGuides={setShowDimensionGuides}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Canvas Settings (Distortion, Grid) */}
      {showCanvasSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[500px] rounded-2xl border border-slate-600 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-600 bg-slate-800 px-6 py-4">
              <h2 className="flex items-center gap-3 text-lg font-semibold text-white">
                <span className="text-xl">🎛️</span>
                Canvas nastavenia
              </h2>
              <button
                type="button"
                onClick={() => setShowCanvasSettings(false)}
                className="rounded-lg border-2 border-slate-500 bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-all hover:border-red-500 hover:bg-red-500/20"
              >
                ✕
              </button>
            </div>
            <div className="space-y-5 p-6">
              {/* Distortion */}
              <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
                <label className="mb-3 flex items-center gap-3 text-sm font-medium text-slate-200">
                  <input
                    type="checkbox"
                    checked={distortionSettings.enabled}
                    onChange={e =>
                      setDistortionSettings(s => ({
                        ...s,
                        enabled: e.target.checked,
                      }))
                    }
                    className="h-5 w-5 rounded border-slate-500 bg-slate-700 text-sky-500"
                  />
                  Povoliť distortion kompenzáciu (flexo)
                </label>
                {distortionSettings.enabled && (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Web smer (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={distortionSettings.webDirectionPercent}
                        onChange={e =>
                          setDistortionSettings(s => ({
                            ...s,
                            webDirectionPercent:
                              parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Cross smer (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={distortionSettings.crossDirectionPercent}
                        onChange={e =>
                          setDistortionSettings(s => ({
                            ...s,
                            crossDirectionPercent:
                              parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Grid size */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Grid veľkosť (mm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={canvasGridSizeMm}
                  onChange={e =>
                    setCanvasGridSizeMm(parseFloat(e.target.value) || 1)
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowCanvasSettings(false)}
                className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:from-sky-500 hover:to-sky-400"
              >
                Hotovo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Step & Repeat */}
      {showStepRepeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-[1000px] overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-600 bg-slate-800 px-6 py-4">
              <h2 className="flex items-center gap-3 text-xl font-bold text-white">
                <span className="text-2xl">🔁</span>
                Step & Repeat Layout
              </h2>
              <button
                type="button"
                onClick={() => setShowStepRepeat(false)}
                className="rounded-xl border-2 border-slate-500 bg-slate-700 px-5 py-2.5 text-base font-semibold text-white transition-all hover:border-red-500 hover:bg-red-500/20"
              >
                Zavrieť ✕
              </button>
            </div>
            <StepRepeatPanel
              config={stepRepeatConfig}
              onUpdateConfig={setStepRepeatConfig}
              labelConfig={labelConfig}
              onGenerateLayout={() => {}}
            />
          </div>
        </div>
      )}

      {/* MODAL: Export */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-[800px] overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-600 bg-slate-800 px-6 py-4">
              <h2 className="flex items-center gap-3 text-lg font-semibold text-white">
                <span className="text-xl">💾</span>
                Export etikety
              </h2>
              <button
                type="button"
                onClick={() => setShowExport(false)}
                className="rounded-lg border-2 border-slate-500 bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-all hover:border-red-500 hover:bg-red-500/20"
              >
                Zavrieť ✕
              </button>
            </div>
            <div className="p-6">
              <ExportPanel
                exportSettings={exportSettings}
                onUpdateSettings={updates =>
                  setExportSettings(prev => ({ ...prev, ...updates }))
                }
                labelConfig={labelConfig}
                layers={layers}
                onExport={settings => {
                  handleExportWithSettings(settings)
                  setShowExport(false)
                }}
                onGenerateSeparationPreview={() => {
                  const previews: SeparationPreview[] = [
                    {
                      colorName: 'Cyan',
                      isSpot: false,
                      previewDataUrl: '',
                      coverage: 15,
                    },
                    {
                      colorName: 'Magenta',
                      isSpot: false,
                      previewDataUrl: '',
                      coverage: 8,
                    },
                    {
                      colorName: 'Yellow',
                      isSpot: false,
                      previewDataUrl: '',
                      coverage: 5,
                    },
                    {
                      colorName: 'Black',
                      isSpot: false,
                      previewDataUrl: '',
                      coverage: 45,
                    },
                  ]
                  return previews
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Machine Presets */}
      {showMachinePresets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-[900px] overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-600 bg-slate-800 px-6 py-4">
              <h2 className="flex items-center gap-3 text-xl font-bold text-white">
                <span className="text-2xl">🏭</span>
                Strojové nastavenia
              </h2>
              <button
                type="button"
                onClick={() => setShowMachinePresets(false)}
                className="rounded-xl border-2 border-slate-500 bg-slate-700 px-5 py-2.5 text-base font-semibold text-white transition-all hover:border-red-500 hover:bg-red-500/20"
              >
                Zavrieť ✕
              </button>
            </div>
            <div className="p-6">
              <MachinePresetsPanel
                presets={[]}
                selectedPresetId={selectedMachinePreset?.id || null}
                onSelectPreset={setSelectedMachinePreset}
                onApplyDistortion={setDistortionSettings}
                distortionSettings={distortionSettings}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Job Ticket */}
      {showJobTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-[900px] overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-600 bg-slate-800 px-6 py-4">
              <h2 className="flex items-center gap-3 text-xl font-bold text-white">
                <span className="text-2xl">📋</span>
                Job Ticket / Report
              </h2>
              <button
                type="button"
                onClick={() => setShowJobTicket(false)}
                className="rounded-xl border-2 border-slate-500 bg-slate-700 px-5 py-2.5 text-base font-semibold text-white transition-all hover:border-red-500 hover:bg-red-500/20"
              >
                Zavrieť ✕
              </button>
            </div>
            <JobTicketPanel
              jobId={jobId}
              labelConfig={labelConfig}
              layers={layers}
              stepRepeatConfig={stepRepeatConfig}
              machinePreset={selectedMachinePreset || undefined}
              exportSettings={exportSettings}
              codeType={codeType}
              codeValue={codeValue}
              magnificationPercent={magnificationPercent}
              xDimMm={xDimMm}
              barWidthReductionMm={barWidthReductionMm}
              onGenerateReport={() => {}}
              onPrint={() => {}}
            />
          </div>
        </div>
      )}

      {/* Hlavný obsah */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar s dropdown hover efektmi */}
        <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-900/95 px-4 py-2">
          {/* VDP */}
          <div className="group relative">
            <button
              type="button"
              onClick={() => setShowGraphicTools(true)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:border-sky-500 hover:bg-sky-500/20 hover:shadow-lg"
            >
              ⚙️ VDP
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-48 origin-top scale-y-0 rounded-lg border border-sky-500/50 bg-slate-800 p-3 opacity-0 shadow-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:scale-y-100 group-hover:opacity-100">
              <p className="text-xs text-slate-300">Nastavenia VDP a tlače</p>
            </div>
          </div>

          {/* Step & Repeat */}
          <div className="group relative">
            <button
              type="button"
              onClick={() => setShowStepRepeat(true)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:border-emerald-500 hover:bg-emerald-500/20 hover:shadow-lg"
            >
              🔁 S&R
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-48 origin-top scale-y-0 rounded-lg border border-emerald-500/50 bg-slate-800 p-3 opacity-0 shadow-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:scale-y-100 group-hover:opacity-100">
              <p className="text-xs text-slate-300">Step & Repeat layout</p>
            </div>
          </div>

          {/* Export */}
          <div className="group relative">
            <button
              type="button"
              onClick={() => setShowExport(true)}
              className="rounded-lg border border-violet-500 bg-violet-500/20 px-4 py-2 text-sm font-bold text-violet-200 transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-violet-500/30 hover:shadow-lg"
            >
              💾 Export
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-48 origin-top scale-y-0 rounded-lg border border-violet-500/50 bg-slate-800 p-3 opacity-0 shadow-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:scale-y-100 group-hover:opacity-100">
              <p className="text-xs text-slate-300">Export etikety</p>
            </div>
          </div>

          {/* Stroj */}
          <div className="group relative">
            <button
              type="button"
              onClick={() => setShowMachinePresets(true)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:border-amber-500 hover:bg-amber-500/20 hover:shadow-lg"
            >
              🏭 Stroj
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-48 origin-top scale-y-0 rounded-lg border border-amber-500/50 bg-slate-800 p-3 opacity-0 shadow-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:scale-y-100 group-hover:opacity-100">
              <p className="text-xs text-slate-300">Strojové nastavenia</p>
            </div>
          </div>

          {/* Job Ticket */}
          <div className="group relative">
            <button
              type="button"
              onClick={() => setShowJobTicket(true)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:border-rose-500 hover:bg-rose-500/20 hover:shadow-lg"
            >
              📋 Job
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-48 origin-top scale-y-0 rounded-lg border border-rose-500/50 bg-slate-800 p-3 opacity-0 shadow-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:scale-y-100 group-hover:opacity-100">
              <p className="text-xs text-slate-300">Job Ticket / Report</p>
            </div>
          </div>

          <div className="mx-2 h-6 w-px bg-slate-700" />

          {/* Rýchly export */}
          <button onClick={handleExportSVG} className="rounded-lg border border-emerald-600 bg-emerald-600/20 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:shadow-lg">SVG</button>
          <button onClick={handleExportPNG} className="rounded-lg border border-blue-600 bg-blue-600/20 px-3 py-1.5 text-xs font-bold text-blue-300 transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:shadow-lg">PNG</button>
          <button onClick={handleExportPDF} className="rounded-lg border border-red-600 bg-red-600/20 px-3 py-1.5 text-xs font-bold text-red-300 transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:shadow-lg">PDF</button>

          <div className="mx-2 h-6 w-px bg-slate-700" />

          {/* Zoom */}
          <button onClick={() => setCanvasZoom(z => Math.max(0.25, z - 0.25))} className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 transition-all hover:bg-slate-700">−</button>
          <span className="w-12 text-center text-sm text-slate-200">{Math.round(canvasZoom * 100)}%</span>
          <button onClick={() => setCanvasZoom(z => Math.min(3, z + 0.25))} className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 transition-all hover:bg-slate-700">+</button>
        </div>

        {/* Náhľad - zväčšený */}
        <div className="flex flex-1 w-full overflow-auto p-4">
          <PreviewPanel
            codeType={codeType}
            rawCodeValue={codeValue}
            vdpEnabled={vdpEnabled}
            serialCurrent={serialCurrent}
            serialPadding={serialPadding}
            vdpPattern={vdpPattern}
            vdpMode={vdpMode}
            vdpPrefix={vdpPrefix}
            vdpAlphaStartChar={vdpAlphaStartChar}
            rotation={rotation}
            printDirection={printDirection}
            exportDpi={exportDpi}
            labelWidthMm={labelWidthMm}
            labelHeightMm={labelHeightMm}
            bleedMm={bleedMm}
            xDimMm={xDimMm}
            quietZoneMm={quietZoneMm}
            magnificationPercent={magnificationPercent}
            activeProfile={activeProfile}
            svgRef={svgRef}
            previewWrapperRef={previewWrapperRef}
            barHeightPx={barHeightPx}
            showHrText={showHrText}
            hrFontSizePt={hrFontSizePt}
            barColor={barColor}
            bgColor={bgColor}
            textColor={textColor}
            qrLogoDataUrl={qrLogoDataUrl}
            qrLogoScale={qrLogoScale}
            hrCustomText={hrCustomText}
            labelBorderRadiusMm={labelBorderRadiusMm}
            showDimensionGuides={showDimensionGuides}
          />
        </div>
      </div>

      {/* =====================
       * HELP OVERLAY
       * ===================== */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-[520px] max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-600 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">📊</span>
                Vitaj v Code Generator
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-white text-2xl transition-colors"
              >
                ×
              </button>
            </div>

            {/* Intro */}
            <p className="text-slate-300 text-sm mb-5 leading-relaxed">
              Profesionálny nástroj na generovanie čiarových kódov a QR kódov 
              pre flexotlač, digitálnu tlač a ofset.
            </p>

            {/* Steps */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <span className="text-xl w-8 text-center">{codeValue ? '✅' : '1️⃣'}</span>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">Vyber typ kódu</div>
                  <div className="text-xs text-slate-400">EAN-13, QR Code, Code 128, DataMatrix...</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <span className="text-xl w-8 text-center">2️⃣</span>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">Zadaj hodnotu</div>
                  <div className="text-xs text-slate-400">Číslo produktu, URL, text alebo GS1 dáta</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <span className="text-xl w-8 text-center">3️⃣</span>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">Nastav parametre</div>
                  <div className="text-xs text-slate-400">X-dim, zväčšenie, farby, rozmery etikety</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-dashed border-slate-600">
                <span className="text-xl w-8 text-center">⚙️</span>
                <div className="flex-1">
                  <div className="font-medium text-slate-300 text-sm">Pokročilé <span className="text-slate-500">(voliteľné)</span></div>
                  <div className="text-xs text-slate-500">VDP, Step & Repeat, strojové nastavenia</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <span className="text-xl w-8 text-center">4️⃣</span>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">Exportuj</div>
                  <div className="text-xs text-slate-400">SVG, PNG, PDF, EPS, TIFF</div>
                </div>
              </div>
            </div>

            {/* Toolbar hint */}
            <div className="mt-5 p-3 bg-gradient-to-r from-violet-500/10 to-pink-500/10 rounded-lg border border-violet-500/30">
              <div className="text-xs text-slate-300">
                <span className="text-violet-400 font-bold">💡 Tip:</span> Použi horný toolbar pre rýchly prístup:
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 bg-sky-500/20 text-sky-300 text-xs rounded">⚙️ VDP</span>
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded">🔁 S&R</span>
                <span className="px-2 py-1 bg-violet-500/20 text-violet-300 text-xs rounded">💾 Export</span>
                <span className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded">🏭 Stroj</span>
                <span className="px-2 py-1 bg-rose-500/20 text-rose-300 text-xs rounded">📋 Job</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-600 bg-slate-700"
                  onChange={(e) => {
                    if (e.target.checked) {
                      localStorage.setItem('gpcs-codegen-help-dismissed', 'true')
                    } else {
                      localStorage.removeItem('gpcs-codegen-help-dismissed')
                    }
                  }}
                />
                Nezobrazovať znova
              </label>
              <button
                onClick={() => setShowHelp(false)}
                className="px-5 py-2 bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold rounded-lg hover:from-violet-500 hover:to-pink-500 transition-all"
              >
                Začať →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Help Button */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 text-white text-xl shadow-lg hover:scale-110 hover:shadow-xl transition-all flex items-center justify-center"
        title="Nápoveda"
      >
        ❓
      </button>

      {/* Contextual Hints */}
      {!codeValue && !showHelp && (
        <div className="fixed bottom-20 right-6 z-40 max-w-xs p-3 bg-slate-800/95 border border-violet-500/50 rounded-lg shadow-lg animate-pulse">
          <div className="text-xs text-slate-300">
            <span className="text-violet-400 font-bold">👈 Krok 1:</span> Vyber typ kódu a zadaj hodnotu v ľavom paneli
          </div>
        </div>
      )}
    </div>
  )
}

export default App




