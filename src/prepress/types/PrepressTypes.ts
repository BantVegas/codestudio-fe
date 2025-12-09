/**
 * GPCS CodeStudio - Prepress Type Definitions
 * 
 * Comprehensive types for professional prepress workflow
 * Compatible with ESKO, Hybrid, and industry standards
 */

// ============================================
// PDF DOCUMENT STRUCTURE
// ============================================

export interface PDFDocumentInfo {
  id: string
  filename: string
  filepath?: string
  
  // Metadata
  title?: string
  author?: string
  creator?: string
  producer?: string
  creationDate?: Date
  modificationDate?: Date
  
  // PDF specifics
  pdfVersion: string
  pageCount: number
  isLinearized: boolean
  isEncrypted: boolean
  hasXFA: boolean
  
  // Prepress metadata
  trapped?: 'True' | 'False' | 'Unknown'
  outputIntent?: OutputIntent
  
  // File info
  fileSize: number
  loadedAt: Date
}

export interface OutputIntent {
  type: 'GTS_PDFX' | 'GTS_PDFA1' | 'ISO_PDFE1' | 'Custom'
  outputCondition?: string
  outputConditionIdentifier?: string
  registryName?: string
  info?: string
  iccProfile?: ICCProfile
}

export interface PDFPage {
  pageNumber: number
  
  // Dimensions (in mm)
  mediaBox: PageBox
  cropBox?: PageBox
  bleedBox?: PageBox
  trimBox?: PageBox
  artBox?: PageBox
  
  // Rotation
  rotation: 0 | 90 | 180 | 270
  
  // Content
  layers: PDFLayer[]
  objects: PDFObject[]
  resources: PDFResources
  
  // Analysis results
  separations: SeparationInfo[]
  spotColors: SpotColorInfo[]
  inkCoverage?: InkCoverageResult
  
  // Rendered preview
  thumbnail?: string // Base64 data URL
  previewCanvas?: HTMLCanvasElement
}

export interface PageBox {
  x: number
  y: number
  width: number
  height: number
}

// ============================================
// PDF LAYERS (Optional Content Groups)
// ============================================

export interface PDFLayer {
  id: string
  name: string
  
  // Visibility
  visible: boolean
  defaultVisible: boolean
  locked: boolean
  printable: boolean
  
  // Layer type detection
  layerType: LayerType
  isSpotColorLayer: boolean
  associatedColor?: string
  
  // Hierarchy
  parentId?: string
  childIds: string[]
  order: number
  
  // Objects in this layer
  objectIds: string[]
}

export type LayerType = 
  | 'ARTWORK'
  | 'WHITE'
  | 'VARNISH'
  | 'DIELINE'
  | 'FOIL'
  | 'EMBOSS'
  | 'BRAILLE'
  | 'TECHNICAL'
  | 'ANNOTATION'
  | 'UNKNOWN'

// ============================================
// PDF OBJECTS
// ============================================

export interface PDFObject {
  id: string
  type: PDFObjectType
  layerId?: string
  
  // Geometry
  bounds: BoundingBox
  transform: TransformMatrix
  
  // Appearance
  fillColor?: ExtendedColor
  strokeColor?: ExtendedColor
  strokeWidth?: number
  
  // Print attributes
  overprint: boolean
  overprintMode: 0 | 1
  knockout: boolean
  blendMode: BlendMode
  opacity: number
  
  // Specific data based on type
  pathData?: PathData
  textData?: TextData
  imageData?: ImageData
  shadingData?: ShadingData
  
  // Clipping
  clipPath?: PathData
  softMask?: SoftMask
  
  // Analysis
  colorAnalysis?: ObjectColorAnalysis
}

export type PDFObjectType = 
  | 'PATH'
  | 'TEXT'
  | 'IMAGE'
  | 'SHADING'
  | 'FORM'
  | 'GROUP'
  | 'ANNOTATION'

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface TransformMatrix {
  a: number  // scale x
  b: number  // skew y
  c: number  // skew x
  d: number  // scale y
  e: number  // translate x
  f: number  // translate y
}

