/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * GPCS CodeStudio - Auto-Trapping Engine
 * PDF Export Engine (TODO 5)
 * 
 * Exports trapping as PDF/X-ready curves:
 * - Preserves spot colors
 * - Maintains overprint settings
 * - White underprint as separate layer
 * - Compatible with ESKO, X-Rite, Hybrid RIPs
 */

import type {
  TrappingDocument,
  TrapLayer,
  TrapObject,
  ExportOptions,
  ColorDefinition,
  BezierPath,
  BezierPoint,
  DocumentLayer,
} from '../types/trappingTypes'
import { DEFAULT_EXPORT_OPTIONS } from '../types/trappingTypes'

// ============================================
// PDF STRUCTURE TYPES
// ============================================

interface PDFObject {
  id: number
  content: string
}

interface PDFPage {
  width: number
  height: number
  contentStreamId: number
  resourcesId: number
}

interface PDFColorSpace {
  name: string
  type: 'DeviceCMYK' | 'DeviceRGB' | 'Separation' | 'DeviceN'
  alternateSpace?: string
  tintTransform?: string
}

interface PDFExportContext {
  objects: PDFObject[]
  nextObjectId: number
  colorSpaces: Map<string, PDFColorSpace>
  spotColors: Map<string, string>  // color id -> PDF name
  fonts: Map<string, number>
  xObjects: Map<string, number>
}

// ============================================
// PDF GENERATION
// ============================================

/**
 * Export document with trapping to PDF
 */
export async function exportWithTrapping(
  document: TrappingDocument,
  trapLayer: TrapLayer | null,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS
): Promise<Blob> {
  const context = createExportContext()
  
  // Build PDF structure
  const pdfContent = buildPDFContent(document, trapLayer, options, context)
  
  // Create blob
  const blob = new Blob([pdfContent], { type: 'application/pdf' })
  
  return blob
}

function createExportContext(): PDFExportContext {
  return {
    objects: [],
    nextObjectId: 1,
    colorSpaces: new Map(),
    spotColors: new Map(),
    fonts: new Map(),
    xObjects: new Map()
  }
}

/**
 * Build complete PDF content
 */
function buildPDFContent(
  document: TrappingDocument,
  trapLayer: TrapLayer | null,
  options: ExportOptions,
  context: PDFExportContext
): string {
  const lines: string[] = []
  
  // PDF Header
  lines.push('%PDF-1.6')
  lines.push('%âãÏÓ') // Binary marker
  
  // Catalog
  const catalogId = addObject(context, buildCatalog(context))
  
  // Pages
  const pagesId = addObject(context, buildPages(document, trapLayer, options, context))
  
  // Page content
  const pageContentId = addObject(context, buildPageContent(document, trapLayer, options, context))
  
  // Resources
  const resourcesId = addObject(context, buildResources(document, options, context))
  
  // Color spaces for spot colors
  if (options.preserveSpotColors) {
    buildSpotColorSpaces(document, context)
  }
  
  // Info dictionary
  const infoId = addObject(context, buildInfo(document))
  
  // Build object stream
  let offset = 0
  const xref: number[] = []
  
  // Header
  const header = '%PDF-1.6\n%âãÏÓ\n'
  offset += header.length
  
  // Objects
  const objectsContent: string[] = []
  for (const obj of context.objects) {
    xref.push(offset)
    const objContent = `${obj.id} 0 obj\n${obj.content}\nendobj\n`
    objectsContent.push(objContent)
    offset += objContent.length
  }
  
  // Cross-reference table
  const xrefOffset = offset
  const xrefContent = buildXRef(xref)
  
  // Trailer
  const trailer = buildTrailer(catalogId, infoId, context.objects.length)
  
  // Combine all parts
  return header + objectsContent.join('') + xrefContent + trailer + `\nstartxref\n${xrefOffset}\n%%EOF`
}

