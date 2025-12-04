// src/types/barcodeTypes.ts
// Kompletné typy pre profesionálnu etiketovú aplikáciu

// ============================================
// ZÁKLADNÉ TYPY KÓDOV
// ============================================

export type CodeType =
  | 'CODE128'
  | 'EAN13'
  | 'EAN8'
  | 'UPCA'
  | 'UPCE'
  | 'ITF14'
  | 'GS1128'
  | 'GS1DM'
  | 'GS1DATABAR'
  | 'QR'
  | 'DATAMATRIX'
  | 'PDF417'
  | 'CODE39'
  | 'CODE93'
  | 'CODABAR'
  | 'MSI'

export type DataMode = 'PLAIN' | 'GS1_MANUAL' | 'GS1_FORM' | 'VDP_IMPORT'
export type Rotation = 0 | 90 | 180 | 270
export type VdpMode = 'LINEAR' | 'PREFIX' | 'ALPHA' | 'IMPORT'
export type PrintDirection = 'ALONG_WEB' | 'ACROSS_WEB'
export type ReferenceBox = 'TRIM' | 'BLEED' | 'SAFE'

// ============================================
// A. LABEL CANVAS - ETIKETA
// ============================================

export type LabelOrientation = 'HEAD_UP' | 'HEAD_DOWN' | 'HEAD_LEFT' | 'HEAD_RIGHT'

export type LabelPreset = 
  // Štandardné
  | '25x10'
  | '30x15'
  | '40x20'
  | '50x25'
  | '50x30'
  | '60x30'
  | '60x40'
  | '70x40'
  | '80x40'
  | '80x50'
  | '100x50'
  | '100x70'
  | '100x100'
  // Farmaceutické
  | 'PHARMA_VIAL_25x10'
  | 'PHARMA_AMPOULE_30x10'
  | 'PHARMA_BOTTLE_50x30'
  | 'PHARMA_BOX_70x40'
  | 'PHARMA_BLISTER_80x20'
  // Logistické
  | 'GS1_A6_105x148'
  | 'GS1_A5_148x210'
  | 'PALLET_105x148'
  // Custom
  | 'CUSTOM'

export interface LabelPresetConfig {
  id: LabelPreset
  name: string
  category: 'standard' | 'pharma' | 'logistics' | 'custom'
  widthMm: number
  heightMm: number
  defaultBleedMm: number
  defaultSafeMarginMm: number
  description?: string
}

export interface LabelConfig {
  // Rozmery
  widthMm: number
  heightMm: number
  bleedMm: number
  safeMarginMm: number
  cornerRadiusMm: number
  
  // Orientácia
  orientation: LabelOrientation
  printDirection: PrintDirection
  
  // Referenčný box pre umiestnenie
  referenceBox: ReferenceBox
  
  // Zobrazenie zón
  showBleedZone: boolean
  showTrimZone: boolean
  showSafeZone: boolean
  showGrid: boolean
  gridSizeMm: number
}

// ============================================
// B. VRSTVY A OBJEKTY NA ETIKETE
// ============================================

export type LayerType = 
  | 'WHITE_UNDERPRINT'
  | 'BACKGROUND'
  | 'LOGO'
  | 'BARCODE'
  | 'TEXT'
  | 'GRAPHICS'
  | 'VARNISH'

export type ObjectType = 
  | 'barcode'
  | 'text'
  | 'image'
  | 'rectangle'
  | 'line'
  | 'qrcode'

export type HorizontalAlign = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'center' | 'bottom'

export interface SnapPoint {
  id: string
  name: string
  xMm: number
  yMm: number
  reference: ReferenceBox
}

export interface LabelObject {
  id: string
  type: ObjectType
  name: string
  layer: LayerType
  
  // Pozícia (od referenčného bodu)
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
  rotation: Rotation
  
  // Zarovnanie
  horizontalAlign: HorizontalAlign
  verticalAlign: VerticalAlign
  
  // Vzhľad
  fillColor: string
  strokeColor: string
  strokeWidthMm: number
  opacity: number
  