export type BlendMode = 
  | 'Normal'
  | 'Multiply'
  | 'Screen'
  | 'Overlay'
  | 'Darken'
  | 'Lighten'
  | 'ColorDodge'
  | 'ColorBurn'
  | 'HardLight'
  | 'SoftLight'
  | 'Difference'
  | 'Exclusion'
  | 'Hue'
  | 'Saturation'
  | 'Color'
  | 'Luminosity'

// ============================================
// PATH DATA
// ============================================

export interface PathData {
  commands: PathCommand[]
  fillRule: 'nonzero' | 'evenodd'
  closed: boolean
  
  // Stroke properties
  lineCap: 'butt' | 'round' | 'square'
  lineJoin: 'miter' | 'round' | 'bevel'
  miterLimit: number
  dashArray?: number[]
  dashPhase?: number
}

export interface PathCommand {
  type: 'M' | 'L' | 'C' | 'Q' | 'A' | 'Z'
  points: Point[]
}

export interface Point {
  x: number
  y: number
}

// ============================================
// TEXT DATA
// ============================================

export interface TextData {
  content: string
  
  // Font
  fontName: string
  fontFamily?: string
  fontSize: number  // in points
  fontWeight?: number
  fontStyle?: 'normal' | 'italic' | 'oblique'
  
  // Embedded font info
  isEmbedded: boolean
  isSubset: boolean
  fontType: 'Type1' | 'TrueType' | 'OpenType' | 'Type3' | 'CIDFont'
  
  // Text properties
  charSpacing: number
  wordSpacing: number
  horizontalScaling: number
  leading: number
  rise: number
  renderMode: TextRenderMode
  
  // Position
  position: Point
  textMatrix: TransformMatrix
  
  // Glyphs for precise analysis
  glyphs?: GlyphInfo[]
}

export type TextRenderMode = 
  | 0  // Fill
  | 1  // Stroke
  | 2  // Fill + Stroke
  | 3  // Invisible
  | 4  // Fill + Clip
  | 5  // Stroke + Clip
  | 6  // Fill + Stroke + Clip
  | 7  // Clip

export interface GlyphInfo {
  char: string
  unicode: number
  width: number
  position: Point
  advance: number
}

// ============================================
// IMAGE DATA
// ============================================

export interface ImageData {
  width: number
  height: number
  bitsPerComponent: number
  
  // Color space
  colorSpace: ImageColorSpace
  hasAlpha: boolean
  
  // Compression
  filter: ImageFilter[]
  
  // Resolution (calculated from transform)
  effectiveDPI: {
    horizontal: number
    vertical: number
  }
  
  // Image mask
  isMask: boolean
  maskImage?: ImageData
  
  // Decoded data (optional, for analysis)
  decodedData?: Uint8Array
  
  // OPI (Open Prepress Interface)
  opiInfo?: OPIInfo
}

export type ImageColorSpace = 
  | 'DeviceGray'
  | 'DeviceRGB'
  | 'DeviceCMYK'
  | 'CalGray'
  | 'CalRGB'
  | 'Lab'
  | 'ICCBased'
  | 'Indexed'
  | 'Separation'
  | 'DeviceN'
  | 'Pattern'

export type ImageFilter = 
  | 'ASCIIHexDecode'
  | 'ASCII85Decode'
  | 'LZWDecode'
  | 'FlateDecode'
  | 'RunLengthDecode'
  | 'CCITTFaxDecode'
  | 'JBIG2Decode'
  | 'DCTDecode'
  | 'JPXDecode'
  | 'Crypt'

export interface OPIInfo {
  version: string
  filename?: string
  size?: { width: number; height: number }
  cropRect?: BoundingBox
  position?: Point
  resolution?: { x: number; y: number }
}

// ============================================
// SHADING (GRADIENTS)
// ============================================

export interface ShadingData {
  type: ShadingType
  colorSpace: string
  
  // For axial/radial
  coords?: number[]
  
  // Color stops
  stops: GradientStop[]
  
  // Extend
  extend: [boolean, boolean]
  
  // Function
  functionType?: number
}

export type ShadingType = 
  | 1  // Function-based
  | 2  // Axial
  | 3  // Radial
  | 4  // Free-form Gouraud
  | 5  // Lattice-form Gouraud
  | 6  // Coons patch
  | 7  // Tensor-product patch

export interface GradientStop {
  offset: number  // 0-1
  color: ExtendedColor
}

