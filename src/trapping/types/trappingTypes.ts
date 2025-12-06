/**
 * GPCS CodeStudio - Auto-Trapping Engine
 * Core Type Definitions
 * 
 * Professional prepress trapping system compatible with:
 * - ESKO Automation Engine
 * - Hybrid Software
 * - X-Rite ColorGATE
 */

// ============================================
// COLOR TYPES
// ============================================

export type ColorSpace = 'CMYK' | 'RGB' | 'LAB' | 'SPOT' | 'DEVICE_N'

export type ColorType = 
  | 'PROCESS_CMYK'
  | 'SPOT_COLOR'
  | 'WHITE_UNDERPRINT'
  | 'METALLIC'
  | 'FLUORESCENT'
  | 'VARNISH'
  | 'TRANSPARENT'

export interface CMYKColor {
  c: number  // 0-100
  m: number  // 0-100
  y: number  // 0-100
  k: number  // 0-100
}

export interface RGBColor {
  r: number  // 0-255
  g: number  // 0-255
  b: number  // 0-255
}

export interface LABColor {
  l: number  // 0-100
  a: number  // -128 to 127
  b: number  // -128 to 127
}

export interface SpotColor {
  name: string
  alternateSpace: CMYKColor | RGBColor
  tint: number  // 0-100
  pantoneRef?: string
}

export interface ColorDefinition {
  id: string
  type: ColorType
  space: ColorSpace
  cmyk?: CMYKColor
  rgb?: RGBColor
  lab?: LABColor
  spot?: SpotColor
  opacity: number  // 0-1
  
  // Optical properties for trapping decisions
  opticalDensity: number      // 0-4 (higher = darker)
  luminance: number           // 0-100 (L* value)
  chroma: number              // Saturation/chroma value
  neutralDensity: number      // Neutral density for trap priority
}

// ============================================
// GEOMETRY TYPES
// ============================================

export interface Point {
  x: number
  y: number
}

export interface BezierPoint {
  anchor: Point
  handleIn?: Point   // Control point before anchor
  handleOut?: Point  // Control point after anchor
}

export interface BezierPath {
  id: string
  points: BezierPoint[]
  closed: boolean
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export type PathOperation = 'UNION' | 'INTERSECT' | 'SUBTRACT' | 'XOR'

// ============================================
// GRAPHIC OBJECT TYPES
// ============================================

export type ObjectType = 
  | 'PATH'
  | 'COMPOUND_PATH'
  | 'TEXT'
  | 'IMAGE'
  | 'GROUP'
  | 'CLIPPING_MASK'

export type BlendMode = 
  | 'NORMAL'
  | 'MULTIPLY'
  | 'SCREEN'
  | 'OVERLAY'
  | 'DARKEN'
  | 'LIGHTEN'

export interface GraphicObject {
  id: string
  type: ObjectType
  name?: string
  
  // Geometry
  paths: BezierPath[]
  bounds: BoundingBox
  transform?: TransformMatrix
  
  // Color
  fill?: ColorDefinition
  stroke?: StrokeDefinition
  
  // Print attributes
  overprint: boolean
  knockout: boolean
  
  // Hierarchy
  parentId?: string
  childIds?: string[]
  layerId: string
  zIndex: number
  
  // Risk assessment for trapping
  riskFactors: RiskFactors
}

export interface StrokeDefinition {
  color: ColorDefinition
  width: number  // in mm
  lineCap: 'BUTT' | 'ROUND' | 'SQUARE'
  lineJoin: 'MITER' | 'ROUND' | 'BEVEL'
  miterLimit: number
  dashArray?: number[]
}

export interface TransformMatrix {
  a: number  // scale x
  b: number  // skew y
  c: number  // skew x
  d: number  // scale y
  e: number  // translate x
  f: number  // translate y
}

export interface RiskFactors {
  isSmallText: boolean        // text < 6pt
  isThinLine: boolean         // stroke < 0.25mm
  hasSharpAngles: boolean     // angles < 30°
  isHighDetail: boolean       // complex path
  requiresSpecialHandling: boolean
  warnings: string[]
}

// ============================================
// LAYER TYPES
// ============================================

export interface DocumentLayer {
  id: string
  name: string
  type: LayerType
  visible: boolean
  locked: boolean
  printable: boolean
  
