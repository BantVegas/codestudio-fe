/**
 * GPCS CodeStudio - Parametric Die Engine
 * 
 * Generates die lines for LABELS (etikety) - rectangles, rounded rectangles, ovals, circles.
 */

import type {
  DieLineInfo,
  DiePath,
  DieSegment,
  DieLineType,
  Point2D,
  MaterialSpec,
  StandardDef
} from '../DieLineTypes'

export interface LabelDimensions {
  width: number   // Label width in mm
  height: number  // Label height in mm
  cornerRadius?: number  // Corner radius for rounded rectangles
  bleed?: number  // Bleed amount in mm
}

export type LabelShape = 'RECTANGLE' | 'ROUNDED_RECTANGLE' | 'OVAL' | 'CIRCLE'

export class ParametricEngine {

  /**
   * Generate label die line
   */
  public generateLabel(
    shape: LabelShape,
    dims: LabelDimensions,
    material?: MaterialSpec
  ): DieLineInfo {
    switch (shape) {
      case 'RECTANGLE':
        return this.generateRectangle(dims, material)
      case 'ROUNDED_RECTANGLE':
        return this.generateRoundedRectangle(dims, material)
      case 'OVAL':
        return this.generateOval(dims, material)
      case 'CIRCLE':
        return this.generateCircle(dims, material)
      default:
        return this.generateRectangle(dims, material)
    }
  }

  /**
   * Generate rectangular label
   */
  public generateRectangle(dims: LabelDimensions, material?: MaterialSpec): DieLineInfo {
    const { width, height, bleed = 0 } = dims
    const segments: DieSegment[] = []
    let segId = 0

    const addSegment = (x1: number, y1: number, x2: number, y2: number, lineType: DieLineType): void => {
      segments.push({
        id: `seg_${segId++}`,
        type: 'LINE',
        lineType,
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 }
      })
    }

    const margin = 5 // Starting margin
    const x = margin
    const y = margin

    // Die cut rectangle (CUT lines)
    addSegment(x, y, x + width, y, 'CUT')                    // Bottom
    addSegment(x + width, y, x + width, y + height, 'CUT')   // Right
    addSegment(x + width, y + height, x, y + height, 'CUT')  // Top
    addSegment(x, y + height, x, y, 'CUT')                   // Left

    // Bleed rectangle if specified
    if (bleed > 0) {
      const bx = x - bleed
      const by = y - bleed
      const bw = width + 2 * bleed
      const bh = height + 2 * bleed
      addSegment(bx, by, bx + bw, by, 'BLEED')
      addSegment(bx + bw, by, bx + bw, by + bh, 'BLEED')
      addSegment(bx + bw, by + bh, bx, by + bh, 'BLEED')
      addSegment(bx, by + bh, bx, by, 'BLEED')
    }

