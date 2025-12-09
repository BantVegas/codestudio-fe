/**
 * GPCS CodeStudio - Universal Die Line Import/Export
 * 
 * Professional-grade import for vector graphics files
 * Supports: SVG, PDF, AI, EPS, CDR (CorelDRAW), DXF, and more
 */

import type { DieLineInfo, DiePath, DieSegment, DieLineType, Point2D } from './DieLineTypes'

export class PDFDieLineIO {
  
  /**
   * Import die line from file
   * Supports: SVG, PDF, AI, EPS, and PostScript-based formats
   */
  public async importFromFile(file: File): Promise<DieLineInfo> {
    const fileName = file.name.toLowerCase()
    
    // SVG - best support
    if (fileName.endsWith('.svg')) {
      return this.importFromSVG(file)
    }
    
    // EPS - PostScript based
    if (fileName.endsWith('.eps')) {
      return this.importFromEPS(file)
    }
    
    // PDF, AI, and other PostScript-based formats
    return this.importFromPDFOrAI(file)
  }

  /**
   * Import from EPS file (Encapsulated PostScript)
   */
  private async importFromEPS(file: File): Promise<DieLineInfo> {
    const text = await file.text()
    const segments: DieSegment[] = []
    let segId = 0
    
    // EPS uses PostScript syntax similar to AI
    // Look for path definitions
    const pathData = this.extractPostScriptPaths(text)
    
    for (const path of pathData) {
      segments.push(...this.parsePostScriptPath(path, segId))
      segId = segments.length
    }
    
    // Also try to extract from any embedded preview
    if (segments.length === 0) {
      segments.push(...this.extractCoordinatesFromText(text, segId))
    }

    return this.createDieLineInfo(file.name, segments)
  }

  /**
   * Extract PostScript paths from EPS/AI content
   */
  private extractPostScriptPaths(content: string): string[] {
    const paths: string[] = []
    
    // Look for path definitions in PostScript
    // Common patterns: moveto (m), lineto (l), curveto (c), closepath (h/H)
    
    // Find content between stream and endstream (PDF embedded)
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/gi
    let match
    
    while ((match = streamRegex.exec(content)) !== null) {
      const streamContent = match[1]
      if (/\d+\.?\d*\s+\d+\.?\d*\s+[mlcvhszMLCVHSZ]/i.test(streamContent)) {
        paths.push(streamContent)
      }
    }
    
    // Look for direct PostScript path data
    const psPathRegex = /(\d+\.?\d*\s+\d+\.?\d*\s+m[\s\S]*?[fFsSnNhH])/gi
    while ((match = psPathRegex.exec(content)) !== null) {
      paths.push(match[1])
    }
    
    // Look for newpath...stroke/fill patterns
    const newpathRegex = /newpath\s*([\s\S]*?)\s*(?:stroke|fill|closepath)/gi
    while ((match = newpathRegex.exec(content)) !== null) {
      paths.push(match[1])
    }
    
    return paths
  }

  /**
   * Import from PDF or AI file
   * AI files are essentially PDF with Illustrator private data
   */
  private async importFromPDFOrAI(file: File): Promise<DieLineInfo> {
    const text = await file.text()
    const segments: DieSegment[] = []
    let segId = 0
    
    // Try to find embedded AI/EPS content (Illustrator saves paths in readable format)
    // Look for PostScript path operators
    const pathData = this.extractAIPathData(text)
    
    if (pathData.length > 0) {
      for (const path of pathData) {
        segments.push(...this.parsePostScriptPath(path, segId))
        segId = segments.length
      }
    }
    
    // If no paths found, try PDF stream parsing
    if (segments.length === 0) {
      const pdfPaths = this.extractPDFStreams(text)
      for (const stream of pdfPaths) {
        segments.push(...this.parsePDFStream(stream, segId))
        segId = segments.length
      }
    }
    
    // If still no paths, try to find any coordinate patterns
    if (segments.length === 0) {
      segments.push(...this.extractCoordinatesFromText(text, segId))
    }

    return this.createDieLineInfo(file.name, segments)
  }