  // Color separation info
  separationName?: string
  isSpotLayer: boolean
  colorDefinition?: ColorDefinition
  
  // Objects in this layer
  objectIds: string[]
  
  // Print order (0 = first to print)
  printOrder: number
}

export type LayerType = 
  | 'ARTWORK'
  | 'WHITE_UNDERPRINT'
  | 'VARNISH'
  | 'DIELINE'
  | 'TRAP_LAYER'
  | 'REGISTRATION'

// ============================================
// COLOR ADJACENCY & ANALYSIS
// ============================================

export interface ColorRegion {
  id: string
  objectId: string
  colorId: string
  color: ColorDefinition
  
  // Geometry of this color region
  contour: BezierPath
  area: number  // in mm²
  
  // Adjacency info
  adjacentRegions: AdjacentRegion[]
}

export interface AdjacentRegion {
  regionId: string
  colorId: string
  
  // Shared boundary
  sharedEdge: BezierPath
  edgeLength: number  // in mm
  
  // Contact type
  contactType: ContactType
  
  // Pre-calculated trap info
  trapRequired: boolean
  trapDirection?: TrapDirection
  suggestedTrapWidth?: number
}

export type ContactType = 
  | 'EDGE_TO_EDGE'      // Colors meet at edge
  | 'OVERLAP'           // One color overlaps another
  | 'GAP'               // Small gap between colors
  | 'KNOCKOUT'          // One knocks out another
  | 'OVERPRINT'         // One overprints another

export interface ColorAdjacencyMap {
  documentId: string
  regions: Map<string, ColorRegion>
  adjacencyMatrix: Map<string, Map<string, AdjacentRegion>>
  
  // Quick lookups
  colorToRegions: Map<string, string[]>
  objectToRegions: Map<string, string[]>
}

// ============================================
// TRAPPING RULES & DECISIONS
// ============================================

export type TrapDirection = 
  | 'SPREAD'      // Lighter color spreads into darker
  | 'CHOKE'       // Darker color chokes lighter
  | 'CENTERLINE'  // Trap centered on edge
  | 'NONE'        // No trap needed

export type TrapStyle = 
  | 'NORMAL'
  | 'ABUTTED'
  | 'FEATHERED'
  | 'SLIDING'
  | 'KEEPAWAY'

export interface TrapRule {
  id: string
  name: string
  priority: number
  
  // Conditions
  sourceColorTypes: ColorType[]
  targetColorTypes: ColorType[]
  minColorDifference?: number
  
  // Actions
  direction: TrapDirection
  widthMm: number
  style: TrapStyle
  
  // Special handling
  applyToText: boolean
  minTextSizePt: number
  applyToThinLines: boolean
  minLineWidthMm: number
}

export interface TrapDecision {
  regionAId: string
  regionBId: string
  
  // Decision
  direction: TrapDirection
  widthMm: number
  style: TrapStyle
  
  // Reasoning
  appliedRule: TrapRule
  colorPriorityA: number
  colorPriorityB: number
  
  // Adjustments
  adjustedWidth?: number
  adjustmentReason?: string
  
  // Warnings
  warnings: TrapWarning[]
}

export interface TrapWarning {
  type: TrapWarningType
  severity: 'INFO' | 'WARNING' | 'ERROR'
  message: string
  objectId?: string
  regionId?: string
}

export type TrapWarningType = 
  | 'SMALL_TEXT'
  | 'THIN_LINE'
  | 'INSUFFICIENT_SPREAD'
  | 'OVERPRINT_CONFLICT'
  | 'COLOR_MISMATCH'
  | 'COMPLEX_GEOMETRY'
  | 'METALLIC_ADJACENT'
  | 'WHITE_UNDERPRINT_ISSUE'

// ============================================
// TRAP GEOMETRY
// ============================================

export interface TrapObject {
  id: string
  sourceRegionId: string
  targetRegionId: string
  
