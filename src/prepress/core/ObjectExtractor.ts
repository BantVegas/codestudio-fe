/**
 * GPCS CodeStudio - Object Extractor
 * 
 * Extracts graphic objects from PDF content stream
 * Handles paths, text, images, and shadings
 */

import type { PDFPageProxy } from 'pdfjs-dist'
import type {
  PDFObject,
  PDFObjectType,
  BoundingBox,
  TransformMatrix,
  BlendMode,
  PathData,
  PathCommand,
  Point,
  TextData,
  ImageData,
  ShadingData,
  ExtendedColor,
  CMYKValues,
  RGBValues,
} from '../types/PrepressTypes'

// PDF Operator codes from pdf.js
const OPS = {
  // Path construction
  moveTo: 13,
  lineTo: 14,
  curveTo: 15,
  curveTo2: 16,
  curveTo3: 17,
  closePath: 18,
  rectangle: 19,
  
  // Path painting
  stroke: 20,
  closeStroke: 21,
  fill: 22,
  eoFill: 23,
  fillStroke: 24,
  eoFillStroke: 25,
  closeFillStroke: 26,
  closeEOFillStroke: 27,
  endPath: 28,
  
  // Clipping
  clip: 29,
  eoClip: 30,
  
  // Text
  beginText: 31,
  endText: 32,
  setCharSpacing: 33,
  setWordSpacing: 34,
  setHScale: 35,
  setLeading: 36,
  setFont: 37,
  setTextRenderingMode: 38,
  setTextRise: 39,
  moveText: 40,
  setLeadingMoveText: 41,
  setTextMatrix: 42,
  nextLine: 43,
  showText: 44,
  showSpacedText: 45,
  nextLineShowText: 46,
  nextLineSetSpacingShowText: 47,
  
  // Color
  setStrokeColorSpace: 86,
  setFillColorSpace: 85,
  setStrokeColor: 88,
  setFillColor: 87,
  setStrokeGray: 90,
  setFillGray: 89,
  setStrokeRGBColor: 92,
  setFillRGBColor: 91,
  setStrokeCMYKColor: 94,
  setFillCMYKColor: 93,
  
  // Shading
  shadingFill: 95,
  
  // Images
  beginInlineImage: 96,
  beginImageData: 97,
  endInlineImage: 98,
  paintXObject: 99,
  
  // Graphics state
  save: 10,
  restore: 11,
  transform: 12,
  setLineWidth: 1,
  setLineCap: 2,
  setLineJoin: 3,
  setMiterLimit: 4,
  setDash: 5,
  setRenderingIntent: 6,
  setFlatness: 7,
  setGState: 8,
}

/**
 * Graphics state for tracking current rendering state
 */
interface GraphicsState {
  transform: TransformMatrix
  fillColor: ExtendedColor | undefined
  strokeColor: ExtendedColor | undefined
  lineWidth: number
  lineCap: 'butt' | 'round' | 'square'
  lineJoin: 'miter' | 'round' | 'bevel'
  miterLimit: number
  dashArray: number[]
  dashPhase: number
  fillColorSpace: string
  strokeColorSpace: string
  overprint: boolean
  overprintMode: 0 | 1
  blendMode: BlendMode
  opacity: number
  strokeOpacity: number
}

/**
 * Object Extractor class
 */
export class ObjectExtractor {
  private objects: PDFObject[] = []
  private objectIdCounter = 0
  private stateStack: GraphicsState[] = []
  private currentState: GraphicsState
  private currentPath: PathCommand[] = []
  private currentTextState: Partial<TextData> = {}
  private isInTextBlock = false
  
  constructor() {
    this.currentState = this.createDefaultState()
  }
  
