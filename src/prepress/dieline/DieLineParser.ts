/**
 * GPCS CodeStudio - Die Line Parser
 * 
 * Parser for CAD formats CFF2 and DXF (including Illustrator exports)
 */

import {
  CFF2_LINE_TYPE_MAP,
  DXF_LAYER_MAP
} from './DieLineTypes'

import type {
  DieFormat,
  DieLineInfo,
  DiePath,
  DieSegment,
  DieLineType,
  Point2D,
} from './DieLineTypes'

export class DieLineParser {
  
  /**
   * Parse die line file content
   */
  public parse(content: string, fileName: string): DieLineInfo {
    const format = this.detectFormat(content, fileName)
    
    switch (format) {
      case 'CFF2':
        return this.parseCFF2(content, fileName)
      case 'DXF':
        return this.parseDXF(content, fileName)
      default:
        // Try to parse as generic text with coordinates
        return this.parseGeneric(content, fileName)
    }
  }

  /**
   * Detect format based on content or extension
   */
  private detectFormat(content: string, fileName: string): DieFormat {
    const ext = fileName.split('.').pop()?.toUpperCase()
    
    if (ext === 'CFF' || ext === 'CF2') return 'CFF2'
    if (ext === 'DXF') return 'DXF'
    
    // Content check
    if (content.includes('CFF2') || content.startsWith('BOF')) return 'CFF2'
    if (content.includes('SECTION') || content.includes('ENTITIES') || content.includes('ENDSEC')) return 'DXF'
    
    return 'UNKNOWN'
  }