  // Geometry
  path: BezierPath
  widthMm: number
  
  // Style
  style: TrapStyle
  featherAmount?: number  // For soft traps
  
  // Color (usually derived from source or blend)
  color: ColorDefinition
  overprint: true  // Traps always overprint
  
  // Metadata
  decision: TrapDecision
  generatedAt: Date
}

export interface TrapLayer {
  id: string
  documentId: string
  name: string
  
  // All trap objects
  traps: TrapObject[]
  
  // Statistics
  totalTrapCount: number
  totalTrapAreaMm2: number
  
  // Generation info
  settings: TrapSettings
  generatedAt: Date
  generationTimeMs: number
}

// ============================================
// SETTINGS & CONFIGURATION (ESKO Compatible)
// ============================================

export type PrintingTechnology = 'FLEXO' | 'OFFSET' | 'DIGITAL' | 'SCREEN' | 'GRAVURE' | 'DRY_OFFSET'

// 1. TRAPPING MODE
export type TrapMode = 'NORMAL' | 'REVERSE'  // Normal = spread lighter into darker, Reverse = white knockout

// 2. DIRECTION MODE (ESKO compatible)
export type DirectionMode = 
  | 'USE_LIGHTNESS'           // Trap based on luminance (light → dark)
  | 'SPOT_AS_OPAQUE'          // Spot colors follow ink order
  | 'SEPARATION_ORDER'        // Direction by separation order
  | 'REVERSE_SEPARATION'      // Reverse separation order
  | 'INTO_BOTH_COLORS'        // Bidirectional (half distance each way)

// Image trap direction
export type ImageTrapDirection = 
  | 'AUTOMATIC'               // Compare lightness of CT image and adjacent area
  | 'TOWARDS_IMAGES'          // Lineart always under CT images
  | 'TOWARDS_LINEART'         // CT images always under lineart

// 3. COLOR & SHAPE
export type ImageTrapColor = 
  | 'ORIGINAL_DATA'           // Use original image data as clipping mask
  | 'EXTEND_DATA'             // Extrapolate image along edges
  | 'APPROXIMATE_FLAT'        // Calculate average flat color from boundary

export type TruncationMode = 
  | 'ON_CENTER'               // Trap limited to half distance to other object
  | 'ON_EDGE'                 // Trap cut at edge of other object

export type EndCapStyle = 'SQUARE' | 'ROUND' | 'OBJECT_DEPENDENT'
export type CornerStyle = 'MITER' | 'ROUND' | 'BEVEL'

// 4. INK PULL BACK
export type PullBackMode = 
  | 'AUTOMATIC'               // Pullback for rich black/spot when color not very different
  | 'ONLY_RICH_BLACK'         // Only for rich black
  | 'DO_NOT_PULL_BACK'        // No pullback

// 5. CENTERLINE BEHAVIOR
export type CenterlineBehavior = 
  | 'AUTOMATIC'               // Based on color pair rules
  | 'NEVER_ON_DARK'           // Never cross center of dark areas
  | 'NEVER'                   // Never cross center of any area

// 6. TRAP DECISION CONSISTENCY
export type TrapDecisionMode = 
  | 'EACH_HIT_OWN'            // Recalculate direction for each occurrence
  | 'SAME_FOR_ALL'            // Same direction for all occurrences
  | 'SAME_FOR_SMALL'          // Same direction for small objects

// Color Pair Rule
export interface ColorPairRule {
  id: string
  name: string
  enabled: boolean
  
  // From/To criteria
  fromColor: {
    type: 'ANY' | 'PROCESS' | 'SPOT' | 'OPAQUE' | 'IMAGE' | 'GRADIENT' | 'EMPTY' | 'REGISTRATION' | 'SPECIFIC'
    inkName?: string
    minDensity?: number
    pureColorOnly?: boolean
  }
  toColor: {
    type: 'ANY' | 'PROCESS' | 'SPOT' | 'OPAQUE' | 'IMAGE' | 'GRADIENT' | 'EMPTY' | 'REGISTRATION' | 'SPECIFIC'
    inkName?: string
    minDensity?: number
    pureColorOnly?: boolean
  }
  