  // Lock/Visibility
  locked: boolean
  visible: boolean
  printable: boolean
  
  // VDP binding
  vdpField?: string
}

export interface BarcodeObject extends LabelObject {
  type: 'barcode'
  codeType: CodeType
  value: string
  
  // Parametre kódu
  xDimMm: number
  barHeightMm: number
  magnificationPercent: number
  barWidthReductionMm: number
  quietZoneMm: number
  
  // HR text
  showHrText: boolean
  hrFontFamily: string
  hrFontSizePt: number
  hrTextColor: string
  hrCustomText?: string
  
  // White box
  whiteBoxEnabled: boolean
  whiteBoxPaddingMm: number
  whiteBoxCornerRadiusMm: number
}

export interface TextObject extends LabelObject {
  type: 'text'
  content: string
  fontFamily: string
  fontSizePt: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  lineHeightPercent: number
  letterSpacingPt: number
  textTransform: 'none' | 'uppercase' | 'lowercase'
}

export interface ImageObject extends LabelObject {
  type: 'image'
  src: string // base64 alebo URL
  fit: 'contain' | 'cover' | 'fill' | 'none'
  clipPath?: string
}

export interface Layer {
  id: string
  type: LayerType
  name: string
  visible: boolean
  locked: boolean
  printable: boolean
  objects: LabelObject[]
  
  // Pre tlač
  colorMode: 'PROCESS' | 'SPOT'
  spotColorName?: string
  overprint: boolean
  knockout: boolean
}

// ============================================
// C. EXPORT A SEPARÁCIE
// ============================================

export type ExportFormat = 'PDF' | 'SVG' | 'PNG' | 'TIFF' | 'EPS'
export type ColorMode = 'CMYK' | 'RGB' | 'GRAYSCALE' | 'SPOT'
export type PdfVersion = '1.4' | '1.5' | '1.6' | '1.7' | 'PDF_X1a' | 'PDF_X3' | 'PDF_X4'

export interface SpotColor {
  name: string
  displayColor: string // RGB pre náhľad
  cmykFallback: { c: number; m: number; y: number; k: number }
  pantone?: string
}

export interface ExportSettings {
  format: ExportFormat
  
  // PDF špecifické
  pdfVersion: PdfVersion
  embedFonts: boolean
  outlineFonts: boolean
  
  // Rozlíšenie (pre raster)
  dpi: number
  
  // Farby
  colorMode: ColorMode
  spotColors: SpotColor[]
  
  // Barcode špecifické
  barcodeColorName: string // napr. 'BARCODE_BLACK' alebo 'Black'
  barcodeAsSpot: boolean
  whiteUnderprint: boolean
  whiteUnderprintSpread: number // mm
  
  // Bleed a marks
  includeBleed: boolean
  includeCropMarks: boolean
  includeRegistrationMarks: boolean
  includeColorBars: boolean
  markOffset: number // mm od trimu
}

export interface SeparationPreview {
  colorName: string
  isSpot: boolean
  previewDataUrl: string
  coverage: number // %
}

// ============================================
// D. STEP & REPEAT
// ============================================

export type StepRepeatMode = 'WEB' | 'SHEET'
export type StaggerMode = 'NONE' | 'HALF' | 'THIRD' | 'CUSTOM'

export interface WebStepRepeat {
  mode: 'WEB'
  
  // Parametre pásu
  webWidthMm: number
  repeatLengthMm: number
  
  // Rozloženie
  lanes: number
  rows: number
  horizontalGapMm: number
  verticalGapMm: number
  
  // Stagger
  staggerMode: StaggerMode
  customStaggerMm?: number
  
  // Okraje
  leftMarginMm: number
  rightMarginMm: number
  leadingEdgeMm: number
  trailingEdgeMm: number
  
  // Registračné značky
  includeEyeMark: boolean
  eyeMarkPositionMm: number
  eyeMarkWidthMm: number
  eyeMarkHeightMm: number
  
