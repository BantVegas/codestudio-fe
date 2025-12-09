/**
 * GPCS CodeStudio - Die Line Types (Advanced)
 * 
 * Professional CAD/Structural types compatible with ArtiosCAD/CF2
 */

export type DieFormat = 'CFF2' | 'DXF' | 'ARD' | 'DDES' | 'PDF' | 'AI' | 'UNKNOWN'

export type DieLineType = 
  | 'CUT'           // cutting
  | 'CREASE'        // creasing
  | 'PERFORATION'   // perforation
  | 'PARTIAL_CUT'   // kiss-cut / partial cut
  | 'REVERSE_CREASE'// crease from reverse side
  | 'SCORE'         // scoring
  | 'ZIPPER'        // zipper rule
  | 'BLEED'         // bleed limit
  | 'ANNOTATION'    // dimensions, text
  | 'GLUE'          // glue area
  | 'VARNISH_FREE'  // varnish free area
  | 'STRIPPING'     // waste stripping cuts
  | 'REGISTER'      // register marks
  | 'UNKNOWN'

export interface Point2D {
  x: number
  y: number
}

export interface Point3D {
  x: number
  y: number
  z: number
}

// === TECHNICAL PARAMETERS ===

export interface PerforationPattern {
  cutLength: number
  gapLength: number
  repeats?: number
}

export interface CreaseParams {
  channelWidth: number
  channelDepth: number
  foldAngle: number // positive = mountain, negative = valley
}

export interface KissCutParams {
  pressurePercent: number // 0-100% depth
}

export type DieSegmentType = 'LINE' | 'ARC' | 'BEZIER'

export interface DieSegment {
  id: string
  type: DieSegmentType
  lineType: DieLineType
  start: Point2D
  end: Point2D
  
  // Geometric params
  controlPoints?: Point2D[] 
  center?: Point2D
  radius?: number
  clockwise?: boolean
  
  // Technical params
  params?: {
    perforation?: PerforationPattern
    crease?: CreaseParams
    kissCut?: KissCutParams
    zipperType?: string
  }
}

// === STRUCTURAL & 3D ===

export interface DiePanel {
  id: string
  vertices: Point2D[] // 2D shape of the panel
  segments: string[] // IDs of boundary segments
  neighbors: {
    segmentId: string
    panelId: string
    foldAngle: number
  }[]
  type: 'MAIN' | 'FLAP' | 'GLUE_FLAP' | 'WINDOW' | 'HOLE'
  zOrder?: number
}

export interface MaterialSpec {
  id: string
  name: string
  type: 'PAPER' | 'FOLDING_CARTON' | 'CORRUGATED' | 'PLASTIC' | 'LABEL_STOCK'
  caliper: number // hrúbka v mm
  grainDirection: 'HORIZONTAL' | 'VERTICAL' | 'NONE'
  weightGsm: number
  transparency: number // 0-1
  frontTexture?: string
  backTexture?: string
  fluteType?: string // E, B, C, BC, etc. (for corrugated)
}

export interface DiePath {
  id: string
  segments: DieSegment[]
  isClosed: boolean
  lineType: DieLineType
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
    width: number
    height: number
  }
  area?: number
  panels?: DiePanel[] // Detected panels from closed paths
}

// === PROJECT & STANDARDS ===

export interface StandardDef {
  code: string // e.g. "A20.20.03.01" or "ECMA A2020"
  library: 'ECMA' | 'FEFCO' | 'CUSTOM'
  parameters: Record<string, number> // L, W, D, etc.
}

export interface DieLineInfo {
  // Metadata
  id: string
  format: DieFormat
  version?: string
  name: string
  created: Date
  modified: Date
  
  // Geometry
  unit: 'MM' | 'INCH'
  width: number
  height: number
  paths: DiePath[]
  layers: string[]
  
  // Material & Structure
  material?: MaterialSpec
  standard?: StandardDef
  
  // 3D
  isFolded?: boolean
  foldSteps?: number
  
  // Validation
  warnings: string[]
  errors: string[]
}

export interface DieValidationResult {
  isValid: boolean
  isClosed: boolean
  hasSelfIntersections: boolean
  hasDuplicateLines: boolean
  hasOpenContours: boolean
  dimensionsMatch: boolean
  materialValid: boolean
  structuralIntegrity: boolean // Checks if it can be folded
  issues: DieIssue[]
}

export interface DieIssue {
  type: 'ERROR' | 'WARNING'
  code: string
  message: string
  segmentId?: string
  point?: Point2D
  layer?: string
}

// Mapovanie CFF2 typov čiar na naše interné typy
export const CFF2_LINE_TYPE_MAP: Record<number, DieLineType> = {
  1: 'CUT',
  2: 'CREASE',
  3: 'PERFORATION',
  4: 'PARTIAL_CUT', // Kiss cut
  5: 'CUT', // Internal cut
  6: 'REVERSE_CREASE',
  7: 'PERFORATION', // Micro-perf
  8: 'ZIPPER',
  9: 'BLEED'
}

// Mapovanie DXF vrstiev na typy čiar
export const DXF_LAYER_MAP: Record<string, DieLineType> = {
  'CUT': 'CUT',
  'CUTTING': 'CUT',
  'CREASE': 'CREASE',
  'CREASING': 'CREASE',
  'SCORE': 'SCORE',
  'PERF': 'PERFORATION',
  'PERFORATION': 'PERFORATION',
  'KISS': 'PARTIAL_CUT',
  'KISSCUT': 'PARTIAL_CUT',
  'BLEED': 'BLEED',
  'DIM': 'ANNOTATION',
  'INFO': 'ANNOTATION',
  'VARNISH': 'VARNISH_FREE',
  'GLUE': 'GLUE'
}