  // Actions
  action: 'TRAP' | 'NO_TRAP' | 'NO_PULLBACK' | 'FORCE_DIRECTION' | 'CUSTOM_DISTANCE'
  customDistanceMm?: number
  forceDirection?: TrapDirection
  truncationMode?: TruncationMode
  horizontalDistortion?: number  // % of distance in H direction
  verticalDistortion?: number    // % of distance in V direction
}

// Trap Preset
export interface TrapPreset {
  id: string
  name: string
  description: string
  technology: PrintingTechnology
  settings: TrapSettings
  isDefault: boolean
  createdAt: Date
  modifiedAt: Date
}

export interface TrapSettings {
  // === 1. TRAPPING MODE ===
  enabled: boolean
  mode: TrapMode
  technology: PrintingTechnology
  
  // === 2. DISTANCE & DIRECTION ===
  // Basic distances
  defaultWidthMm: number          // Main trapping distance (default 0.2mm)
  maxWidthMm: number
  minWidthMm: number
  intoBlackMm: number             // Separate distance for trap into black
  intoSpotColorMm: number         // Distance for spot colors
  intoImageMm: number             // Distance for images
  pullBackDistanceMm: number      // Pull back distance
  
  // Minimum ink difference (%)
  minInkDifference: number        // % difference for trap activation (default 10%)
  
  // Direction
  directionMode: DirectionMode
  imageTrapDirection: ImageTrapDirection
  
  // === 3. COLOR & SHAPE ===
  trapColorIntensity: number      // 0-100% (default 100%)
  imageTrapColor: ImageTrapColor
  truncationMode: TruncationMode
  truncationIntoBlack: TruncationMode
  endCapStyle: EndCapStyle
  cornerStyle: CornerStyle
  miterLimit: number              // Default 4
  
  // === 4. INK PULL BACK ===
  pullBackMode: PullBackMode
  pullBackLightInks: boolean      // Also pull back light inks
  pullBackImagesGradients: boolean
  
  // === 5. PROCESSING ===
  centerlineBehavior: CenterlineBehavior
  trapDecisionMode: TrapDecisionMode
  smallObjectThresholdMm: number  // For SAME_FOR_SMALL mode (default 1mm)
  
  // Ignore options
  respectExistingTraps: boolean
  ignoreBitmaps: boolean
  trapImagesToImages: boolean
  
  // Gaps
  closeGapsSmallerThanMm: number  // Auto-close small gaps (default 0.01mm)
  allowTrapOvershoot: boolean
  
  // === 6. RULES ===
  colorPairRules: ColorPairRule[]
  
  // === LEGACY/SPECIAL HANDLING ===
  trapBlackToAll: boolean
  blackTrapWidthMm: number
  
  trapWhiteUnderprint: boolean
  whiteSpreadMm: number
  whiteKnockoutEnabled: boolean   // For reverse trapping
  
  trapMetallics: boolean
  metallicTrapWidthMm: number
  
  // Text handling
  trapText: boolean
  minTextSizePt: number
  textTrapReduction: number
  
  // Line handling
  trapThinLines: boolean
  minLineWidthMm: number
  
  // Image handling
  trapImages: boolean
  imageEdgeFeatherMm: number
  
  // Step limit for complex paths
  stepLimitMm: number
  