  /**
   * Parse CFF2 (Common File Format 2)
   */
  private parseCFF2(content: string, fileName: string): DieLineInfo {
    const lines = content.split(/\r?\n/)
    const segments: DieSegment[] = []
    const warnings: string[] = []
    
    let unit: 'MM' | 'INCH' = 'MM'
    let segId = 0
    
    for (const line of lines) {
      const parts = line.trim().split(/[,\s]+/)
      const command = parts[0]?.toUpperCase()

      if (command === 'UNITS') {
        if (parts[1]?.toUpperCase() === 'INCH') unit = 'INCH'
      } else if (command === 'L' || command === 'LINE') {
        // Line segment: L, x1, y1, x2, y2, [type]
        if (parts.length >= 5) {
          const x1 = parseFloat(parts[1])
          const y1 = parseFloat(parts[2])
          const x2 = parseFloat(parts[3])
          const y2 = parseFloat(parts[4])
          const typeCode = parts.length > 5 ? parseInt(parts[5]) : 1
          
          if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType: CFF2_LINE_TYPE_MAP[typeCode] || 'CUT',
              start: { x: x1, y: y1 },
              end: { x: x2, y: y2 }
            })
          }
        }
      } else if (command === 'A' || command === 'ARC') {
        // Arc segment
        if (parts.length >= 7) {
          const x1 = parseFloat(parts[1])
          const y1 = parseFloat(parts[2])
          const x2 = parseFloat(parts[3])
          const y2 = parseFloat(parts[4])
          const cx = parseFloat(parts[5])
          const cy = parseFloat(parts[6])
          
          if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
            segments.push({
              id: `seg_${segId++}`,
              type: 'ARC',
              lineType: 'CUT',
              start: { x: x1, y: y1 },
              end: { x: x2, y: y2 },
              center: { x: cx, y: cy }
            })
          }
        }
      }
    }

    return this.createDieLineInfo(fileName, 'CFF2', unit, segments, warnings)
  }

  /**
   * Parse DXF (Drawing Exchange Format)
   * Supports Illustrator exports with LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC, SPLINE
   */
  private parseDXF(content: string, fileName: string): DieLineInfo {
    const segments: DieSegment[] = []
    const warnings: string[] = []
    let segId = 0
    
    // Split into lines and parse as group code pairs
    const lines = content.split(/\r?\n/)
    
    // Find ENTITIES section
    let inEntities = false
    let currentEntity = ''
    let entityData: Record<string, string[]> = {}
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim()
      
      if (line === 'ENTITIES') {
        inEntities = true
        continue
      }
      if (line === 'ENDSEC' && inEntities) {
        // Process last entity
        if (currentEntity) {
          const parsed = this.parseDXFEntity(currentEntity, entityData, segId)
          segments.push(...parsed.segments)
          segId = parsed.nextId
        }
        break
      }
      
      if (!inEntities) continue
      
      // DXF uses group code pairs: code on one line, value on next
      const code = parseInt(line)
      const value = lines[++i]?.trim() || ''
      
      // Entity type marker (code 0)
      if (code === 0) {
        // Process previous entity
        if (currentEntity) {
          const parsed = this.parseDXFEntity(currentEntity, entityData, segId)
          segments.push(...parsed.segments)
          segId = parsed.nextId
        }
        currentEntity = value
        entityData = {}
      } else {
        // Store entity data
        if (!entityData[code]) entityData[code] = []
        entityData[code].push(value)
      }
    }

    if (segments.length === 0) {
      warnings.push('Žiadne entity neboli nájdené v DXF súbore')
    }

    return this.createDieLineInfo(fileName, 'DXF', 'MM', segments, warnings)
  }

  /**
   * Parse individual DXF entity
   */
  private parseDXFEntity(
    entityType: string, 
    data: Record<string, string[]>,
    startId: number
  ): { segments: DieSegment[], nextId: number } {
    const segments: DieSegment[] = []
    let segId = startId
    
    // Get layer name for line type
    const layer = data['8']?.[0] || 'Default'
    const lineType = this.getLineTypeFromLayer(layer)

    switch (entityType) {
      case 'LINE': {
        const x1 = parseFloat(data['10']?.[0] || '0')
        const y1 = parseFloat(data['20']?.[0] || '0')
        const x2 = parseFloat(data['11']?.[0] || '0')
        const y2 = parseFloat(data['21']?.[0] || '0')
        
        if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
          segments.push({
            id: `seg_${segId++}`,
            type: 'LINE',
            lineType,
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 }
          })
        }
        break
      }
      
      case 'LWPOLYLINE':
      case 'POLYLINE': {
        // Get all vertices (codes 10, 20 for x, y)
        const xCoords = data['10']?.map(v => parseFloat(v)) || []
        const yCoords = data['20']?.map(v => parseFloat(v)) || []
        const closed = data['70']?.[0] === '1'
        
        for (let i = 0; i < xCoords.length - 1; i++) {
          if (!isNaN(xCoords[i]) && !isNaN(yCoords[i]) && 
              !isNaN(xCoords[i + 1]) && !isNaN(yCoords[i + 1])) {
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType,
              start: { x: xCoords[i], y: yCoords[i] },
              end: { x: xCoords[i + 1], y: yCoords[i + 1] }
            })
          }
        }
        
        // Close polyline if needed
        if (closed && xCoords.length > 1) {
          const last = xCoords.length - 1
          segments.push({
            id: `seg_${segId++}`,
            type: 'LINE',
            lineType,
            start: { x: xCoords[last], y: yCoords[last] },
            end: { x: xCoords[0], y: yCoords[0] }
          })
        }
        break
      }
      
      case 'CIRCLE': {
        const cx = parseFloat(data['10']?.[0] || '0')
        const cy = parseFloat(data['20']?.[0] || '0')
        const r = parseFloat(data['40']?.[0] || '0')
        
        if (!isNaN(cx) && !isNaN(cy) && !isNaN(r) && r > 0) {
          // Approximate circle with line segments
          const steps = 32
          for (let i = 0; i < steps; i++) {
            const a1 = (2 * Math.PI * i) / steps
            const a2 = (2 * Math.PI * (i + 1)) / steps
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType,
              start: { x: cx + r * Math.cos(a1), y: cy + r * Math.sin(a1) },
              end: { x: cx + r * Math.cos(a2), y: cy + r * Math.sin(a2) }
            })
          }
        }
        break
      }
      
      case 'ARC': {
        const cx = parseFloat(data['10']?.[0] || '0')
        const cy = parseFloat(data['20']?.[0] || '0')
        const r = parseFloat(data['40']?.[0] || '0')
        const startAngle = parseFloat(data['50']?.[0] || '0') * Math.PI / 180
        const endAngle = parseFloat(data['51']?.[0] || '360') * Math.PI / 180
        
        if (!isNaN(cx) && !isNaN(cy) && !isNaN(r) && r > 0) {
          // Approximate arc with line segments
          let angleDiff = endAngle - startAngle
          if (angleDiff < 0) angleDiff += 2 * Math.PI
          
          const steps = Math.max(8, Math.ceil(angleDiff / (Math.PI / 16)))
          for (let i = 0; i < steps; i++) {
            const a1 = startAngle + (angleDiff * i) / steps
            const a2 = startAngle + (angleDiff * (i + 1)) / steps
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType,
              start: { x: cx + r * Math.cos(a1), y: cy + r * Math.sin(a1) },
              end: { x: cx + r * Math.cos(a2), y: cy + r * Math.sin(a2) }
            })
          }
        }
        break
      }
      
      case 'ELLIPSE': {
        const cx = parseFloat(data['10']?.[0] || '0')
        const cy = parseFloat(data['20']?.[0] || '0')
        const majorX = parseFloat(data['11']?.[0] || '1')
        const majorY = parseFloat(data['21']?.[0] || '0')
        const ratio = parseFloat(data['40']?.[0] || '1')
        
        const rx = Math.sqrt(majorX * majorX + majorY * majorY)
        const ry = rx * ratio
        
        if (!isNaN(cx) && !isNaN(cy) && rx > 0 && ry > 0) {
          const steps = 32
          for (let i = 0; i < steps; i++) {
            const a1 = (2 * Math.PI * i) / steps
            const a2 = (2 * Math.PI * (i + 1)) / steps
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType,
              start: { x: cx + rx * Math.cos(a1), y: cy + ry * Math.sin(a1) },
              end: { x: cx + rx * Math.cos(a2), y: cy + ry * Math.sin(a2) }
            })
          }
        }
        break
      }
      
      case 'SPLINE': {
        // Get control points
        const xCoords = data['10']?.map(v => parseFloat(v)) || []
        const yCoords = data['20']?.map(v => parseFloat(v)) || []
        
        // Approximate spline with lines through control points
        for (let i = 0; i < xCoords.length - 1; i++) {
          if (!isNaN(xCoords[i]) && !isNaN(yCoords[i])) {
            segments.push({
              id: `seg_${segId++}`,
              type: 'LINE',
              lineType,
              start: { x: xCoords[i], y: yCoords[i] },
              end: { x: xCoords[i + 1], y: yCoords[i + 1] }
            })
          }
        }
        break
      }
    }
    
    return { segments, nextId: segId }
  }

  /**
   * Get line type from layer name
   */
  private getLineTypeFromLayer(layer: string): DieLineType {
    const upperLayer = layer.toUpperCase()
    
    if (upperLayer.includes('CUT') || upperLayer.includes('DIE')) return 'CUT'
    if (upperLayer.includes('CREASE') || upperLayer.includes('FOLD')) return 'CREASE'
    if (upperLayer.includes('PERF')) return 'PERFORATION'
    if (upperLayer.includes('BLEED')) return 'BLEED'
    if (upperLayer.includes('SCORE')) return 'SCORE'
    
    // Default to CUT for die lines
    return 'CUT'
  }

  /**
   * Parse generic text file with coordinates
   */
  private parseGeneric(content: string, fileName: string): DieLineInfo {
    const segments: DieSegment[] = []
    const warnings: string[] = ['Súbor bol spracovaný ako generický formát']
    let segId = 0
    
    // Try to find coordinate pairs
    const coordRegex = /(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/g
    const points: Point2D[] = []
    let match
    
    while ((match = coordRegex.exec(content)) !== null) {
      const x = parseFloat(match[1])
      const y = parseFloat(match[2])
      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y })
      }
    }
    
    // Create lines from consecutive points
    for (let i = 0; i < points.length - 1; i++) {
      segments.push({
        id: `seg_${segId++}`,
        type: 'LINE',
        lineType: 'CUT',
        start: points[i],
        end: points[i + 1]
      })
    }
    
    // Close the shape if first and last points are close
    if (points.length > 2) {
      const first = points[0]
      const last = points[points.length - 1]
      const dist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2)
      if (dist > 0.1) {
        segments.push({
          id: `seg_${segId++}`,
          type: 'LINE',
          lineType: 'CUT',
          start: last,
          end: first
        })
      }
    }

    return this.createDieLineInfo(fileName, 'UNKNOWN', 'MM', segments, warnings)
  }

  /**
   * Create DieLineInfo from segments
   */
  private createDieLineInfo(
    fileName: string,
    format: DieFormat,
    unit: 'MM' | 'INCH',
    segments: DieSegment[],
    warnings: string[]
  ): DieLineInfo {
    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    for (const seg of segments) {
      minX = Math.min(minX, seg.start.x, seg.end.x)
      minY = Math.min(minY, seg.start.y, seg.end.y)
      maxX = Math.max(maxX, seg.start.x, seg.end.x)
      maxY = Math.max(maxY, seg.start.y, seg.end.y)
    }
    
    if (minX === Infinity) {
      minX = minY = maxX = maxY = 0
    }
    
    const width = maxX - minX
    const height = maxY - minY

    const path: DiePath = {
      id: 'main_path',
      segments,
      isClosed: segments.length > 2,
      lineType: 'CUT',
      bounds: { minX, minY, maxX, maxY, width, height }
    }

    return {
      id: `die_${Date.now()}`,
      format,
      name: fileName.replace(/\.[^.]+$/, ''),
      created: new Date(),
      modified: new Date(),
      unit,
      width,
      height,
      paths: segments.length > 0 ? [path] : [],
      layers: ['Main'],
      warnings,
      errors: segments.length === 0 ? ['Žiadne cesty neboli nájdené v súbore'] : []
    }
  }
}

export const dieLineParser = new DieLineParser()