function addObject(context: PDFExportContext, content: string): number {
  const id = context.nextObjectId++
  context.objects.push({ id, content })
  return id
}

// ============================================
// PDF STRUCTURE BUILDERS
// ============================================

function buildCatalog(context: PDFExportContext): string {
  return `<<
/Type /Catalog
/Pages 2 0 R
/OutputIntents [<<
  /Type /OutputIntent
  /S /GTS_PDFX
  /OutputConditionIdentifier (CGATS TR 001)
  /RegistryName (http://www.color.org)
>>]
>>`
}

function buildPages(
  document: TrappingDocument,
  trapLayer: TrapLayer | null,
  options: ExportOptions,
  context: PDFExportContext
): string {
  // Convert mm to points (1mm = 2.834645669 points)
  const widthPt = document.widthMm * 2.834645669
  const heightPt = document.heightMm * 2.834645669
  
  return `<<
/Type /Pages
/Kids [3 0 R]
/Count 1
/MediaBox [0 0 ${widthPt.toFixed(2)} ${heightPt.toFixed(2)}]
>>`
}

function buildPageContent(
  document: TrappingDocument,
  trapLayer: TrapLayer | null,
  options: ExportOptions,
  context: PDFExportContext
): string {
  const contentStream: string[] = []
  
  // Save graphics state
  contentStream.push('q')
  
  // Transform to mm coordinate system
  contentStream.push('2.834645669 0 0 2.834645669 0 0 cm')
  
  // Draw document layers
  for (const layer of document.layers) {
    if (!layer.printable) continue
    
    // Draw objects in layer
    for (const objId of layer.objectIds) {
      const obj = document.objects.get(objId)
      if (!obj) continue
      
      // Generate PDF operators for object
      const objContent = generateObjectContent(obj, document.colors, options, context)
      contentStream.push(objContent)
    }
  }
  
  // Draw trap layer if included
  if (options.includeTraps && trapLayer) {
    contentStream.push('% Begin Trap Layer')
    
    for (const trap of trapLayer.traps) {
      const trapContent = generateTrapContent(trap, options, context)
      contentStream.push(trapContent)
    }
    
    contentStream.push('% End Trap Layer')
  }
  
  // Restore graphics state
  contentStream.push('Q')
  
  const stream = contentStream.join('\n')
  
  return `<<
/Type /Page
/Parent 2 0 R
/Contents 4 0 R
/Resources 5 0 R
>>
stream
${stream}
endstream`
}

function buildResources(
  document: TrappingDocument,
  options: ExportOptions,
  context: PDFExportContext
): string {
  const colorSpaceRefs: string[] = []
  
  // Add spot color spaces
  for (const [name, cs] of context.colorSpaces) {
    colorSpaceRefs.push(`/${name} ${cs.name}`)
  }
  
  return `<<
/ProcSet [/PDF /Text /ImageB /ImageC /ImageI]
/ColorSpace <<
  /DefaultCMYK /DeviceCMYK
  ${colorSpaceRefs.join('\n  ')}
>>
/ExtGState <<
  /GS0 << /Type /ExtGState /OP true /op true /OPM 1 >>
  /GS1 << /Type /ExtGState /OP false /op false >>
>>
>>`
}

function buildSpotColorSpaces(
  document: TrappingDocument,
  context: PDFExportContext
): void {
  for (const [colorId, color] of document.colors) {
    if (color.spot) {
      const safeName = color.spot.name.replace(/[^a-zA-Z0-9]/g, '_')
      
      // Create separation color space
      const csContent = buildSeparationColorSpace(color)
      const csId = addObject(context, csContent)
      
      context.colorSpaces.set(safeName, {
        name: `${csId} 0 R`,
        type: 'Separation'
      })
      
      context.spotColors.set(colorId, safeName)
    }
  }
}