  // Custom rules (legacy)
  customRules: TrapRule[]
}

export const DEFAULT_TRAP_SETTINGS: TrapSettings = {
  // 1. TRAPPING MODE
  enabled: true,
  mode: 'NORMAL',
  technology: 'FLEXO',
  
  // 2. DISTANCE & DIRECTION
  defaultWidthMm: 0.2,
  maxWidthMm: 0.5,
  minWidthMm: 0.05,
  intoBlackMm: 0.25,
  intoSpotColorMm: 0.2,
  intoImageMm: 0.15,
  pullBackDistanceMm: 0.1,
  minInkDifference: 10,
  directionMode: 'USE_LIGHTNESS',
  imageTrapDirection: 'AUTOMATIC',
  
  // 3. COLOR & SHAPE
  trapColorIntensity: 100,
  imageTrapColor: 'EXTEND_DATA',
  truncationMode: 'ON_CENTER',
  truncationIntoBlack: 'ON_CENTER',
  endCapStyle: 'SQUARE',
  cornerStyle: 'MITER',
  miterLimit: 4,
  
  // 4. INK PULL BACK
  pullBackMode: 'AUTOMATIC',
  pullBackLightInks: false,
  pullBackImagesGradients: false,
  
  // 5. PROCESSING
  centerlineBehavior: 'AUTOMATIC',
  trapDecisionMode: 'SAME_FOR_SMALL',
  smallObjectThresholdMm: 1,
  respectExistingTraps: true,
  ignoreBitmaps: false,
  trapImagesToImages: true,
  closeGapsSmallerThanMm: 0.01,
  allowTrapOvershoot: false,
  
  // 6. RULES
  colorPairRules: [],
  
  // LEGACY/SPECIAL
  trapBlackToAll: true,
  blackTrapWidthMm: 0.25,
  trapWhiteUnderprint: true,
  whiteSpreadMm: 0.3,
  whiteKnockoutEnabled: false,
  trapMetallics: true,
  metallicTrapWidthMm: 0.2,
  trapText: true,
  minTextSizePt: 6,
  textTrapReduction: 0.5,
  trapThinLines: false,
  minLineWidthMm: 0.25,
  trapImages: true,
  imageEdgeFeatherMm: 0.1,
  stepLimitMm: 0.1,
  customRules: []
}

// Predefined presets (ESKO style)
export const TRAP_PRESETS: Omit<TrapPreset, 'id' | 'createdAt' | 'modifiedAt'>[] = [
  {
    name: 'Flexo Standard',
    description: 'Štandardné nastavenia pre flexografickú tlač',
    technology: 'FLEXO',
    settings: { ...DEFAULT_TRAP_SETTINGS, technology: 'FLEXO', defaultWidthMm: 0.15 },
    isDefault: true
  },
  {
    name: 'Offset Standard',
    description: 'Štandardné nastavenia pre ofsetovú tlač',
    technology: 'OFFSET',
    settings: { ...DEFAULT_TRAP_SETTINGS, technology: 'OFFSET', defaultWidthMm: 0.1 },
    isDefault: false
  },
  {
    name: 'Digital Print',
    description: 'Nastavenia pre digitálnu tlač',
    technology: 'DIGITAL',
    settings: { ...DEFAULT_TRAP_SETTINGS, technology: 'DIGITAL', defaultWidthMm: 0.05, minInkDifference: 15 },
    isDefault: false
  },
  {
    name: 'Dry Offset (Cans)',
    description: 'Pre tlač na kovové plechovky - reverse trapping',
    technology: 'DRY_OFFSET',
    settings: { ...DEFAULT_TRAP_SETTINGS, technology: 'DRY_OFFSET', mode: 'REVERSE', whiteKnockoutEnabled: true, endCapStyle: 'ROUND' },
    isDefault: false
  },
  {
    name: 'Screen Print',
    description: 'Nastavenia pre sieťotlač',
    technology: 'SCREEN',
    settings: { ...DEFAULT_TRAP_SETTINGS, technology: 'SCREEN', defaultWidthMm: 0.25, minInkDifference: 8 },
    isDefault: false
  },
  {
    name: 'Gravure',
    description: 'Nastavenia pre hĺbkotlač',
    technology: 'GRAVURE',
    settings: { ...DEFAULT_TRAP_SETTINGS, technology: 'GRAVURE', defaultWidthMm: 0.12 },
    isDefault: false
  }
]

// ============================================
// DOCUMENT & EXPORT
// ============================================

export interface TrappingDocument {
  id: string
  name: string
  
  // Dimensions
  widthMm: number
  heightMm: number
  bleedMm: number
  