// ============================================
// SOFT MASK
// ============================================

export interface SoftMask {
  type: 'Alpha' | 'Luminosity'
  group: PDFObject[]
  backdrop?: ExtendedColor
  transferFunction?: number[]
}

// ============================================
// EXTENDED COLOR SYSTEM
// ============================================

export interface ExtendedColor {
  space: ColorSpaceType
  
  // Values based on space
  gray?: number           // 0-1 for DeviceGray
  rgb?: RGBValues         // DeviceRGB
  cmyk?: CMYKValues       // DeviceCMYK
  lab?: LABValues         // Lab
  
  // Spot color
  spot?: SpotColorRef
  
  // DeviceN
  deviceN?: DeviceNColor
  
  // Pattern
  pattern?: PatternRef
  
  // ICC
  iccProfile?: string
  iccValues?: number[]
  
  // Tint/opacity
  tint: number            // 0-1
  alpha: number           // 0-1
}

export type ColorSpaceType = 
  | 'DeviceGray'
  | 'DeviceRGB'
  | 'DeviceCMYK'
  | 'CalGray'
  | 'CalRGB'
  | 'Lab'
  | 'ICCBased'
  | 'Separation'
  | 'DeviceN'
  | 'Pattern'
  | 'Indexed'

export interface RGBValues {
  r: number  // 0-1
  g: number  // 0-1
  b: number  // 0-1
}

export interface CMYKValues {
  c: number  // 0-1
  m: number  // 0-1
  y: number  // 0-1
  k: number  // 0-1
}

export interface LABValues {
  l: number  // 0-100
  a: number  // -128 to 127
  b: number  // -128 to 127
}

export interface SpotColorRef {
  name: string
  alternateSpace: 'DeviceCMYK' | 'DeviceRGB' | 'DeviceGray'
  alternateValues: number[]
  tintTransform?: number[]
}

export interface DeviceNColor {
  names: string[]
  alternateSpace: string
  alternateValues: number[]
  tintTransform?: number[]
  attributes?: DeviceNAttributes
}

export interface DeviceNAttributes {
  subtype?: 'DeviceN' | 'NChannel'
  colorants?: Map<string, SpotColorRef>
  process?: {
    colorSpace: string
    components: string[]
  }
}

export interface PatternRef {
  type: 'Tiling' | 'Shading'
  patternId: string
}

// ============================================
// SPOT COLOR LIBRARY
// ============================================

export interface SpotColorInfo {
  name: string
  originalName: string  // As found in PDF
  
  // Alternate representation
  alternateSpace: 'CMYK' | 'RGB' | 'LAB'
  cmykFallback: CMYKValues
  labValue?: LABValues
  
  // Library matching
  libraryMatch?: SpotColorLibraryMatch
  
  // Usage in document
  usageCount: number
  usedInLayers: string[]
  usedInObjects: string[]
  
  // Print order
  printOrder?: number
  isProcessColor: boolean
  
  // Special types
  colorType: SpotColorType
}

export type SpotColorType = 
  | 'STANDARD'      // Normal spot color
  | 'WHITE'         // White ink
  | 'VARNISH'       // Varnish/coating
  | 'METALLIC'      // Metallic ink
  | 'FLUORESCENT'   // Fluorescent ink
  | 'OPAQUE'        // Opaque white/color
  | 'TRANSPARENT'   // Clear varnish
  | 'DIELINE'       // Die/cut line
  | 'TECHNICAL'     // Technical color (registration, etc.)

export interface SpotColorLibraryMatch {
  library: 'PANTONE' | 'HKS' | 'TOYO' | 'DIC' | 'RAL' | 'CUSTOM'
  colorName: string
  colorCode?: string
  deltaE: number
  isExactMatch: boolean
}

// ============================================
// SEPARATION INFO
// ============================================

export interface SeparationInfo {
  name: string
  type: 'PROCESS' | 'SPOT'
  
  // For process colors
  processColor?: 'C' | 'M' | 'Y' | 'K'
  
  // For spot colors
  spotColorInfo?: SpotColorInfo
  
  // Ink properties
  inkDensity: number
  inkSequence: number
  isOpaque: boolean
  
  // Coverage
  coverage: number          // 0-100%
  maxCoverage: number       // Max in any area
  averageCoverage: number
  