  /**
   * Create default graphics state
   */
  private createDefaultState(): GraphicsState {
    return {
      transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      fillColor: undefined,
      strokeColor: undefined,
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      dashArray: [],
      dashPhase: 0,
      fillColorSpace: 'DeviceGray',
      strokeColorSpace: 'DeviceGray',
      overprint: false,
      overprintMode: 0,
      blendMode: 'Normal',
      opacity: 1,
      strokeOpacity: 1
    }
  }
  
  /**
   * Extract objects from PDF page
   */
  async extractObjects(
    page: PDFPageProxy,
    operatorList: { fnArray: number[]; argsArray: unknown[][] }
  ): Promise<PDFObject[]> {
    this.reset()
    
    const { fnArray, argsArray } = operatorList
    
    for (let i = 0; i < fnArray.length; i++) {
      const op = fnArray[i]
      const args = argsArray[i]
      
      await this.processOperator(op, args, page)
    }
    
    return this.objects
  }
  
  /**
   * Process a single PDF operator
   */
  private async processOperator(
    op: number,
    args: unknown[],
    page: PDFPageProxy
  ): Promise<void> {
    switch (op) {
      // Graphics state
      case OPS.save:
        this.saveState()
        break
      case OPS.restore:
        this.restoreState()
        break
      case OPS.transform:
        this.applyTransform(args as number[])
        break
      case OPS.setLineWidth:
        this.currentState.lineWidth = args[0] as number
        break
      case OPS.setLineCap:
        this.currentState.lineCap = this.parseLineCap(args[0] as number)
        break
      case OPS.setLineJoin:
        this.currentState.lineJoin = this.parseLineJoin(args[0] as number)
        break
      case OPS.setMiterLimit:
        this.currentState.miterLimit = args[0] as number
        break
      case OPS.setDash:
        this.currentState.dashArray = args[0] as number[]
        this.currentState.dashPhase = args[1] as number
        break
        
      // Path construction
      case OPS.moveTo:
        this.currentPath.push({ type: 'M', points: [{ x: args[0] as number, y: args[1] as number }] })
        break
      case OPS.lineTo:
        this.currentPath.push({ type: 'L', points: [{ x: args[0] as number, y: args[1] as number }] })
        break
      case OPS.curveTo:
        this.currentPath.push({
          type: 'C',
          points: [
            { x: args[0] as number, y: args[1] as number },
            { x: args[2] as number, y: args[3] as number },
            { x: args[4] as number, y: args[5] as number }
          ]
        })
        break
      case OPS.closePath:
        this.currentPath.push({ type: 'Z', points: [] })
        break
      case OPS.rectangle:
        this.addRectangle(args as number[])
        break
        
      // Path painting
      case OPS.stroke:
      case OPS.closeStroke:
        this.createPathObject('stroke', op === OPS.closeStroke)
        break
      case OPS.fill:
      case OPS.eoFill:
        this.createPathObject('fill', false, op === OPS.eoFill ? 'evenodd' : 'nonzero')
        break
      case OPS.fillStroke:
      case OPS.eoFillStroke:
      case OPS.closeFillStroke:
      case OPS.closeEOFillStroke:
        this.createPathObject('fillStroke', op === OPS.closeFillStroke || op === OPS.closeEOFillStroke,
          op === OPS.eoFillStroke || op === OPS.closeEOFillStroke ? 'evenodd' : 'nonzero')
        break
      case OPS.endPath:
        this.currentPath = []
        break
        
      // Color operations
      case OPS.setFillGray:
        this.setFillGray(args[0] as number)
        break
      case OPS.setStrokeGray:
        this.setStrokeGray(args[0] as number)
        break
      case OPS.setFillRGBColor:
        this.setFillRGB(args as number[])
        break
      case OPS.setStrokeRGBColor:
        this.setStrokeRGB(args as number[])
        break
      case OPS.setFillCMYKColor:
        this.setFillCMYK(args as number[])
        break
      case OPS.setStrokeCMYKColor:
        this.setStrokeCMYK(args as number[])
        break
      case OPS.setFillColorSpace:
        this.currentState.fillColorSpace = args[0] as string
        break
      case OPS.setStrokeColorSpace:
        this.currentState.strokeColorSpace = args[0] as string
        break
        
      // Text operations
      case OPS.beginText:
        this.isInTextBlock = true
        this.currentTextState = {}
        break
      case OPS.endText:
        this.isInTextBlock = false
        break
      case OPS.setFont:
        this.currentTextState.fontName = args[0] as string
        this.currentTextState.fontSize = args[1] as number
        break
      case OPS.showText:
      case OPS.showSpacedText:
        this.createTextObject(args)
        break
      case OPS.setTextMatrix:
        // Store text matrix for positioning
        break
        
      // Images
      case OPS.paintXObject:
        await this.createImageObject(args[0] as string, page)
        break
        
      // Shading
      case OPS.shadingFill:
        this.createShadingObject(args[0] as string)
        break
    }
  }
  