  // Content
  layers: DocumentLayer[]
  objects: Map<string, GraphicObject>
  colors: Map<string, ColorDefinition>
  
  // Analysis results
  adjacencyMap?: ColorAdjacencyMap
  
  // Trapping
  trapSettings: TrapSettings
  trapLayer?: TrapLayer
  
  // Warnings
  warnings: TrapWarning[]
  
  // Metadata
  createdAt: Date
  modifiedAt: Date
}

export interface ExportOptions {
  format: 'PDF' | 'PDF_X1A' | 'PDF_X3' | 'PDF_X4'
  
  // Include trapping
  includeTraps: boolean
  flattenTraps: boolean  // Merge trap layer with artwork
  
  // Color handling
  preserveSpotColors: boolean
  convertSpotsToCMYK: boolean
  
  // Overprint
  preserveOverprint: boolean
  simulateOverprint: boolean
  
  // White underprint
  includeWhiteUnderprint: boolean
  whiteLayerName: string
  
  // Resolution for raster elements
  rasterResolutionDpi: number
  
  // Compatibility
  pdfVersion: string
  embedFonts: boolean
  subsetFonts: boolean
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'PDF_X4',
  includeTraps: true,
  flattenTraps: false,
  preserveSpotColors: true,
  convertSpotsToCMYK: false,
  preserveOverprint: true,
  simulateOverprint: false,
  includeWhiteUnderprint: true,
  whiteLayerName: 'White Underprint',
  rasterResolutionDpi: 300,
  pdfVersion: '1.6',
  embedFonts: true,
  subsetFonts: true
}

// ============================================
// TRAP TAGS (ESKO-style selective trapping)
// ============================================

export type TrapTagMode = 'AUTO' | 'ALWAYS' | 'NEVER'
export type TrapTagDirection = 'AUTO' | 'IN' | 'OUT' | 'CENTERLINE'

export interface TrapTag {
  id: string
  objectId: string           // ID objektu na ktorý je tag aplikovaný
  
  // Trapping mode pre tento objekt
  trappingMode: TrapTagMode
  trappingDirection: TrapTagDirection
  customDistanceMm?: number  // Override default distance
  
  // Reverse trapping mode pre tento objekt
  reverseMode: TrapTagMode
  reverseDirection: TrapTagDirection
  reverseDistanceMm?: number
  
  // Priority override
  priorityOverride?: number  // 0-100, vyššie = drží hranu
  
  // Ink pullback override
  pullBackOverride?: 'AUTO' | 'FORCE' | 'NEVER'
  pullBackDistanceMm?: number
  
  // Metadata
  createdAt: Date
  modifiedAt: Date
  createdBy?: string
  note?: string
}

export interface TrapTagGroup {
  id: string
  name: string
  description?: string
  objectIds: string[]        // Objekty v skupine
  tag: Omit<TrapTag, 'id' | 'objectId' | 'createdAt' | 'modifiedAt'>
  createdAt: Date
}

// ============================================
// RULE-BASED ENGINE TYPES
// ============================================

export interface InkStrength {
  inkName: string
  strength: number           // 0-100, vyššie = silnejší/tmavší
  isOpaque: boolean
  holdsEdge: boolean         // Či táto farba drží hranu
  printOrder: number         // Poradie tlače (0 = prvá)
}

export interface ColorPriority {
  colorId: string
  priority: number           // Vypočítaná priorita pre trap rozhodnutia
  luminance: number
  neutralDensity: number
  inkStrength: number
  isBlack: boolean
  isWhite: boolean
  isSpot: boolean
  isMetallic: boolean
}

export interface TrapEngineRule {
  id: string
  name: string
  description: string
  priority: number           // Poradie vyhodnotenia (vyššie = skôr)
  enabled: boolean
  
  // Podmienky
  conditions: TrapRuleCondition[]
  