  // Objects using this separation
  objectCount: number
  objectIds: string[]
}

// ============================================
// INK COVERAGE
// ============================================

export interface InkCoverageResult {
  pageNumber: number
  
  // Per-separation coverage
  separations: SeparationCoverage[]
  
  // Total Area Coverage
  tac: TACResult
  
  // Coverage map (for visualization)
  coverageMap?: CoverageMap
  
  // Calculation info
  resolution: number  // DPI used for calculation
  calculatedAt: Date
}

export interface SeparationCoverage {
  separationName: string
  
  // Coverage percentages
  totalCoverage: number     // % of page area
  maxCoverage: number       // Maximum in any pixel
  averageCoverage: number   // Average where ink exists
  
  // Area
  inkAreaMm2: number
  totalAreaMm2: number
  
  // Histogram
  histogram?: number[]      // 256 bins
}

export interface TACResult {
  maxTAC: number            // Maximum Total Area Coverage
  averageTAC: number
  
  // Location of max TAC
  maxTACLocation?: Point
  
  // Areas exceeding limits
  areasExceedingLimit: TACExceedance[]
  
  // Limit used
  tacLimit: number
}

export interface TACExceedance {
  location: BoundingBox
  tacValue: number
  separationBreakdown: { name: string; value: number }[]
}

export interface CoverageMap {
  width: number
  height: number
  resolution: number
  
  // Per-separation maps (grayscale values 0-255)
  separationMaps: Map<string, Uint8Array>
  
  // Combined TAC map
  tacMap: Uint8Array
}

// ============================================
// OBJECT COLOR ANALYSIS
// ============================================

export interface ObjectColorAnalysis {
  // Colors used
  fillColors: ExtendedColor[]
  strokeColors: ExtendedColor[]
  
  // Separations affected
  separationsUsed: string[]
  
  // Rich black detection
  isRichBlack: boolean
  richBlackComponents?: CMYKValues
  
  // Registration color
  isRegistration: boolean
  
  // Overprint analysis
  overprintEffect?: OverprintEffect
}

export interface OverprintEffect {
  affectedSeparations: string[]
  resultingColor: ExtendedColor
  knockoutSeparations: string[]
}

// ============================================
// PDF RESOURCES
// ============================================

export interface PDFResources {
  // Fonts
  fonts: Map<string, FontResource>
  
  // Color spaces
  colorSpaces: Map<string, ColorSpaceResource>
  
  // XObjects (images, forms)
  xObjects: Map<string, XObjectResource>
  
  // Patterns
  patterns: Map<string, PatternResource>
  
  // Shadings
  shadings: Map<string, ShadingResource>
  
  // Graphics states
  extGStates: Map<string, ExtGStateResource>
}

export interface FontResource {
  name: string
  type: 'Type1' | 'TrueType' | 'OpenType' | 'Type3' | 'CIDFont'
  baseFont: string
  encoding?: string
  isEmbedded: boolean
  isSubset: boolean
  toUnicode: boolean
  
  // Font metrics
  ascent?: number
  descent?: number
  capHeight?: number
  
  // Subset prefix
  subsetPrefix?: string
}

export interface ColorSpaceResource {
  type: ColorSpaceType
  
  // For ICCBased
  iccProfile?: ICCProfile
  
  // For Separation
  colorantName?: string
  alternateSpace?: string
  
  // For DeviceN
  colorantNames?: string[]
  
  // For Indexed
  base?: string
  hival?: number
  lookup?: Uint8Array
}

export interface XObjectResource {
  type: 'Image' | 'Form' | 'PS'
  
  // For images
  imageData?: ImageData
  
  // For forms
  formBBox?: BoundingBox
  formMatrix?: TransformMatrix
  formResources?: PDFResources
}

export interface PatternResource {
  type: 'Tiling' | 'Shading'
  
  // For tiling
  paintType?: 1 | 2
  tilingType?: 1 | 2 | 3
  bbox?: BoundingBox
  xStep?: number
  yStep?: number
  
  // For shading
  shadingData?: ShadingData
}

export interface ShadingResource {
  data: ShadingData
}