  /**
   * Save graphics state
   */
  private saveState(): void {
    this.stateStack.push({ ...this.currentState })
  }
  
  /**
   * Restore graphics state
   */
  private restoreState(): void {
    if (this.stateStack.length > 0) {
      this.currentState = this.stateStack.pop()!
    }
  }
  
  /**
   * Apply transformation matrix
   */
  private applyTransform(args: number[]): void {
    const [a, b, c, d, e, f] = args
    const current = this.currentState.transform
    
    // Matrix multiplication
    this.currentState.transform = {
      a: current.a * a + current.c * b,
      b: current.b * a + current.d * b,
      c: current.a * c + current.c * d,
      d: current.b * c + current.d * d,
      e: current.a * e + current.c * f + current.e,
      f: current.b * e + current.d * f + current.f
    }
  }
  
  /**
   * Parse line cap value
   */
  private parseLineCap(value: number): 'butt' | 'round' | 'square' {
    switch (value) {
      case 0: return 'butt'
      case 1: return 'round'
      case 2: return 'square'
      default: return 'butt'
    }
  }
  
  /**
   * Parse line join value
   */
  private parseLineJoin(value: number): 'miter' | 'round' | 'bevel' {
    switch (value) {
      case 0: return 'miter'
      case 1: return 'round'
      case 2: return 'bevel'
      default: return 'miter'
    }
  }
  
  /**
   * Add rectangle to current path
   */
  private addRectangle(args: number[]): void {
    const [x, y, w, h] = args
    this.currentPath.push({ type: 'M', points: [{ x, y }] })
    this.currentPath.push({ type: 'L', points: [{ x: x + w, y }] })
    this.currentPath.push({ type: 'L', points: [{ x: x + w, y: y + h }] })
    this.currentPath.push({ type: 'L', points: [{ x, y: y + h }] })
    this.currentPath.push({ type: 'Z', points: [] })
  }
  
  /**
   * Set fill color to gray
   */
  private setFillGray(gray: number): void {
    this.currentState.fillColor = {
      space: 'DeviceGray',
      gray,
      tint: 1,
      alpha: this.currentState.opacity
    }
  }
  
  /**
   * Set stroke color to gray
   */
  private setStrokeGray(gray: number): void {
    this.currentState.strokeColor = {
      space: 'DeviceGray',
      gray,
      tint: 1,
      alpha: this.currentState.strokeOpacity
    }
  }
  
  /**
   * Set fill color to RGB
   */
  private setFillRGB(args: number[]): void {
    this.currentState.fillColor = {
      space: 'DeviceRGB',
      rgb: { r: args[0], g: args[1], b: args[2] },
      tint: 1,
      alpha: this.currentState.opacity
    }
  }
  
  /**
   * Set stroke color to RGB
   */
  private setStrokeRGB(args: number[]): void {
    this.currentState.strokeColor = {
      space: 'DeviceRGB',
      rgb: { r: args[0], g: args[1], b: args[2] },
      tint: 1,
      alpha: this.currentState.strokeOpacity
    }
  }
  