  // Akcie
  action: TrapRuleAction
}

export interface TrapRuleCondition {
  type: 
    | 'COLOR_TYPE'           // Typ farby (process, spot, metallic...)
    | 'LUMINANCE_DIFF'       // Rozdiel luminancie
    | 'INK_STRENGTH_DIFF'    // Rozdiel sily atramentu
    | 'OBJECT_TYPE'          // Typ objektu (text, path, image)
    | 'OBJECT_SIZE'          // Veľkosť objektu
    | 'LINE_WIDTH'           // Šírka čiary
    | 'TEXT_SIZE'            // Veľkosť textu
    | 'HAS_TRAP_TAG'         // Má trap tag
    | 'IS_KNOCKOUT'          // Je knockout
    | 'IS_OVERPRINT'         // Je overprint
    | 'ADJACENT_TO_BLACK'    // Susedí s čiernou
    | 'ADJACENT_TO_WHITE'    // Susedí s bielou
    | 'IS_NEGATIVE_TEXT'     // Negatívny text
    | 'IS_RICH_BLACK'        // Rich black pozadie
  
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER' | 'LESS' | 'CONTAINS' | 'IN_RANGE'
  value: string | number | boolean | [number, number]
  target: 'SOURCE' | 'TARGET' | 'BOTH' | 'EITHER'
}

export interface TrapRuleAction {
  type: 
    | 'TRAP'                 // Aplikuj trap
    | 'NO_TRAP'              // Žiadny trap
    | 'SPREAD'               // Spread svetlejšiu
    | 'CHOKE'                // Choke tmavšiu
    | 'CENTERLINE'           // Centerline trap
    | 'REVERSE_KNOCKOUT'     // Reverse trapping - biely knockout
    | 'PULLBACK'             // Ink pullback
    | 'CUSTOM'               // Vlastné nastavenia
  
