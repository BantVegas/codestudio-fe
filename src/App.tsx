import React, { useMemo, useRef, useState } from 'react'
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
import { LabelCanvas } from './components/LabelCanvas/LabelCanvas'
import { StepRepeatPanel } from './components/StepRepeatPanel/StepRepeatPanel'
import { ExportPanel } from './components/ExportPanel/ExportPanel'
import { MachinePresetsPanel } from './components/MachinePresetsPanel/MachinePresetsPanel'
import { JobTicketPanel } from './components/JobTicketPanel/JobTicketPanel'
import { LoginPage } from './components/LoginPage/LoginPage'

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
} from './types/barcodeTypes'

const App: React.FC = () => {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false)

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
   * BACKEND VALIDÁCIA (lokálny stub)
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
      // zatiaľ len lokálny stub – backend validáciu sme pripravili
      setServerMessage('Lokálna validácia prebehla – formát vyzerá v poriadku.')
    } catch (e) {
      setServerError(
        e instanceof Error ? e.message : 'Neznáma chyba pri validácii.',
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
  const [layers, setLayers] = useState<Layer[]>([
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
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [showRulers, setShowRulers] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [snapToObjects, setSnapToObjects] = useState(true)
  const [distortionSettings, setDistortionSettings] = useState<DistortionSettings>({
    enabled: false,
    webDirectionPercent: 0,
    crossDirectionPercent: 0,
    previewDistorted: false,
  })

  // Canvas zobrazenie zón
  const [showBleedZone, setShowBleedZone] = useState(true)
  const [showTrimZone, setShowTrimZone] = useState(true)
  const [showSafeZone, setShowSafeZone] = useState(true)
  const [showCanvasGrid, setShowCanvasGrid] = useState(true)
  const [canvasGridSizeMm, setCanvasGridSizeMm] = useState(1)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [labelOrientation, setLabelOrientation] = useState<import('./types/barcodeTypes').LabelOrientation>('HEAD_UP')

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
  const [selectedMachinePreset, setSelectedMachinePreset] = useState<MachinePreset | null>(null)

  // Job Ticket
  const [showJobTicket, setShowJobTicket] = useState(false)
  const jobId = `JOB-${Date.now().toString(36).toUpperCase()}`

  // Presety etikiet
  const LABEL_PRESETS_CONFIG = [
    { id: '50x30', name: '50×30 mm', w: 50, h: 30, category: 'standard' },
    { id: '80x50', name: '80×50 mm', w: 80, h: 50, category: 'standard' },
    { id: '100x70', name: '100×70 mm', w: 100, h: 70, category: 'standard' },
    { id: '100x100', name: '100×100 mm', w: 100, h: 100, category: 'standard' },
    { id: 'PHARMA_VIAL_25x10', name: 'Pharma Vial 25×10', w: 25, h: 10, category: 'pharma' },
    { id: 'PHARMA_BOTTLE_50x30', name: 'Pharma Bottle 50×30', w: 50, h: 30, category: 'pharma' },
    { id: 'PHARMA_BOX_70x40', name: 'Pharma Box 70×40', w: 70, h: 40, category: 'pharma' },
    { id: 'GS1_A6_105x148', name: 'GS1 A6 (105×148)', w: 105, h: 148, category: 'logistics' },
    { id: 'PALLET_105x148', name: 'Pallet Label', w: 105, h: 148, category: 'logistics' },
    { id: 'CUSTOM', name: 'Vlastný rozmer', w: labelWidthMm, h: labelHeightMm, category: 'custom' },
  ] as const

  const handlePresetChange = (presetId: string) => {
    const preset = LABEL_PRESETS_CONFIG.find(p => p.id === presetId)
    if (preset && presetId !== 'CUSTOM') {
      setLabelWidthMm(preset.w)
      setLabelHeightMm(preset.h)
    }
    setLabelPreset(presetId as import('./types/barcodeTypes').LabelPreset)
  }

  // Pridávanie objektov
  const addBarcodeObject = () => {
    const newObj: import('./types/barcodeTypes').BarcodeObject = {
      id: `barcode_${Date.now()}`,
      type: 'barcode',
      name: 'Barcode',
      layer: 'BARCODE',
      xMm: safeMarginMm,
      yMm: safeMarginMm,
      widthMm: 30,
      heightMm: 15,
      rotation: 0,
      horizontalAlign: 'left',
      verticalAlign: 'top',
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidthMm: 0,
      opacity: 1,
      locked: false,
      visible: true,
      printable: true,
      codeType: codeType,
      value: codeValue || '123456789012',
      xDimMm: xDimMm,
      barHeightMm: 15,
      magnificationPercent: magnificationPercent,
      barWidthReductionMm: barWidthReductionMm,
      quietZoneMm: quietZoneMm,
      showHrText: showHrText,
      hrFontFamily: 'OCR-B',
      hrFontSizePt: hrFontSizePt,
      hrTextColor: '#000000',
      whiteBoxEnabled: true,
      whiteBoxPaddingMm: 1,
      whiteBoxCornerRadiusMm: 0.5,
    }
    setLayers(prev => prev.map(layer =>
      layer.id === 'layer_barcode'
        ? { ...layer, objects: [...layer.objects, newObj] }
        : layer
    ))
    setSelectedObjectId(newObj.id)
  }

  const addTextObject = () => {
    const newObj: import('./types/barcodeTypes').TextObject = {
      id: `text_${Date.now()}`,
      type: 'text',
      name: 'Text',
      layer: 'TEXT',
      xMm: safeMarginMm,
      yMm: labelHeightMm - safeMarginMm - 5,
      widthMm: 40,
      heightMm: 5,
      rotation: 0,
      horizontalAlign: 'left',
      verticalAlign: 'top',
      fillColor: '#000000',
      strokeColor: 'transparent',
      strokeWidthMm: 0,
      opacity: 1,
      locked: false,
      visible: true,
      printable: true,
      content: 'Sample Text',
      fontFamily: 'Arial',
      fontSizePt: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      lineHeightPercent: 120,
      letterSpacingPt: 0,
      textTransform: 'none',
    }
    setLayers(prev => prev.map(layer =>
      layer.id === 'layer_text'
        ? { ...layer, objects: [...layer.objects, newObj] }
        : layer
    ))
    setSelectedObjectId(newObj.id)
  }

  const addImageObject = () => {
    const newObj: import('./types/barcodeTypes').ImageObject = {
      id: `image_${Date.now()}`,
      type: 'image',
      name: 'Logo',
      layer: 'LOGO',
      xMm: labelWidthMm - safeMarginMm - 15,
      yMm: safeMarginMm,
      widthMm: 15,
      heightMm: 15,
      rotation: 0,
      horizontalAlign: 'right',
      verticalAlign: 'top',
      fillColor: 'transparent',
      strokeColor: 'transparent',
      strokeWidthMm: 0,
      opacity: 1,
      locked: false,
      visible: true,
      printable: true,
      src: '',
      fit: 'contain',
    }
    setLayers(prev => prev.map(layer =>
      layer.id === 'layer_logo'
        ? { ...layer, objects: [...layer.objects, newObj] }
        : layer
    ))
    setSelectedObjectId(newObj.id)
  }

  // Nájsť vybraný objekt
  const selectedObject = layers.flatMap(l => l.objects).find(o => o.id === selectedObjectId)
  const selectedLayer = layers.find(l => l.objects.some(o => o.id === selectedObjectId))

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

  const handleUpdateObject = (
    layerId: string,
    objectId: string,
    updates: Partial<import('./types/barcodeTypes').LabelObject>,
  ) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === layerId
          ? {
              ...layer,
              objects: layer.objects.map(obj =>
                obj.id === objectId ? { ...obj, ...updates } : obj,
              ),
            }
          : layer,
      ),
    )
  }

  /* =====================
   * REFS
   * ===================== */
  const svgRef = useRef<SVGSVGElement | null>(null)
  const previewWrapperRef = useRef<HTMLDivElement | null>(null)

  /* =====================
   * RENDER
   * ===================== */
  
  // Ak nie je prihlásený, zobraz login stránku
  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-[700px] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                Tlač &amp; VDP nastavenia
              </h2>
              <button
                type="button"
                onClick={() => setShowGraphicTools(false)}
                className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:border-red-500 hover:text-red-300"
              >
                Zavrieť ✕
              </button>
            </div>
            {/* Modal content */}
            <div className="p-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[400px] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-200">Canvas nastavenia</h2>
              <button
                type="button"
                onClick={() => setShowCanvasSettings(false)}
                className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:border-red-500"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 p-4">
              {/* Distortion */}
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <label className="mb-2 flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={distortionSettings.enabled}
                    onChange={e => setDistortionSettings(s => ({ ...s, enabled: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  Povoliť distortion kompenzáciu (flexo)
                </label>
                {distortionSettings.enabled && (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-400">Web smer (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={distortionSettings.webDirectionPercent}
                        onChange={e => setDistortionSettings(s => ({ ...s, webDirectionPercent: parseFloat(e.target.value) || 0 }))}
                        className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-400">Cross smer (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={distortionSettings.crossDirectionPercent}
                        onChange={e => setDistortionSettings(s => ({ ...s, crossDirectionPercent: parseFloat(e.target.value) || 0 }))}
                        className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Grid size */}
              <div>
                <label className="mb-1 block text-xs text-slate-400">Grid veľkosť (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={canvasGridSizeMm}
                  onChange={e => setCanvasGridSizeMm(parseFloat(e.target.value) || 1)}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowCanvasSettings(false)}
                className="w-full rounded bg-sky-600 py-2 text-xs font-medium text-white hover:bg-sky-500"
              >
                Hotovo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Step & Repeat */}
      {showStepRepeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-[800px] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-200">Step & Repeat Layout</h2>
              <button
                type="button"
                onClick={() => setShowStepRepeat(false)}
                className="rounded border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:border-red-500"
              >
                Zavrieť ✕
              </button>
            </div>
            <div className="p-4">
              <StepRepeatPanel
                config={stepRepeatConfig}
                onUpdateConfig={setStepRepeatConfig}
                labelConfig={labelConfig}
                onGenerateLayout={() => console.log('Generate layout')}
                onExportLayout={() => console.log('Export layout')}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Export */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-[700px] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-200">Export etikety</h2>
              <button
                type="button"
                onClick={() => setShowExport(false)}
                className="rounded border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:border-red-500"
              >
                Zavrieť ✕
              </button>
            </div>
            <div className="p-4">
              <ExportPanel
                exportSettings={exportSettings}
                onUpdateSettings={(updates) => setExportSettings(prev => ({ ...prev, ...updates }))}
                labelConfig={labelConfig}
                layers={layers}
                onExport={(settings) => {
                  console.log('Export with settings:', settings)
                  setShowExport(false)
                }}
                onGenerateSeparationPreview={() => {
                  const previews: SeparationPreview[] = [
                    { colorName: 'Cyan', isSpot: false, previewDataUrl: '', coverage: 15 },
                    { colorName: 'Magenta', isSpot: false, previewDataUrl: '', coverage: 8 },
                    { colorName: 'Yellow', isSpot: false, previewDataUrl: '', coverage: 5 },
                    { colorName: 'Black', isSpot: false, previewDataUrl: '', coverage: 45 },
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-[500px] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-200">Strojové nastavenia</h2>
              <button
                type="button"
                onClick={() => setShowMachinePresets(false)}
                className="rounded border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:border-red-500"
              >
                Zavrieť ✕
              </button>
            </div>
            <div className="p-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-[600px] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-200">Job Ticket / Report</h2>
              <button
                type="button"
                onClick={() => setShowJobTicket(false)}
                className="rounded border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:border-red-500"
              >
                Zavrieť ✕
              </button>
            </div>
            <div className="p-4">
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
                onGenerateReport={() => console.log('Generate report')}
                onPrint={() => console.log('Print')}
              />
            </div>
          </div>
        </div>
      )}

      {/* stred + náhľad */}
      <div className="flex flex-1 gap-6 px-6 py-6">
        <div className="flex flex-1 flex-col gap-2">
          {/* Canvas Toolbar */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
            {/* Tlač & VDP */}
            <button
              type="button"
              onClick={() => setShowGraphicTools(true)}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-200 hover:border-sky-500"
            >
              ⚙️ Tlač &amp; VDP
            </button>
            <button
              type="button"
              onClick={() => setShowStepRepeat(true)}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-200 hover:border-emerald-500"
            >
              🔁 Step & Repeat
            </button>
            <button
              type="button"
              onClick={() => setShowExport(true)}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-200 hover:border-violet-500"
            >
              💾 Export
            </button>
            <button
              type="button"
              onClick={() => setShowMachinePresets(true)}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-200 hover:border-amber-500"
            >
              🏭 Stroj
            </button>
            <button
              type="button"
              onClick={() => setShowJobTicket(true)}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-200 hover:border-rose-500"
            >
              📋 Job Ticket
            </button>

            <div className="h-4 w-px bg-slate-700" />

            {/* Zóny */}
            <div className="flex items-center gap-1 text-[10px]">
              <label className="flex items-center gap-1 text-slate-400">
                <input type="checkbox" checked={showBleedZone} onChange={e => setShowBleedZone(e.target.checked)} className="h-3 w-3" />
                Bleed
              </label>
              <label className="flex items-center gap-1 text-slate-400">
                <input type="checkbox" checked={showTrimZone} onChange={e => setShowTrimZone(e.target.checked)} className="h-3 w-3" />
                Trim
              </label>
              <label className="flex items-center gap-1 text-slate-400">
                <input type="checkbox" checked={showSafeZone} onChange={e => setShowSafeZone(e.target.checked)} className="h-3 w-3" />
                Safe
              </label>
              <label className="flex items-center gap-1 text-slate-400">
                <input type="checkbox" checked={showCanvasGrid} onChange={e => setShowCanvasGrid(e.target.checked)} className="h-3 w-3" />
                Grid
              </label>
              <label className="flex items-center gap-1 text-slate-400">
                <input type="checkbox" checked={showRulers} onChange={e => setShowRulers(e.target.checked)} className="h-3 w-3" />
                Rulers
              </label>
            </div>

            <div className="h-4 w-px bg-slate-700" />

            {/* Orientácia */}
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-slate-500">Orientácia:</span>
              <select
                value={labelOrientation}
                onChange={e => setLabelOrientation(e.target.value as import('./types/barcodeTypes').LabelOrientation)}
                className="rounded border border-slate-600 bg-slate-800 px-1 py-0.5 text-[10px] text-slate-200"
              >
                <option value="HEAD_UP">Head Up ↑</option>
                <option value="HEAD_DOWN">Head Down ↓</option>
                <option value="HEAD_LEFT">Head Left ←</option>
                <option value="HEAD_RIGHT">Head Right →</option>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-700" />

            {/* Zoom */}
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-slate-500">Zoom:</span>
              <button onClick={() => setCanvasZoom(z => Math.max(0.25, z - 0.25))} className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-slate-300 hover:bg-slate-700">−</button>
              <span className="w-10 text-center text-slate-200">{Math.round(canvasZoom * 100)}%</span>
              <button onClick={() => setCanvasZoom(z => Math.min(3, z + 0.25))} className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-slate-300 hover:bg-slate-700">+</button>
            </div>

            <div className="h-4 w-px bg-slate-700" />

            {/* Snapping */}
            <div className="flex items-center gap-1 text-[10px]">
              <label className="flex items-center gap-1 text-slate-400">
                <input type="checkbox" checked={snapToGrid} onChange={e => setSnapToGrid(e.target.checked)} className="h-3 w-3" />
                Snap Grid
              </label>
              <label className="flex items-center gap-1 text-slate-400">
                <input type="checkbox" checked={snapToObjects} onChange={e => setSnapToObjects(e.target.checked)} className="h-3 w-3" />
                Snap Obj
              </label>
            </div>

            <div className="h-4 w-px bg-slate-700" />

            {/* Distortion */}
            <button
              type="button"
              onClick={() => setShowCanvasSettings(true)}
              className={`rounded border px-2 py-1 text-[10px] ${distortionSettings.enabled ? 'border-amber-500 bg-amber-500/20 text-amber-300' : 'border-slate-600 bg-slate-800 text-slate-300'}`}
            >
              Distortion {distortionSettings.enabled ? `${distortionSettings.webDirectionPercent}%` : 'OFF'}
            </button>
          </div>

          {/* Druhý riadok: Presety + Pridávanie objektov */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
            {/* Preset etikety */}
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-slate-500">Etiketa:</span>
              <select
                value={labelPreset}
                onChange={e => handlePresetChange(e.target.value)}
                className="rounded border border-slate-600 bg-slate-800 px-1 py-0.5 text-[10px] text-slate-200"
              >
                <optgroup label="Štandardné">
                  {LABEL_PRESETS_CONFIG.filter(p => p.category === 'standard').map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Farmaceutické">
                  {LABEL_PRESETS_CONFIG.filter(p => p.category === 'pharma').map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Logistické">
                  {LABEL_PRESETS_CONFIG.filter(p => p.category === 'logistics').map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Vlastné">
                  <option value="CUSTOM">Vlastný rozmer</option>
                </optgroup>
              </select>
              {labelPreset === 'CUSTOM' && (
                <>
                  <input
                    type="number"
                    value={labelWidthMm}
                    onChange={e => setLabelWidthMm(parseFloat(e.target.value) || 50)}
                    className="w-12 rounded border border-slate-600 bg-slate-900 px-1 py-0.5 text-[10px] text-slate-200"
                  />
                  <span className="text-slate-500">×</span>
                  <input
                    type="number"
                    value={labelHeightMm}
                    onChange={e => setLabelHeightMm(parseFloat(e.target.value) || 30)}
                    className="w-12 rounded border border-slate-600 bg-slate-900 px-1 py-0.5 text-[10px] text-slate-200"
                  />
                  <span className="text-slate-500">mm</span>
                </>
              )}
            </div>

            <div className="h-4 w-px bg-slate-700" />

            {/* Pridávanie objektov */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500">Pridať:</span>
              <button
                type="button"
                onClick={addBarcodeObject}
                className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:border-green-500 hover:text-green-300"
              >
                + Barcode
              </button>
              <button
                type="button"
                onClick={addTextObject}
                className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:border-blue-500 hover:text-blue-300"
              >
                + Text
              </button>
              <button
                type="button"
                onClick={addImageObject}
                className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:border-purple-500 hover:text-purple-300"
              >
                + Logo
              </button>
            </div>

            <div className="h-4 w-px bg-slate-700" />

            {/* Info o vybraný objekt */}
            {selectedObject && selectedLayer && (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-400">Vybrané:</span>
                <span className="font-medium text-sky-300">{selectedObject.name}</span>
                <span className="text-slate-500">X:</span>
                <input
                  type="number"
                  step="0.5"
                  value={selectedObject.xMm}
                  onChange={e => handleUpdateObject(selectedLayer.id, selectedObject.id, { xMm: parseFloat(e.target.value) || 0 })}
                  className="w-12 rounded border border-slate-600 bg-slate-900 px-1 py-0.5 text-[10px] text-slate-200"
                />
                <span className="text-slate-500">Y:</span>
                <input
                  type="number"
                  step="0.5"
                  value={selectedObject.yMm}
                  onChange={e => handleUpdateObject(selectedLayer.id, selectedObject.id, { yMm: parseFloat(e.target.value) || 0 })}
                  className="w-12 rounded border border-slate-600 bg-slate-900 px-1 py-0.5 text-[10px] text-slate-200"
                />
                <span className="text-slate-500">mm</span>
                <button
                  type="button"
                  onClick={() => setSelectedObjectId(null)}
                  className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-slate-400 hover:border-red-500 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Label Canvas */}
          <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-900/70 p-2">
            <LabelCanvas
              labelConfig={labelConfig}
              layers={layers}
              selectedObjectId={selectedObjectId}
              onSelectObject={setSelectedObjectId}
              onUpdateObject={handleUpdateObject}
              distortionSettings={distortionSettings}
              zoom={canvasZoom}
              showRulers={showRulers}
              snapToGrid={snapToGrid}
              snapToObjects={snapToObjects}
            />
          </div>
        </div>

        {/* pravý panel – väčší náhľad */}
        <div className="flex w-[600px] shrink-0">
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
    </div>
  )
}

export default App