  /**
   * Set fill color to CMYK
   */
  private setFillCMYK(args: number[]): void {
    this.currentState.fillColor = {
      space: 'DeviceCMYK',
      cmyk: { c: args[0], m: args[1], y: args[2], k: args[3] },
      tint: 1,
      alpha: this.currentState.opacity
    }
  }
  
  /**
   * Set stroke color to CMYK
   */
  private setStrokeCMYK(args: number[]): void {
    this.currentState.strokeColor = {
      space: 'DeviceCMYK',
      cmyk: { c: args[0], m: args[1], y: args[2], k: args[3] },
      tint: 1,
      alpha: this.currentState.strokeOpacity
    }
  }
  
  /**
   * Create path object from current path
   */
  private createPathObject(
    paintType: 'stroke' | 'fill' | 'fillStroke',
    closePath: boolean,
    fillRule: 'nonzero' | 'evenodd' = 'nonzero'
  ): void {
    if (this.currentPath.length === 0) return
    
    if (closePath && this.currentPath[this.currentPath.length - 1]?.type !== 'Z') {
      this.currentPath.push({ type: 'Z', points: [] })
    }
    
    const bounds = this.calculatePathBounds(this.currentPath)
    
    const pathData: PathData = {
      commands: [...this.currentPath],
      fillRule,
      closed: closePath || this.currentPath.some(cmd => cmd.type === 'Z'),
      lineCap: this.currentState.lineCap,
      lineJoin: this.currentState.lineJoin,
      miterLimit: this.currentState.miterLimit,
      dashArray: this.currentState.dashArray.length > 0 ? [...this.currentState.dashArray] : undefined,
      dashPhase: this.currentState.dashPhase
    }
    
    const object: PDFObject = {
      id: this.generateObjectId(),
      type: 'PATH',
      bounds,
      transform: { ...this.currentState.transform },
      fillColor: (paintType === 'fill' || paintType === 'fillStroke') 
        ? this.currentState.fillColor 
        : undefined,
      strokeColor: (paintType === 'stroke' || paintType === 'fillStroke') 
        ? this.currentState.strokeColor 
        : undefined,
      strokeWidth: (paintType === 'stroke' || paintType === 'fillStroke') 
        ? this.currentState.lineWidth 
        : undefined,
      overprint: this.currentState.overprint,
      overprintMode: this.currentState.overprintMode,
      knockout: !this.currentState.overprint,
      blendMode: this.currentState.blendMode,
      opacity: this.currentState.opacity,
      pathData
    }
    
    this.objects.push(object)
    this.currentPath = []
  }
  
  /**
   * Create text object
   */
  private createTextObject(args: unknown[]): void {
    // Extract text content
    let content = ''
    if (Array.isArray(args[0])) {
      // showSpacedText - array of strings and numbers
      for (const item of args[0]) {
        if (typeof item === 'string') {
          content += item
        }
      }
    } else if (typeof args[0] === 'string') {
      content = args[0]
    }
    
    if (!content) return
    
    const textData: TextData = {
      content,
      fontName: this.currentTextState.fontName || 'Unknown',
      fontSize: this.currentTextState.fontSize || 12,
      isEmbedded: false,
      isSubset: false,
      fontType: 'TrueType',
      charSpacing: 0,
      wordSpacing: 0,
      horizontalScaling: 100,
      leading: 0,
      rise: 0,
      renderMode: 0,
      position: { x: 0, y: 0 },
      textMatrix: { ...this.currentState.transform }
    }
    
    // Estimate bounds based on font size and content length
    const estimatedWidth = content.length * (textData.fontSize * 0.5)
    const bounds: BoundingBox = {
      x: this.currentState.transform.e,
      y: this.currentState.transform.f,
      width: estimatedWidth,
      height: textData.fontSize
    }
    
    const object: PDFObject = {
      id: this.generateObjectId(),
      type: 'TEXT',
      bounds,
      transform: { ...this.currentState.transform },
      fillColor: this.currentState.fillColor,
      strokeColor: this.currentState.strokeColor,
      overprint: this.currentState.overprint,
      overprintMode: this.currentState.overprintMode,
      knockout: !this.currentState.overprint,
      blendMode: this.currentState.blendMode,
      opacity: this.currentState.opacity,
      textData
    }
    
    this.objects.push(object)
  }
  