  // Parametre akcie
  distanceMm?: number
  distancePercent?: number   // % z default distance
  colorOverride?: 'SOURCE' | 'TARGET' | 'BLEND' | 'CUSTOM'
  customColor?: { c: number; m: number; y: number; k: number }
  truncation?: TruncationMode
  feather?: number           // Soft edge amount
}

// Predefinované pravidlá (ESKO-style)
export const DEFAULT_TRAP_RULES: TrapEngineRule[] = [
  {
    id: 'rule_black_holds_edge',
    name: 'Black Holds Edge',
    description: 'Čierna farba vždy drží hranu - ostatné farby sa rozširujú do nej',
    priority: 100,
    enabled: true,
    conditions: [
      { type: 'ADJACENT_TO_BLACK', operator: 'EQUALS', value: true, target: 'EITHER' }
    ],
    action: { type: 'SPREAD', distancePercent: 100 }
  },
  {
    id: 'rule_white_knockout',
    name: 'White Knockout',
    description: 'Biela farba sa vždy knockoutuje - nikdy neoverprinte',
    priority: 95,
    enabled: true,
    conditions: [
      { type: 'COLOR_TYPE', operator: 'EQUALS', value: 'WHITE_UNDERPRINT', target: 'EITHER' }
    ],
    action: { type: 'SPREAD', distanceMm: 0.3 }
  },
  {
    id: 'rule_small_text_reduce',
    name: 'Small Text Reduction',
    description: 'Malý text má redukovaný trap aby nebol deformovaný',
    priority: 90,
    enabled: true,
    conditions: [
      { type: 'TEXT_SIZE', operator: 'LESS', value: 8, target: 'EITHER' }
    ],
    action: { type: 'TRAP', distancePercent: 50 }
  },
  {
    id: 'rule_negative_text',
    name: 'Negative Text Handling',
    description: 'Negatívny text - pozadie drží hranu, text sa zmenšuje',
    priority: 88,
    enabled: true,
    conditions: [
      { type: 'IS_NEGATIVE_TEXT', operator: 'EQUALS', value: true, target: 'SOURCE' }
    ],
    action: { type: 'CHOKE', distancePercent: 80 }
  },
  {
    id: 'rule_rich_black_pullback',
    name: 'Rich Black Pullback',
    description: 'Rich black - CMY komponenty sa stiahnu pod K',
    priority: 85,
    enabled: true,
    conditions: [
      { type: 'IS_RICH_BLACK', operator: 'EQUALS', value: true, target: 'EITHER' }
    ],
    action: { type: 'PULLBACK', distanceMm: 0.15 }
  },
  {
    id: 'rule_thin_lines_no_trap',
    name: 'Thin Lines No Trap',
    description: 'Veľmi tenké čiary sa netrapujú',
    priority: 80,
    enabled: true,
    conditions: [
      { type: 'LINE_WIDTH', operator: 'LESS', value: 0.15, target: 'EITHER' }
    ],
    action: { type: 'NO_TRAP' }
  },
  {
    id: 'rule_metallic_special',
    name: 'Metallic Ink Handling',
    description: 'Metalické farby majú špeciálne pravidlá',
    priority: 75,
    enabled: true,
    conditions: [
      { type: 'COLOR_TYPE', operator: 'EQUALS', value: 'METALLIC', target: 'EITHER' }
    ],
    action: { type: 'SPREAD', distanceMm: 0.2, truncation: 'ON_EDGE' }
  },
  {
    id: 'rule_spot_opaque',
    name: 'Opaque Spot Colors',
    description: 'Opaque spot farby držia hranu',
    priority: 70,
    enabled: true,
    conditions: [
      { type: 'COLOR_TYPE', operator: 'EQUALS', value: 'SPOT_COLOR', target: 'EITHER' }
    ],
    action: { type: 'TRAP', colorOverride: 'SOURCE' }
  },
  {
    id: 'rule_luminance_based',
    name: 'Luminance Based Direction',
    description: 'Svetlejšia farba sa rozširuje do tmavšej',
    priority: 50,
    enabled: true,
    conditions: [
      { type: 'LUMINANCE_DIFF', operator: 'GREATER', value: 10, target: 'BOTH' }
    ],
    action: { type: 'SPREAD' }
  },
  {
    id: 'rule_similar_colors_centerline',
    name: 'Similar Colors Centerline',
    description: 'Podobné farby používajú centerline trap',
    priority: 40,
    enabled: true,
    conditions: [
      { type: 'LUMINANCE_DIFF', operator: 'LESS', value: 10, target: 'BOTH' }
    ],
    action: { type: 'CENTERLINE' }
  }
]

// ============================================
// UI STATE
// ============================================

export type ViewMode = 
  | 'NORMAL'
  | 'TRAP_OVERLAY'
  | 'OVERPRINT_PREVIEW'
  | 'SEPARATION_PREVIEW'

export interface TrappingUIState {
  viewMode: ViewMode
  showTrapOverlay: boolean
  trapOverlayOpacity: number
  
  selectedObjectId?: string
  selectedRegionId?: string
  
  highlightedWarnings: string[]
  
  // Zoom to problem areas
  focusedWarning?: TrapWarning
}

// ============================================
// TRAP LAYER MANAGEMENT
// ============================================

export interface ManagedTrapLayer {
  id: string
  name: string
  type: 'AUTOMATIC' | 'REVERSE' | 'MANUAL'
  
  // Stav
  visible: boolean
  locked: boolean
  editable: boolean          // Či je možné manuálne upravovať
  
  // Obsah
  trapObjects: TrapObject[]
  
  // Štatistiky
  trapCount: number
  spreadCount: number
  chokeCount: number
  centerlineCount: number
  reverseKnockoutCount: number
  
  // Generovanie
  settings: TrapSettings
  appliedRules: string[]     // IDs pravidiel ktoré boli použité
  appliedTags: string[]      // IDs tagov ktoré boli použité
  
  // Metadata
  generatedAt: Date
  lastUpdatedAt: Date
  generationTimeMs: number
  
  // Exceptions (manuálne úpravy)
  exceptions: TrapException[]
}

export interface TrapException {
  id: string
  trapObjectId: string
  type: 'DIRECTION_OVERRIDE' | 'DISTANCE_OVERRIDE' | 'DELETED' | 'ADDED' | 'MODIFIED'
  originalValue?: unknown
  newValue?: unknown
  reason?: string
  createdAt: Date
}