export interface ExtGStateResource {
  // Transparency
  ca?: number           // Fill alpha
  CA?: number           // Stroke alpha
  BM?: BlendMode        // Blend mode
  SMask?: SoftMask      // Soft mask
  
  // Overprint
  OP?: boolean          // Stroke overprint
  op?: boolean          // Fill overprint
  OPM?: 0 | 1           // Overprint mode
  
  // Other
  SA?: boolean          // Stroke adjustment
  AIS?: boolean         // Alpha is shape
  TK?: boolean          // Text knockout
}

// ============================================
// ICC PROFILES
// ============================================

export interface ICCProfile {
  name: string
  description?: string
  
  // Profile info
  colorSpace: 'GRAY' | 'RGB' | 'CMYK' | 'LAB'
  pcs: 'XYZ' | 'Lab'
  version: string
  deviceClass: 'input' | 'display' | 'output' | 'link' | 'abstract' | 'colorspace' | 'namedcolor'
  
  // Rendering intents
  renderingIntent: 'perceptual' | 'relative' | 'saturation' | 'absolute'
  
  // Profile data
  data?: ArrayBuffer
  
  // Embedded in PDF
  isEmbedded: boolean
}

// ============================================
// PREFLIGHT TYPES
// ============================================

export interface PreflightProfile {
  id: string
  name: string
  description: string
  
  // Rules
  rules: PreflightRule[]
  
  // Settings
  settings: PreflightSettings
  
  // Metadata
  createdAt: Date
  modifiedAt: Date
  isBuiltIn: boolean
}

export interface PreflightRule {
  id: string
  name: string
  description: string
  category: PreflightCategory
  
  // Severity
  severity: 'ERROR' | 'WARNING' | 'INFO'
  
  // Check function
  checkType: PreflightCheckType
  parameters: Record<string, unknown>
  
  // Enabled
  enabled: boolean
  
  // Auto-fix available
  canAutoFix: boolean
  fixDescription?: string
}

export type PreflightCategory = 
  | 'DOCUMENT'
  | 'PAGE'
  | 'COLOR'
  | 'FONT'
  | 'IMAGE'
  | 'TRANSPARENCY'
  | 'OVERPRINT'
  | 'LAYER'
  | 'ANNOTATION'
  | 'METADATA'
  | 'OUTPUT_INTENT'
  | 'BLEED'
  | 'BARCODE'

export type PreflightCheckType = 
  // Document checks
  | 'PDF_VERSION'
  | 'OUTPUT_INTENT'
  | 'TRAPPED_KEY'
  | 'ENCRYPTION'
  
  // Page checks
  | 'PAGE_SIZE'
  | 'PAGE_BOXES'
  | 'BLEED_SIZE'
  | 'TRIM_SIZE'
  
  // Color checks
  | 'COLOR_SPACE'
  | 'SPOT_COLOR'
  | 'RGB_OBJECTS'
  | 'LAB_OBJECTS'
  | 'REGISTRATION_COLOR'
  | 'RICH_BLACK'
  | 'INK_COVERAGE'
  | 'TAC_LIMIT'
  
  // Font checks
  | 'FONT_EMBEDDED'
  | 'FONT_SUBSET'
  | 'FONT_TYPE'
  | 'MINIMUM_FONT_SIZE'
  
  // Image checks
  | 'IMAGE_RESOLUTION'
  | 'IMAGE_COLOR_SPACE'
  | 'IMAGE_COMPRESSION'
  | 'OPI_REFERENCES'
  
  // Transparency checks
  | 'TRANSPARENCY_USED'
  | 'BLEND_MODE'
  | 'SOFT_MASK'
  
  // Overprint checks
  | 'OVERPRINT_BLACK'
  | 'OVERPRINT_WHITE'
  | 'OVERPRINT_SPOT'
  
  // Layer checks
  | 'LAYER_VISIBILITY'
  | 'LAYER_PRINTABILITY'
  
  // Other
  | 'ANNOTATION_PRESENT'
  | 'FORM_FIELDS'
  | 'JAVASCRIPT'
  | 'EMBEDDED_FILES'

export interface PreflightSettings {
  // Resolution thresholds
  minImageResolution: number
  minLineArtResolution: number
  maxImageResolution: number
  
  // Color settings
  tacLimit: number
  allowRGB: boolean
  allowLAB: boolean
  requireOutputIntent: boolean
  