  /**
   * Create image object
   */
  private async createImageObject(name: string, page: PDFPageProxy): Promise<void> {
    try {
      // Get image data from page objects
      const objs = page.objs
      
      // Create placeholder image object
      const bounds: BoundingBox = {
        x: this.currentState.transform.e,
        y: this.currentState.transform.f,
        width: Math.abs(this.currentState.transform.a),
        height: Math.abs(this.currentState.transform.d)
      }
      
      const imageData: ImageData = {
        width: bounds.width,
        height: bounds.height,
        bitsPerComponent: 8,
        colorSpace: 'DeviceRGB',
        hasAlpha: false,
        filter: [],
        effectiveDPI: {
          horizontal: 72,
          vertical: 72
        },
        isMask: false
      }
      
      const object: PDFObject = {
        id: this.generateObjectId(),
        type: 'IMAGE',
        bounds,
        transform: { ...this.currentState.transform },
        overprint: this.currentState.overprint,
        overprintMode: this.currentState.overprintMode,
        knockout: !this.currentState.overprint,
        blendMode: this.currentState.blendMode,
        opacity: this.currentState.opacity,
        imageData
      }
      
      this.objects.push(object)
    } catch (error) {
      console.warn('Failed to extract image:', name, error)
    }
  }
  
  /**
   * Create shading object
   */
  private createShadingObject(name: string): void {
    const bounds: BoundingBox = {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    }
    
    const shadingData: ShadingData = {
      type: 2, // Axial gradient
      colorSpace: 'DeviceCMYK',
      stops: [],
      extend: [true, true]
    }
    
    const object: PDFObject = {
      id: this.generateObjectId(),
      type: 'SHADING',
      bounds,
      transform: { ...this.currentState.transform },
      overprint: this.currentState.overprint,
      overprintMode: this.currentState.overprintMode,
      knockout: !this.currentState.overprint,
      blendMode: this.currentState.blendMode,
      opacity: this.currentState.opacity,
      shadingData
    }
    
    this.objects.push(object)
  }
  
  /**
   * Calculate bounding box for path
   */
  private calculatePathBounds(commands: PathCommand[]): BoundingBox {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    for (const cmd of commands) {
      for (const point of cmd.points) {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      }
    }
    
    if (!isFinite(minX)) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }
  
  /**
   * Generate unique object ID
   */
  private generateObjectId(): string {
    return `obj_${++this.objectIdCounter}`
  }
  
  /**
   * Get all extracted objects
   */
  getObjects(): PDFObject[] {
    return this.objects
  }
  
  /**
   * Get objects by type
   */
  getObjectsByType(type: PDFObjectType): PDFObject[] {
    return this.objects.filter(obj => obj.type === type)
  }
  
  /**
   * Get path objects
   */
  getPathObjects(): PDFObject[] {
    return this.getObjectsByType('PATH')
  }
  
  /**
   * Get text objects
   */
  getTextObjects(): PDFObject[] {
    return this.getObjectsByType('TEXT')
  }
  
  /**
   * Get image objects
   */
  getImageObjects(): PDFObject[] {
    return this.getObjectsByType('IMAGE')
  }
  
  /**
   * Reset extractor state
   */
  reset(): void {
    this.objects = []
    this.objectIdCounter = 0
    this.stateStack = []
    this.currentState = this.createDefaultState()
    this.currentPath = []
    this.currentTextState = {}
    this.isInTextBlock = false
  }
}