  includeRegistrationMarks: boolean
  includeColorBar: boolean
  includeMicrotext: boolean
  microtextContent: string
}

export interface SheetStepRepeat {
  mode: 'SHEET'
  
  // Rozmery hárku
  sheetWidthMm: number
  sheetHeightMm: number
  
  // Rozloženie
  columns: number
  rows: number
  horizontalGapMm: number
  verticalGapMm: number
  
  // Okraje
  topMarginMm: number
  bottomMarginMm: number
  leftMarginMm: number
  rightMarginMm: number
  
  // Orezové značky
  includeCropMarks: boolean
  cropMarkLength: number
  cropMarkOffset: number
  
  // Registrácia
  includeRegistrationMarks: boolean
  includeColorBar: boolean
  colorBarPosition: 'top' | 'bottom' | 'left' | 'right'
}

export type StepRepeatConfig = WebStepRepeat | SheetStepRepeat

// ============================================
// E. VDP PRINT RUN
// ============================================

export type VdpFieldMapping =
  | null
  | 'SERIAL'
  | 'LOT'
  | 'GTIN'
  | 'BEST_BEFORE'
  | 'PROD_DATE'
  | 'USE_BY'
  | 'VARIANT'
  | 'QUANTITY'
  | 'CUSTOM'

export interface VdpImportColumn {
  columnIndex: number
  columnName: string
  mappedTo: VdpFieldMapping
}

export interface VdpImportRow {
  rowIndex: number
  values: Record<string, string>
  generatedCode: string
  warnings?: string[]
  errors?: string[]
  isValid?: boolean
}

export interface VdpImportState {
  fileName: string | null
  columns: VdpImportColumn[]
  rows: VdpImportRow[]
  currentRowIndex: number
  totalRows: number
  patternTemplate: string
  fieldMapping?: Record<string, string> // CSV column -> template field
}

export interface VdpLaneConfig {
  laneId: number
  startIndex: number
  endIndex: number
  prefix?: string
  serialStart?: number
}

export interface VdpPrintRun {
  // Zdroj dát
  source: 'SERIAL' | 'CSV'
  
  // Serial generovanie
  serialStart: number
  serialEnd: number
  serialPadding: number
  serialPrefix: string
  
  // CSV import
  csvData?: VdpImportState
  
  // Lane konfigurácia
  useLanes: boolean
  laneConfigs: VdpLaneConfig[]
  
  // Validácia
  validateBeforeExport: boolean
  stopOnError: boolean
  
  // Náhľad
  previewIndices: number[] // napr. [0, 1, 9, -1] pre prvé 2, 10. a posledný
}

export interface VdpValidationResult {
  index: number
  value: string
  isValid: boolean
  warnings: string[]
  errors: string[]
  gs1Compliance?: 'A' | 'B' | 'C' | 'D' | 'FAIL'
}

export interface VdpExportOptions {
  outputMode: 'MULTI_PAGE_PDF' | 'STEP_REPEAT_PDF' | 'INDIVIDUAL_FILES'
  
  // Multi-page
  labelsPerPage: number
  
  // Step & repeat
  stepRepeatConfig?: StepRepeatConfig
  
  // Naming
  fileNamePattern: string // napr. "label_{INDEX}_{VALUE}"
  
  // Report
  generateJobReport: boolean
}

// ============================================
// F. STROJOVÉ NASTAVENIA
// ============================================

export type MachineType = 'FLEXO' | 'OFFSET' | 'DIGITAL' | 'LETTERPRESS' | 'GRAVURE' | 'SCREEN'

export interface MachinePreset {
  id: string
  name: string
  manufacturer: string
  model: string
  type: MachineType
  
  // Pracovné rozmery
  minWebWidthMm: number
  maxWebWidthMm: number
  minRepeatLengthMm: number
  maxRepeatLengthMm: number
  
  // Tlačové parametre
  minXDimMm: number
  preferredMagnifications: number[]
  maxLpi: number
  nativeDpi: number
  