  // Font settings
  requireEmbeddedFonts: boolean
  requireSubsetFonts: boolean
  minFontSize: number
  
  // Bleed settings
  requiredBleed: number
  
  // Transparency
  allowTransparency: boolean
  
  // Target
  targetPDFVersion: string
  targetStandard?: 'PDF/X-1a' | 'PDF/X-3' | 'PDF/X-4' | 'PDF/X-5' | 'Custom'
}

export interface PreflightResult {
  documentId: string
  profileId: string
  profileName: string
  
  // Overall status
  status: 'PASSED' | 'WARNINGS' | 'ERRORS'
  
  // Results
  errors: PreflightIssue[]
  warnings: PreflightIssue[]
  info: PreflightIssue[]
  
  // Statistics
  totalChecks: number
  passedChecks: number
  failedChecks: number
  
  // Timing
  startedAt: Date
  completedAt: Date
  duration: number
}

export interface PreflightIssue {
  ruleId: string
  ruleName: string
  category: PreflightCategory
  severity: 'ERROR' | 'WARNING' | 'INFO'
  
  // Issue details
  message: string
  details?: string
  
  // Location
  pageNumber?: number
  objectId?: string
  objectType?: PDFObjectType
  location?: BoundingBox
  
  // Affected items
  affectedItems?: string[]
  
  // Fix
  canAutoFix: boolean
  fixDescription?: string
  
  // Values
  expectedValue?: unknown
  actualValue?: unknown
}

// ============================================
// IMPORT/EXPORT OPTIONS
// ============================================

export interface PDFImportOptions {
  // Pages to import
  pageRange?: string          // e.g., "1-5,7,9-12" or "all"
  
  // Analysis options
  analyzeColors: boolean
  analyzeFonts: boolean
  analyzeImages: boolean
  calculateInkCoverage: boolean
  
  // Preview options
  generateThumbnails: boolean
  thumbnailSize: number
  
  // Performance
  lazyLoadImages: boolean
  maxConcurrentPages: number
  
  // Color management
  useEmbeddedProfiles: boolean
  defaultCMYKProfile?: string
  defaultRGBProfile?: string
}

export interface PDFExportOptions {
  // PDF standard
  pdfVersion: '1.3' | '1.4' | '1.5' | '1.6' | '1.7' | '2.0'
  standard?: 'PDF/X-1a' | 'PDF/X-3' | 'PDF/X-4' | 'None'
  
  // Color
  preserveSpotColors: boolean
  convertSpotsToCMYK: boolean
  outputIntent?: OutputIntent
  
  // Transparency
  flattenTransparency: boolean
  flattenResolution?: number
  
  // Fonts
  embedFonts: boolean
  subsetFonts: boolean
  
  // Images
  imageCompression: 'none' | 'jpeg' | 'jpeg2000' | 'flate'
  imageQuality: number        // 1-100
  downsampleImages: boolean
  downsampleResolution?: number
  
  // Layers
  flattenLayers: boolean
  includeLayers?: string[]
  excludeLayers?: string[]
  
  // Marks
  includeMarks: boolean
  markTypes?: MarkType[]
  
  // Bleed
  includeBleed: boolean
  bleedAmount?: number
}

export type MarkType = 
  | 'TRIM_MARKS'
  | 'BLEED_MARKS'
  | 'REGISTRATION_MARKS'
  | 'COLOR_BARS'
  | 'PAGE_INFO'
  | 'SLUG_INFO'

// ============================================
// EVENTS & CALLBACKS
// ============================================

export interface PDFImportProgress {
  phase: 'LOADING' | 'PARSING' | 'ANALYZING' | 'RENDERING' | 'COMPLETE'
  currentPage: number
  totalPages: number
  currentTask: string
  progress: number           // 0-100
  
  // Partial results
  partialDocument?: Partial<PDFDocumentInfo>
}

export type PDFImportProgressCallback = (progress: PDFImportProgress) => void

export interface PDFImportResult {
  success: boolean
  document?: PDFDocumentInfo
  pages?: PDFPage[]
  errors?: string[]
  warnings?: string[]
  
  // Performance
  loadTime: number
  parseTime: number
  analyzeTime: number
  totalTime: number
}