  /**
   * Import from SVG file - most reliable for Illustrator exports
   */
  private async importFromSVG(file: File): Promise<DieLineInfo> {
    const text = await file.text()
    const segments: DieSegment[] = []
    let segId = 0
    
    // Parse SVG paths
    const pathRegex = /<path[^>]*d="([^"]+)"[^>]*>/gi
    let match
    
    while ((match = pathRegex.exec(text)) !== null) {
      const d = match[1]
      const layer = this.extractSVGLayer(match[0])
      segments.push(...this.parseSVGPath(d, segId, layer))
      segId = segments.length
    }
    
    // Parse SVG lines
    const lineRegex = /<line[^>]*x1="([^"]+)"[^>]*y1="([^"]+)"[^>]*x2="([^"]+)"[^>]*y2="([^"]+)"[^>]*/gi
    while ((match = lineRegex.exec(text)) !== null) {
      segments.push({
        id: `seg_${segId++}`,
        type: 'LINE',
        lineType: 'CUT',
        start: { x: parseFloat(match[1]), y: parseFloat(match[2]) },
        end: { x: parseFloat(match[3]), y: parseFloat(match[4]) }
      })
    }
    
    // Parse SVG rects
    const rectRegex = /<rect[^>]*x="([^"]+)"[^>]*y="([^"]+)"[^>]*width="([^"]+)"[^>]*height="([^"]+)"[^>]*/gi
    while ((match = rectRegex.exec(text)) !== null) {
      const x = parseFloat(match[1]) || 0
      const y = parseFloat(match[2]) || 0
      const w = parseFloat(match[3])
      const h = parseFloat(match[4])
      
      segments.push(
        { id: `seg_${segId++}`, type: 'LINE', lineType: 'CUT', start: { x, y }, end: { x: x + w, y } },
        { id: `seg_${segId++}`, type: 'LINE', lineType: 'CUT', start: { x: x + w, y }, end: { x: x + w, y: y + h } },
        { id: `seg_${segId++}`, type: 'LINE', lineType: 'CUT', start: { x: x + w, y: y + h }, end: { x, y: y + h } },
        { id: `seg_${segId++}`, type: 'LINE', lineType: 'CUT', start: { x, y: y + h }, end: { x, y } }
      )
    }
    
    // Parse SVG circles
    const circleRegex = /<circle[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"[^>]*r="([^"]+)"[^>]*/gi
    while ((match = circleRegex.exec(text)) !== null) {
      const cx = parseFloat(match[1])
      const cy = parseFloat(match[2])
      const r = parseFloat(match[3])
      
      const steps = 32
      for (let i = 0; i < steps; i++) {
        const a1 = (2 * Math.PI * i) / steps
        const a2 = (2 * Math.PI * (i + 1)) / steps
        segments.push({
          id: `seg_${segId++}`,
          type: 'LINE',
          lineType: 'CUT',
          start: { x: cx + r * Math.cos(a1), y: cy + r * Math.sin(a1) },
          end: { x: cx + r * Math.cos(a2), y: cy + r * Math.sin(a2) }
        })
      }
    }
    
    // Parse SVG ellipses
    const ellipseRegex = /<ellipse[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"[^>]*rx="([^"]+)"[^>]*ry="([^"]+)"[^>]*/gi
    while ((match = ellipseRegex.exec(text)) !== null) {
      const cx = parseFloat(match[1])
      const cy = parseFloat(match[2])
      const rx = parseFloat(match[3])
      const ry = parseFloat(match[4])
      
      const steps = 32
      for (let i = 0; i < steps; i++) {
        const a1 = (2 * Math.PI * i) / steps
        const a2 = (2 * Math.PI * (i + 1)) / steps
        segments.push({
          id: `seg_${segId++}`,
          type: 'LINE',
          lineType: 'CUT',
          start: { x: cx + rx * Math.cos(a1), y: cy + ry * Math.sin(a1) },
          end: { x: cx + rx * Math.cos(a2), y: cy + ry * Math.sin(a2) }
        })
      }
    }
    
    // Parse SVG polygons
    const polygonRegex = /<polygon[^>]*points="([^"]+)"[^>]*/gi
    while ((match = polygonRegex.exec(text)) !== null) {
      const points = this.parsePointsString(match[1])
      for (let i = 0; i < points.length; i++) {
        const next = (i + 1) % points.length
        segments.push({
          id: `seg_${segId++}`,
          type: 'LINE',
          lineType: 'CUT',
          start: points[i],
          end: points[next]
        })
      }
    }
    
    // Parse SVG polylines
    const polylineRegex = /<polyline[^>]*points="([^"]+)"[^>]*/gi
    while ((match = polylineRegex.exec(text)) !== null) {
      const points = this.parsePointsString(match[1])
      for (let i = 0; i < points.length - 1; i++) {
        segments.push({
          id: `seg_${segId++}`,
          type: 'LINE',
          lineType: 'CUT',
          start: points[i],
          end: points[i + 1]
        })
      }
    }

    return this.createDieLineInfo(file.name, segments)
  }

  /**
   * Extract AI path data from PDF/AI file
   */
  private extractAIPathData(content: string): string[] {
    const paths: string[] = []
    
    // Look for AI path definitions (between %%BeginProlog and %%EndProlog or in streams)
    // AI uses PostScript-like syntax: x y m (moveto), x y l (lineto), x y x y x y c (curveto)
    
    // Find content between stream and endstream
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/gi
    let match
    
    while ((match = streamRegex.exec(content)) !== null) {
      const streamContent = match[1]
      // Check if it contains path operators
      if (/\d+\.?\d*\s+\d+\.?\d*\s+[mlcvhszMLCVHSZ]/i.test(streamContent)) {
        paths.push(streamContent)
      }
    }
    
    // Also look for direct PostScript path data
    const psPathRegex = /(\d+\.?\d*\s+\d+\.?\d*\s+m[\s\S]*?[fFsSnN])/gi
    while ((match = psPathRegex.exec(content)) !== null) {
      paths.push(match[1])
    }
    
    return paths
  }

  /**
   * Extract PDF content streams
   */
  private extractPDFStreams(content: string): string[] {
    const streams: string[] = []
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/gi
    let match
    
    while ((match = streamRegex.exec(content)) !== null) {
      streams.push(match[1])
    }
    
    return streams
  }

  /**
   * Parse PostScript/PDF path commands
   */
  private parsePostScriptPath(pathData: string, startId: number): DieSegment[] {
    const segments: DieSegment[] = []
    let segId = startId
    let currentX = 0
    let currentY = 0
    let startX = 0
    let startY = 0
    
    // Tokenize - split by whitespace but keep numbers together
    const tokens = pathData.match(/-?\d+\.?\d*|[a-zA-Z]/g) || []
    
    let i = 0
    while (i < tokens.length) {
      const token = tokens[i]
      
      if (token === 'm' || token === 'M') {
        // moveto
        if (i >= 2) {
          currentX = parseFloat(tokens[i - 2])
          currentY = parseFloat(tokens[i - 1])
          startX = currentX
          startY = currentY
        }
        i++
      } else if (token === 'l' || token === 'L') {
        // lineto
        if (i >= 2) {
          const x = parseFloat(tokens[i - 2])
          const y = parseFloat(tokens[i - 1])
          if (!isNaN(x) && !isNaN(y) && !isNaN(currentX) && !isNaN(currentY)) {
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType: 'CUT',
              start: { x: currentX, y: currentY },
              end: { x, y }
            })
            currentX = x
            currentY = y
          }
        }
        i++
      } else if (token === 'c' || token === 'C') {
        // curveto - approximate with line to endpoint
        if (i >= 6) {
          const x = parseFloat(tokens[i - 2])
          const y = parseFloat(tokens[i - 1])
          if (!isNaN(x) && !isNaN(y) && !isNaN(currentX) && !isNaN(currentY)) {
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType: 'CUT',
              start: { x: currentX, y: currentY },
              end: { x, y }
            })
            currentX = x
            currentY = y
          }
        }
        i++
      } else if (token === 'h' || token === 'H' || token === 'z' || token === 'Z' || token === 's' || token === 'S') {
        // closepath
        if (currentX !== startX || currentY !== startY) {
          segments.push({
            id: `seg_${segId++}`,
            type: 'LINE',
            lineType: 'CUT',
            start: { x: currentX, y: currentY },
            end: { x: startX, y: startY }
          })
        }
        currentX = startX
        currentY = startY
        i++
      } else {
        i++
      }
    }
    
    return segments
  }

  /**
   * Parse PDF stream content
   */
  private parsePDFStream(stream: string, startId: number): DieSegment[] {
    return this.parsePostScriptPath(stream, startId)
  }

  /**
   * Extract coordinates from any text
   */
  private extractCoordinatesFromText(text: string, startId: number): DieSegment[] {
    const segments: DieSegment[] = []
    let segId = startId
    
    // Find coordinate pairs
    const coordRegex = /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(?:m|l|L|M)/g
    const points: Point2D[] = []
    let match
    
    while ((match = coordRegex.exec(text)) !== null) {
      points.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) })
    }
    
    // Create lines from points
    for (let i = 0; i < points.length - 1; i++) {
      segments.push({
        id: `seg_${segId++}`,
        type: 'LINE',
        lineType: 'CUT',
        start: points[i],
        end: points[i + 1]
      })
    }
    
    return segments
  }

  /**
   * Parse SVG path d attribute
   */
  private parseSVGPath(d: string, startId: number, layer: string): DieSegment[] {
    const segments: DieSegment[] = []
    let segId = startId
    let currentX = 0
    let currentY = 0
    let startX = 0
    let startY = 0
    
    const lineType = this.getLineTypeFromLayer(layer)
    
    // Parse SVG path commands
    const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || []
    
    for (const cmd of commands) {
      const type = cmd[0]
      const args = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n))
      
      switch (type) {
        case 'M': // Absolute moveto
          currentX = args[0] || 0
          currentY = args[1] || 0
          startX = currentX
          startY = currentY
          break
          
        case 'm': // Relative moveto
          currentX += args[0] || 0
          currentY += args[1] || 0
          startX = currentX
          startY = currentY
          break
          
        case 'L': // Absolute lineto
          for (let i = 0; i < args.length; i += 2) {
            const x = args[i]
            const y = args[i + 1]
            if (x !== undefined && y !== undefined) {
              segments.push({
                id: `seg_${segId++}`,
                type: 'LINE',
                lineType,
                start: { x: currentX, y: currentY },
                end: { x, y }
              })
              currentX = x
              currentY = y
            }
          }
          break
          
        case 'l': // Relative lineto
          for (let i = 0; i < args.length; i += 2) {
            const x = currentX + (args[i] || 0)
            const y = currentY + (args[i + 1] || 0)
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType,
              start: { x: currentX, y: currentY },
              end: { x, y }
            })
            currentX = x
            currentY = y
          }
          break
          
        case 'H': // Absolute horizontal
          for (const x of args) {
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType,
              start: { x: currentX, y: currentY },
              end: { x, y: currentY }
            })
            currentX = x
          }
          break
          
        case 'h': // Relative horizontal
          for (const dx of args) {
            const x = currentX + dx
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType,
              start: { x: currentX, y: currentY },
              end: { x, y: currentY }
            })
            currentX = x
          }
          break
          
        case 'V': // Absolute vertical
          for (const y of args) {
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType,
              start: { x: currentX, y: currentY },
              end: { x: currentX, y }
            })
            currentY = y
          }
          break
          
        case 'v': // Relative vertical
          for (const dy of args) {
            const y = currentY + dy
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType,
              start: { x: currentX, y: currentY },
              end: { x: currentX, y }
            })
            currentY = y
          }
          break
          
        case 'C': // Absolute cubic bezier - approximate with line to endpoint
          for (let i = 0; i < args.length; i += 6) {
            const x = args[i + 4]
            const y = args[i + 5]
            if (x !== undefined && y !== undefined) {
              // Approximate curve with multiple segments
              const cp1x = args[i], cp1y = args[i + 1]
              const cp2x = args[i + 2], cp2y = args[i + 3]
              const curveSegments = this.approximateCubicBezier(
                currentX, currentY, cp1x, cp1y, cp2x, cp2y, x, y, segId, lineType
              )
              segments.push(...curveSegments)
              segId += curveSegments.length
              currentX = x
              currentY = y
            }
          }
          break
          
        case 'c': // Relative cubic bezier
          for (let i = 0; i < args.length; i += 6) {
            const x = currentX + (args[i + 4] || 0)
            const y = currentY + (args[i + 5] || 0)
            const cp1x = currentX + (args[i] || 0)
            const cp1y = currentY + (args[i + 1] || 0)
            const cp2x = currentX + (args[i + 2] || 0)
            const cp2y = currentY + (args[i + 3] || 0)
            const curveSegments = this.approximateCubicBezier(
              currentX, currentY, cp1x, cp1y, cp2x, cp2y, x, y, segId, lineType
            )
            segments.push(...curveSegments)
            segId += curveSegments.length
            currentX = x
            currentY = y
          }
          break
          
        case 'Z':
        case 'z': // Close path
          if (Math.abs(currentX - startX) > 0.01 || Math.abs(currentY - startY) > 0.01) {
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType,
              start: { x: currentX, y: currentY },
              end: { x: startX, y: startY }
            })
          }
          currentX = startX
          currentY = startY
          break
      }
    }
    
    return segments
  }

  /**
   * Approximate cubic bezier curve with line segments
   */
  private approximateCubicBezier(
    x0: number, y0: number,
    cp1x: number, cp1y: number,
    cp2x: number, cp2y: number,
    x: number, y: number,
    startId: number,
    lineType: DieLineType
  ): DieSegment[] {
    const segments: DieSegment[] = []
    const steps = 8
    let prevX = x0
    let prevY = y0
    
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const t2 = t * t
      const t3 = t2 * t
      const mt = 1 - t
      const mt2 = mt * mt
      const mt3 = mt2 * mt
      
      const px = mt3 * x0 + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * x
      const py = mt3 * y0 + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * y
      
      segments.push({
        id: `seg_${startId + i - 1}`,
        type: 'LINE',
        lineType,
        start: { x: prevX, y: prevY },
        end: { x: px, y: py }
      })
      
      prevX = px
      prevY = py
    }
    
    return segments
  }

  /**
   * Parse SVG points string
   */
  private parsePointsString(pointsStr: string): Point2D[] {
    const points: Point2D[] = []
    const coords = pointsStr.trim().split(/[\s,]+/).map(parseFloat)
    
    for (let i = 0; i < coords.length; i += 2) {
      if (!isNaN(coords[i]) && !isNaN(coords[i + 1])) {
        points.push({ x: coords[i], y: coords[i + 1] })
      }
    }
    
    return points
  }

  /**
   * Extract layer info from SVG element
   */
  private extractSVGLayer(element: string): string {
    const idMatch = element.match(/id="([^"]+)"/)
    const classMatch = element.match(/class="([^"]+)"/)
    return idMatch?.[1] || classMatch?.[1] || 'Default'
  }

  /**
   * Get line type from layer name
   */
  private getLineTypeFromLayer(layer: string): DieLineType {
    const upper = layer.toUpperCase()
    if (upper.includes('CUT') || upper.includes('DIE')) return 'CUT'
    if (upper.includes('CREASE') || upper.includes('FOLD')) return 'CREASE'
    if (upper.includes('PERF')) return 'PERFORATION'
    if (upper.includes('BLEED')) return 'BLEED'
    if (upper.includes('SCORE')) return 'SCORE'
    return 'CUT'
  }

  /**
   * Create DieLineInfo from segments
   */
  private createDieLineInfo(fileName: string, segments: DieSegment[]): DieLineInfo {
    // Calculate bounds
    if (segments.length === 0) {
      return {
        id: `import_${Date.now()}`,
        format: 'UNKNOWN',
        name: fileName.replace(/\.[^.]+$/, ''),
        created: new Date(),
        modified: new Date(),
        unit: 'MM',
        width: 100,
        height: 60,
        paths: [],
        layers: ['Main'],
        warnings: ['Žiadne cesty neboli nájdené v súbore. Skúste exportovať ako SVG.'],
        errors: []
      }
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    for (const seg of segments) {
      minX = Math.min(minX, seg.start.x, seg.end.x)
      minY = Math.min(minY, seg.start.y, seg.end.y)
      maxX = Math.max(maxX, seg.start.x, seg.end.x)
      maxY = Math.max(maxY, seg.start.y, seg.end.y)
    }
    
    const width = maxX - minX
    const height = maxY - minY

    // Normalize coordinates (move to origin with small margin)
    const margin = 5
    const normalizedSegments = segments.map(seg => ({
      ...seg,
      start: { x: seg.start.x - minX + margin, y: seg.start.y - minY + margin },
      end: { x: seg.end.x - minX + margin, y: seg.end.y - minY + margin }
    }))

    const path: DiePath = {
      id: 'main_path',
      segments: normalizedSegments,
      isClosed: true,
      lineType: 'CUT',
      bounds: { 
        minX: margin, 
        minY: margin, 
        maxX: width + margin, 
        maxY: height + margin, 
        width, 
        height 
      }
    }

    return {
      id: `import_${Date.now()}`,
      format: 'UNKNOWN',
      name: fileName.replace(/\.[^.]+$/, ''),
      created: new Date(),
      modified: new Date(),
      unit: 'MM',
      width,
      height,
      paths: [path],
      layers: ['Main'],
      warnings: [],
      errors: []
    }
  }

  /**
   * Export die line to SVG (more reliable than PDF)
   */
  public exportToSVG(dieLine: DieLineInfo): string {
    const margin = 10
    const width = dieLine.width + margin * 2
    const height = dieLine.height + margin * 2
    
    let pathD = ''
    for (const path of dieLine.paths) {
      for (let i = 0; i < path.segments.length; i++) {
        const seg = path.segments[i]
        if (i === 0) {
          pathD += `M ${seg.start.x + margin} ${seg.start.y + margin} `
        }
        pathD += `L ${seg.end.x + margin} ${seg.end.y + margin} `
      }
      pathD += 'Z '
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${width}mm" height="${height}mm" 
     viewBox="0 0 ${width} ${height}">
  <title>${dieLine.name} - Die Line</title>
  <g id="CUT" stroke="#FF0000" stroke-width="0.25" fill="none">
    <path d="${pathD.trim()}"/>
  </g>
</svg>`
  }

  /**
   * Download SVG
   */
  public downloadSVG(dieLine: DieLineInfo): void {
    const svg = this.exportToSVG(dieLine)
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dieLine.name.replace(/[^a-zA-Z0-9]/g, '_')}_dieline.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Export to PDF
   */
  public downloadPDF(dieLine: DieLineInfo): void {
    const ptPerMM = 2.83465
    const margin = 10
    const width = (dieLine.width + margin * 2) * ptPerMM
    const height = (dieLine.height + margin * 2) * ptPerMM
    
    let pathCommands = ''
    for (const path of dieLine.paths) {
      for (let i = 0; i < path.segments.length; i++) {
        const seg = path.segments[i]
        const x1 = (seg.start.x + margin) * ptPerMM
        const y1 = height - (seg.start.y + margin) * ptPerMM
        const x2 = (seg.end.x + margin) * ptPerMM
        const y2 = height - (seg.end.y + margin) * ptPerMM
        
        if (i === 0) {
          pathCommands += `${x1.toFixed(2)} ${y1.toFixed(2)} m\n`
        }
        pathCommands += `${x2.toFixed(2)} ${y2.toFixed(2)} l\n`
      }
    }
    pathCommands += 'h S\n'
    
    const stream = `q\n1 0 0 RG\n0.5 w\n${pathCommands}Q\n`
    
    const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${width.toFixed(0)} ${height.toFixed(0)}]/Contents 4 0 R/Resources<<>>>>endobj
4 0 obj<</Length ${stream.length}>>stream
${stream}endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000102 00000 n 
0000000230 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
${300 + stream.length}
%%EOF`
    
    const blob = new Blob([pdf], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dieLine.name.replace(/[^a-zA-Z0-9]/g, '_')}_dieline.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export const pdfDieLineIO = new PDFDieLineIO()