  // Farby
  maxColors: number
  hasWhiteUnit: boolean
  hasVarnishUnit: boolean
  
  // Distortion kompenzácia
  defaultDistortionPercent: number
  distortionDirection: 'WEB' | 'CROSS' | 'BOTH'
  
  // Poznámky
  notes: string[]
}

export interface DistortionSettings {
  enabled: boolean
  webDirectionPercent: number // % roztiahnutia v smere pásu
  crossDirectionPercent: number // % roztiahnutia priečne
  previewDistorted: boolean
}

// ============================================
// G. JOB TICKET / REPORT
// ============================================

export interface JobTicket {
  // Identifikácia
  jobId: string
  jobName: string
  customerName: string
  createdAt: Date
  createdBy: string
  
  // Etiketa
  labelConfig: LabelConfig
  presetUsed: LabelPreset
  
  // Kód
  codeType: CodeType
  codeValue: string
  magnificationPercent: number
  xDimMm: number
  barWidthReductionMm: number
  
  // Materiál
  substrate: string
  adhesive?: string
  liner?: string
  
  // Tlač
  machinePreset?: MachinePreset
  printingProfile: string
  colors: string[]
  hasWhiteUnderprint: boolean
  
  // Množstvo
  totalQuantity: number
  labelsPerRepeat: number
  totalRepeats: number
  totalMeters: number
  waste: number // %
  
  // VDP
  vdpEnabled: boolean
  vdpSource?: 'SERIAL' | 'CSV'
  vdpRange?: string
  vdpVersionCount?: number
  
  // Poznámky
  productionNotes: string[]
  qualityNotes: string[]
}

// ============================================
// APLIKAČNÝ STAV
// ============================================

export interface AppState {
  // Etiketa
  labelConfig: LabelConfig
  currentPreset: LabelPreset
  
  // Vrstvy a objekty
  layers: Layer[]
  selectedObjectId: string | null
  selectedLayerId: string | null
  
  // Aktívny kód (hlavný barcode)
  activeBarcodeId: string | null
  
  // Export
  exportSettings: ExportSettings
  
  // Step & Repeat
  stepRepeatConfig: StepRepeatConfig
  
  // VDP
  vdpPrintRun: VdpPrintRun
  
  // Stroj
  selectedMachine: MachinePreset | null
  distortionSettings: DistortionSettings
  
  // UI
  zoom: number
  showRulers: boolean
  snapToGrid: boolean
  snapToObjects: boolean
}

// ============================================
// KONŠTANTY
// ============================================