    return this.createDieLineInfo(`Rectangle ${width}×${height}`, segments, material)
  }

  /**
   * Generate rounded rectangle label
   */
  public generateRoundedRectangle(dims: LabelDimensions, material?: MaterialSpec): DieLineInfo {
    const { width, height, cornerRadius = 5, bleed = 0 } = dims
    const r = Math.min(cornerRadius, width / 2, height / 2)
    const segments: DieSegment[] = []
    let segId = 0

    const addLine = (x1: number, y1: number, x2: number, y2: number, lineType: DieLineType): void => {
      segments.push({
        id: `seg_${segId++}`,
        type: 'LINE',
        lineType,
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 }
      })
    }

    // Approximate rounded corners with line segments
    const addCorner = (cx: number, cy: number, startAngle: number, lineType: DieLineType): void => {
      const steps = 8
      for (let i = 0; i < steps; i++) {
        const a1 = startAngle + (Math.PI / 2) * (i / steps)
        const a2 = startAngle + (Math.PI / 2) * ((i + 1) / steps)
        const x1 = cx + r * Math.cos(a1)
        const y1 = cy + r * Math.sin(a1)
        const x2 = cx + r * Math.cos(a2)
        const y2 = cy + r * Math.sin(a2)
        addLine(x1, y1, x2, y2, lineType)
      }
    }

    const margin = 5
    const x = margin
    const y = margin

    // Bottom edge
    addLine(x + r, y, x + width - r, y, 'CUT')
    // Bottom-right corner
    addCorner(x + width - r, y + r, -Math.PI / 2, 'CUT')
    // Right edge
    addLine(x + width, y + r, x + width, y + height - r, 'CUT')
    // Top-right corner
    addCorner(x + width - r, y + height - r, 0, 'CUT')
    // Top edge
    addLine(x + width - r, y + height, x + r, y + height, 'CUT')
    // Top-left corner
    addCorner(x + r, y + height - r, Math.PI / 2, 'CUT')
    // Left edge
    addLine(x, y + height - r, x, y + r, 'CUT')
    // Bottom-left corner
    addCorner(x + r, y + r, Math.PI, 'CUT')

    return this.createDieLineInfo(`Rounded Rectangle ${width}×${height} R${r}`, segments, material)
  }

  /**
   * Generate oval/ellipse label
   */
  public generateOval(dims: LabelDimensions, material?: MaterialSpec): DieLineInfo {
    const { width, height } = dims
    const segments: DieSegment[] = []
    let segId = 0

    const margin = 5
    const cx = margin + width / 2
    const cy = margin + height / 2
    const rx = width / 2
    const ry = height / 2

    // Approximate ellipse with line segments
    const steps = 32
    for (let i = 0; i < steps; i++) {
      const a1 = (2 * Math.PI * i) / steps
      const a2 = (2 * Math.PI * (i + 1)) / steps
      const x1 = cx + rx * Math.cos(a1)
      const y1 = cy + ry * Math.sin(a1)
      const x2 = cx + rx * Math.cos(a2)
      const y2 = cy + ry * Math.sin(a2)
      
      segments.push({
        id: `seg_${segId++}`,
        type: 'LINE',
        lineType: 'CUT',
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 }
      })
    }

    return this.createDieLineInfo(`Oval ${width}×${height}`, segments, material)
  }

  /**
   * Generate circle label
   */
  public generateCircle(dims: LabelDimensions, material?: MaterialSpec): DieLineInfo {
    const diameter = Math.min(dims.width, dims.height)
    return this.generateOval({ width: diameter, height: diameter }, material)
  }

  /**
   * Legacy method for box generation (kept for compatibility)
   */
  public generateECMA_A20(
    dims: { L: number; W: number; D: number },
    material: MaterialSpec
  ): DieLineInfo {
    // Convert to label dimensions and generate rectangle
    return this.generateRectangle({ 
      width: dims.L, 
      height: dims.W,
      bleed: 3 
    }, material)
  }

  /**
   * Create DieLineInfo from segments
   */
  private createDieLineInfo(
    name: string, 
    segments: DieSegment[], 
    material?: MaterialSpec
  ): DieLineInfo {
    // Calculate bounds
    const allPoints: Point2D[] = segments.flatMap(s => [s.start, s.end])
    const minX = Math.min(...allPoints.map(p => p.x))
    const maxX = Math.max(...allPoints.map(p => p.x))
    const minY = Math.min(...allPoints.map(p => p.y))
    const maxY = Math.max(...allPoints.map(p => p.y))
    
    const totalWidth = maxX - minX
    const totalHeight = maxY - minY

    const path: DiePath = {
      id: 'main_path',
      segments,
      isClosed: true,
      lineType: 'CUT',
      bounds: {
        minX, minY, maxX, maxY,
        width: totalWidth,
        height: totalHeight
      }
    }

    return {
      id: `label_${Date.now()}`,
      format: 'UNKNOWN',
      name,
      created: new Date(),
      modified: new Date(),
      unit: 'MM',
      width: totalWidth,
      height: totalHeight,
      paths: [path],
      layers: ['Main'],
      material,
      warnings: [],
      errors: []
    }
  }
}

export const parametricEngine = new ParametricEngine()