function buildSeparationColorSpace(color: ColorDefinition): string {
  const cmyk = color.cmyk || { c: 0, m: 0, y: 0, k: 0 }
  const name = color.spot?.name || 'Unknown'
  
  // Tint transform function
  const c = cmyk.c / 100
  const m = cmyk.m / 100
  const y = cmyk.y / 100
  const k = cmyk.k / 100
  
  return `[/Separation /${name.replace(/\s/g, '#20')} /DeviceCMYK
<<
  /FunctionType 2
  /Domain [0 1]
  /C0 [0 0 0 0]
  /C1 [${c} ${m} ${y} ${k}]
  /N 1
>>]`
}

function buildInfo(document: TrappingDocument): string {
  const now = new Date()
  const dateStr = `D:${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  
  return `<<
/Title (${document.name})
/Creator (GPCS CodeStudio Auto-Trapping Engine)
/Producer (GPCS CodeStudio v1.0)
/CreationDate (${dateStr})
/ModDate (${dateStr})
/GTS_PDFXVersion (PDF/X-4)
>>`
}

function buildXRef(offsets: number[]): string {
  const lines: string[] = []
  lines.push('xref')
  lines.push(`0 ${offsets.length + 1}`)
  lines.push('0000000000 65535 f ')
  
  for (const offset of offsets) {
    lines.push(`${String(offset).padStart(10, '0')} 00000 n `)
  }
  
  return lines.join('\n') + '\n'
}

function buildTrailer(catalogId: number, infoId: number, objectCount: number): string {
  return `trailer
<<
/Size ${objectCount + 1}
/Root ${catalogId} 0 R
/Info ${infoId} 0 R
>>`
}

// ============================================
// CONTENT GENERATION
// ============================================

function generateObjectContent(
  obj: any,
  colors: Map<string, ColorDefinition>,
  options: ExportOptions,
  context: PDFExportContext
): string {
  const lines: string[] = []
  
  // Save state
  lines.push('q')
  
  // Apply fill if present
  if (obj.fill) {
    const fillOps = generateColorOperators(obj.fill, 'fill', options, context)
    lines.push(fillOps)
  }
  
  // Apply stroke if present
  if (obj.stroke) {
    const strokeOps = generateColorOperators(obj.stroke.color, 'stroke', options, context)
    lines.push(strokeOps)
    lines.push(`${obj.stroke.width} w`) // Line width
  }
  
  // Draw paths
  for (const path of obj.paths || []) {
    const pathOps = generatePathOperators(path)
    lines.push(pathOps)
    
    // Fill and/or stroke
    if (obj.fill && obj.stroke) {
      lines.push('B') // Fill and stroke
    } else if (obj.fill) {
      lines.push('f') // Fill
    } else if (obj.stroke) {
      lines.push('S') // Stroke
    }
  }
  
  // Restore state
  lines.push('Q')
  
  return lines.join('\n')
}

function generateTrapContent(
  trap: TrapObject,
  options: ExportOptions,
  context: PDFExportContext
): string {
  const lines: string[] = []
  
  // Save state
  lines.push('q')
  
  // Set overprint (traps always overprint)
  lines.push('/GS0 gs')
  
  // Set trap color
  const colorOps = generateColorOperators(trap.color, 'fill', options, context)
  lines.push(colorOps)
  
  // Draw trap path
  const pathOps = generatePathOperators(trap.path)
  lines.push(pathOps)
  
  // Fill
  lines.push('f')
  
  // Restore state
  lines.push('Q')
  
  return lines.join('\n')
}

function generateColorOperators(
  color: ColorDefinition,
  mode: 'fill' | 'stroke',
  options: ExportOptions,
  context: PDFExportContext
): string {
  const op = mode === 'fill' ? 'k' : 'K'
  const scnOp = mode === 'fill' ? 'scn' : 'SCN'
  
  // Check for spot color
  if (color.spot && options.preserveSpotColors) {
    const spotName = context.spotColors.get(color.id)
    if (spotName) {
      const tint = (color.spot.tint || 100) / 100
      return `/${spotName} cs ${tint} ${scnOp}`
    }
  }
  
  // Use CMYK
  if (color.cmyk) {
    const c = color.cmyk.c / 100
    const m = color.cmyk.m / 100
    const y = color.cmyk.y / 100
    const k = color.cmyk.k / 100
    return `${c.toFixed(3)} ${m.toFixed(3)} ${y.toFixed(3)} ${k.toFixed(3)} ${op}`
  }
  
  return '0 0 0 1 k' // Default to black
}

function generatePathOperators(path: BezierPath): string {
  if (path.points.length === 0) return ''
  
  const ops: string[] = []
  
  // Move to first point
  const first = path.points[0]
  ops.push(`${first.anchor.x.toFixed(3)} ${first.anchor.y.toFixed(3)} m`)
  
  // Draw segments
  for (let i = 1; i < path.points.length; i++) {
    const prev = path.points[i - 1]
    const curr = path.points[i]
    
    if (prev.handleOut && curr.handleIn) {
      // Cubic bezier
      ops.push(`${prev.handleOut.x.toFixed(3)} ${prev.handleOut.y.toFixed(3)} ${curr.handleIn.x.toFixed(3)} ${curr.handleIn.y.toFixed(3)} ${curr.anchor.x.toFixed(3)} ${curr.anchor.y.toFixed(3)} c`)
    } else {
      // Line
      ops.push(`${curr.anchor.x.toFixed(3)} ${curr.anchor.y.toFixed(3)} l`)
    }
  }
  
  // Close path if needed
  if (path.closed) {
    ops.push('h')
  }
  
  return ops.join('\n')
}

// ============================================
// WHITE UNDERPRINT LAYER
// ============================================

/**
 * Generate white underprint layer content
 */
export function generateWhiteUnderprintLayer(
  document: TrappingDocument,
  options: ExportOptions
): string {
  const lines: string[] = []
  
  lines.push('% White Underprint Layer')
  lines.push('q')
  
  // Find all white underprint objects
  for (const [objId, obj] of document.objects) {
    if (obj.fill?.type === 'WHITE_UNDERPRINT') {
      // Generate white fill
      lines.push('q')
      lines.push('1 1 1 0 k') // White in CMYK (no ink)
      
      for (const path of obj.paths) {
        lines.push(generatePathOperators(path))
        lines.push('f')
      }
      
      lines.push('Q')
    }
  }
  
  lines.push('Q')
  
  return lines.join('\n')
}

// ============================================
// EXPORT UTILITIES
// ============================================

/**
 * Download PDF file
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = window.document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  window.document.body.appendChild(a)
  a.click()
  window.document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Validate export options
 */
export function validateExportOptions(options: ExportOptions): string[] {
  const errors: string[] = []
  
  if (options.rasterResolutionDpi < 72) {
    errors.push('Resolution too low (minimum 72 DPI)')
  }
  
  if (options.rasterResolutionDpi > 2400) {
    errors.push('Resolution too high (maximum 2400 DPI)')
  }
  
  if (options.format === 'PDF_X1A' && !options.convertSpotsToCMYK) {
    errors.push('PDF/X-1a requires spot colors to be converted to CMYK')
  }
  
  return errors
}

/**
 * Get recommended export options for technology
 */
export function getRecommendedOptions(technology: string): Partial<ExportOptions> {
  switch (technology) {
    case 'FLEXO':
      return {
        format: 'PDF_X4',
        preserveSpotColors: true,
        includeWhiteUnderprint: true,
        rasterResolutionDpi: 300
      }
    case 'DIGITAL':
      return {
        format: 'PDF_X4',
        preserveSpotColors: true,
        rasterResolutionDpi: 400
      }
    case 'OFFSET':
      return {
        format: 'PDF_X4',
        preserveSpotColors: true,
        rasterResolutionDpi: 300
      }
    default:
      return DEFAULT_EXPORT_OPTIONS
  }
}