export const LABEL_PRESETS_CONFIG: LabelPresetConfig[] = [
  // Štandardné
  { id: '25x10', name: '25 × 10 mm', category: 'standard', widthMm: 25, heightMm: 10, defaultBleedMm: 1, defaultSafeMarginMm: 1 },
  { id: '30x15', name: '30 × 15 mm', category: 'standard', widthMm: 30, heightMm: 15, defaultBleedMm: 1, defaultSafeMarginMm: 1 },
  { id: '40x20', name: '40 × 20 mm', category: 'standard', widthMm: 40, heightMm: 20, defaultBleedMm: 1.5, defaultSafeMarginMm: 2 },
  { id: '50x25', name: '50 × 25 mm', category: 'standard', widthMm: 50, heightMm: 25, defaultBleedMm: 2, defaultSafeMarginMm: 2 },
  { id: '50x30', name: '50 × 30 mm', category: 'standard', widthMm: 50, heightMm: 30, defaultBleedMm: 2, defaultSafeMarginMm: 2 },
  { id: '60x30', name: '60 × 30 mm', category: 'standard', widthMm: 60, heightMm: 30, defaultBleedMm: 2, defaultSafeMarginMm: 2 },
  { id: '60x40', name: '60 × 40 mm', category: 'standard', widthMm: 60, heightMm: 40, defaultBleedMm: 2, defaultSafeMarginMm: 2 },
  { id: '70x40', name: '70 × 40 mm', category: 'standard', widthMm: 70, heightMm: 40, defaultBleedMm: 2, defaultSafeMarginMm: 3 },
  { id: '80x40', name: '80 × 40 mm', category: 'standard', widthMm: 80, heightMm: 40, defaultBleedMm: 2, defaultSafeMarginMm: 3 },
  { id: '80x50', name: '80 × 50 mm', category: 'standard', widthMm: 80, heightMm: 50, defaultBleedMm: 2, defaultSafeMarginMm: 3 },
  { id: '100x50', name: '100 × 50 mm', category: 'standard', widthMm: 100, heightMm: 50, defaultBleedMm: 2, defaultSafeMarginMm: 3 },
  { id: '100x70', name: '100 × 70 mm', category: 'standard', widthMm: 100, heightMm: 70, defaultBleedMm: 2, defaultSafeMarginMm: 3 },
  { id: '100x100', name: '100 × 100 mm', category: 'standard', widthMm: 100, heightMm: 100, defaultBleedMm: 2, defaultSafeMarginMm: 3 },
  
  // Farmaceutické
  { id: 'PHARMA_VIAL_25x10', name: 'Vial 25 × 10 mm', category: 'pharma', widthMm: 25, heightMm: 10, defaultBleedMm: 0.5, defaultSafeMarginMm: 1, description: 'Pre malé injekčné ampulky' },
  { id: 'PHARMA_AMPOULE_30x10', name: 'Ampulka 30 × 10 mm', category: 'pharma', widthMm: 30, heightMm: 10, defaultBleedMm: 0.5, defaultSafeMarginMm: 1, description: 'Pre ampulky' },
  { id: 'PHARMA_BOTTLE_50x30', name: 'Fľaška 50 × 30 mm', category: 'pharma', widthMm: 50, heightMm: 30, defaultBleedMm: 1, defaultSafeMarginMm: 2, description: 'Pre fľaše s liekmi' },
  { id: 'PHARMA_BOX_70x40', name: 'Krabička 70 × 40 mm', category: 'pharma', widthMm: 70, heightMm: 40, defaultBleedMm: 1.5, defaultSafeMarginMm: 2, description: 'Pre farmaceutické krabičky' },
  { id: 'PHARMA_BLISTER_80x20', name: 'Blister 80 × 20 mm', category: 'pharma', widthMm: 80, heightMm: 20, defaultBleedMm: 1, defaultSafeMarginMm: 1.5, description: 'Pre blister obaly' },
  
  // Logistické
  { id: 'GS1_A6_105x148', name: 'GS1 A6 (105 × 148 mm)', category: 'logistics', widthMm: 105, heightMm: 148, defaultBleedMm: 3, defaultSafeMarginMm: 5, description: 'Štandardná logistická etiketa' },
  { id: 'GS1_A5_148x210', name: 'GS1 A5 (148 × 210 mm)', category: 'logistics', widthMm: 148, heightMm: 210, defaultBleedMm: 3, defaultSafeMarginMm: 5, description: 'Veľká logistická etiketa' },
  { id: 'PALLET_105x148', name: 'Paleta 105 × 148 mm', category: 'logistics', widthMm: 105, heightMm: 148, defaultBleedMm: 3, defaultSafeMarginMm: 5, description: 'Paletová etiketa' },
  
  // Custom
  { id: 'CUSTOM', name: 'Vlastný rozmer', category: 'custom', widthMm: 50, heightMm: 30, defaultBleedMm: 2, defaultSafeMarginMm: 2 },
]

export const DEFAULT_SPOT_COLORS: SpotColor[] = [
  { name: 'BARCODE_BLACK', displayColor: '#000000', cmykFallback: { c: 0, m: 0, y: 0, k: 100 } },
  { name: 'WHITE', displayColor: '#FFFFFF', cmykFallback: { c: 0, m: 0, y: 0, k: 0 }, pantone: 'White' },
  { name: 'GOLD', displayColor: '#FFD700', cmykFallback: { c: 0, m: 20, y: 80, k: 10 }, pantone: '871 C' },
  { name: 'SILVER', displayColor: '#C0C0C0', cmykFallback: { c: 0, m: 0, y: 0, k: 30 }, pantone: '877 C' },
]

export const DEFAULT_MACHINE_PRESETS: MachinePreset[] = [
  {
    id: 'omet_x6',
    name: 'OMET X6',
    manufacturer: 'OMET',
    model: 'X6',
    type: 'FLEXO',
    minWebWidthMm: 250,
    maxWebWidthMm: 430,
    minRepeatLengthMm: 254,
    maxRepeatLengthMm: 610,
    minXDimMm: 0.264,
    preferredMagnifications: [80, 100, 120, 150, 200],
    maxLpi: 175,
    nativeDpi: 2540,
    maxColors: 10,
    hasWhiteUnit: true,
    hasVarnishUnit: true,
    defaultDistortionPercent: 0.3,
    distortionDirection: 'WEB',
    notes: ['UV flexo', 'Servo pohony', 'Automatický register'],
  },
  {
    id: 'gallus_rcs430',
    name: 'Gallus RCS 430',
    manufacturer: 'Gallus',
    model: 'RCS 430',
    type: 'FLEXO',
    minWebWidthMm: 165,
    maxWebWidthMm: 430,
    minRepeatLengthMm: 292,
    maxRepeatLengthMm: 508,
    minXDimMm: 0.264,
    preferredMagnifications: [80, 100, 120, 150],
    maxLpi: 150,
    nativeDpi: 2540,
    maxColors: 8,
    hasWhiteUnit: true,
    hasVarnishUnit: true,
    defaultDistortionPercent: 0.25,
    distortionDirection: 'WEB',
    notes: ['Modulárna konštrukcia', 'Quick-change sleeves'],
  },
  {
    id: 'hp_indigo_6900',
    name: 'HP Indigo 6900',
    manufacturer: 'HP',
    model: 'Indigo 6900',
    type: 'DIGITAL',
    minWebWidthMm: 160,
    maxWebWidthMm: 340,
    minRepeatLengthMm: 200,
    maxRepeatLengthMm: 980,
    minXDimMm: 0.254,
    preferredMagnifications: [80, 100, 120],
    maxLpi: 230,
    nativeDpi: 812,
    maxColors: 7,
    hasWhiteUnit: true,
    hasVarnishUnit: false,
    defaultDistortionPercent: 0,
    distortionDirection: 'WEB',
    notes: ['ElectroInk', 'One-shot color', 'Extended gamut'],
  },
  {
    id: 'heidelberg_speedmaster',
    name: 'Heidelberg Speedmaster XL 75',
    manufacturer: 'Heidelberg',
    model: 'Speedmaster XL 75',
    type: 'OFFSET',
    minWebWidthMm: 480,
    maxWebWidthMm: 530,
    minRepeatLengthMm: 340,
    maxRepeatLengthMm: 750,
    minXDimMm: 0.264,
    preferredMagnifications: [80, 100, 120],
    maxLpi: 200,
    nativeDpi: 2540,
    maxColors: 6,
    hasWhiteUnit: false,
    hasVarnishUnit: true,
    defaultDistortionPercent: 0,
    distortionDirection: 'WEB',
    notes: ['Hárková tlač', 'Inline lakovanie'],
  },
  {
    id: 'zebra_zt411',
    name: 'Zebra ZT411',
    manufacturer: 'Zebra',
    model: 'ZT411',
    type: 'DIGITAL',
    minWebWidthMm: 25,
    maxWebWidthMm: 114,
    minRepeatLengthMm: 6,
    maxRepeatLengthMm: 991,
    minXDimMm: 0.380,
    preferredMagnifications: [100, 120, 150],
    maxLpi: 0,
    nativeDpi: 300,
    maxColors: 1,
    hasWhiteUnit: false,
    hasVarnishUnit: false,
    defaultDistortionPercent: 0,
    distortionDirection: 'WEB',
    notes: ['Thermal transfer', '300 DPI', 'Desktop tlačiareň'],
  },
]
