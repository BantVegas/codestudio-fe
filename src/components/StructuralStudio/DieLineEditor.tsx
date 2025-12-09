/**
 * GPCS CodeStudio - Die Line Editor Tools
 * 
 * Professional editing tools for die line manipulation
 */

import { useState, useCallback } from 'react'
import type { DieLineInfo, DiePath, DieSegment, DieLineType, Point2D } from '../../prepress/dieline/DieLineTypes'

export type EditorTool = 
  | 'SELECT' 
  | 'MOVE' 
  | 'SCALE' 
  | 'ROTATE' 
  | 'ADD_POINT' 
  | 'DELETE_POINT'
  | 'ADD_LINE'
  | 'ADD_RECT'
  | 'ADD_CIRCLE'
  | 'ADD_OVAL'
  | 'MEASURE'
  | 'ALIGN'

interface UseDieLineEditorProps {
  dieLine: DieLineInfo | null
  onDieLineChange: (dieLine: DieLineInfo) => void
}

export const useDieLineEditor = ({
  dieLine,
  onDieLineChange
}: UseDieLineEditorProps) => {
  const [selectedSegments, setSelectedSegments] = useState<string[]>([])
  const [activeTool, setActiveTool] = useState<EditorTool>('SELECT')

  // Transform operations
  const transformDieLine = useCallback((
    transform: (seg: DieSegment) => DieSegment
  ) => {
    if (!dieLine) return

    const newPaths = dieLine.paths.map(path => ({
      ...path,
      segments: path.segments.map(seg => 
        selectedSegments.length === 0 || selectedSegments.includes(seg.id)
          ? transform(seg)
          : seg
      )
    }))

    // Recalculate bounds
    const allPoints: Point2D[] = newPaths.flatMap(p => 
      p.segments.flatMap(s => [s.start, s.end])
    )
    const minX = Math.min(...allPoints.map(p => p.x))
    const maxX = Math.max(...allPoints.map(p => p.x))
    const minY = Math.min(...allPoints.map(p => p.y))
    const maxY = Math.max(...allPoints.map(p => p.y))

    onDieLineChange({
      ...dieLine,
      paths: newPaths.map(p => ({
        ...p,
        bounds: {
          minX, minY, maxX, maxY,
          width: maxX - minX,
          height: maxY - minY
        }
      })),
      width: maxX - minX,
      height: maxY - minY
    })
  }, [dieLine, selectedSegments, onDieLineChange])

  // Move
  const move = useCallback((dx: number, dy: number) => {
    transformDieLine(seg => ({
      ...seg,
      start: { x: seg.start.x + dx, y: seg.start.y + dy },
      end: { x: seg.end.x + dx, y: seg.end.y + dy },
      center: seg.center ? { x: seg.center.x + dx, y: seg.center.y + dy } : undefined
    }))
  }, [transformDieLine])

  // Scale
  const scale = useCallback((factor: number) => {
    if (!dieLine) return
    const cx = dieLine.width / 2 + 5
    const cy = dieLine.height / 2 + 5

    transformDieLine(seg => ({
      ...seg,
      start: { 
        x: cx + (seg.start.x - cx) * factor, 
        y: cy + (seg.start.y - cy) * factor 
      },
      end: { 
        x: cx + (seg.end.x - cx) * factor, 
        y: cy + (seg.end.y - cy) * factor 
      },
      center: seg.center ? { 
        x: cx + (seg.center.x - cx) * factor, 
        y: cy + (seg.center.y - cy) * factor 
      } : undefined
    }))
  }, [dieLine, transformDieLine])

  // Rotate
  const rotate = useCallback((angleDeg: number) => {
    if (!dieLine) return
    const cx = dieLine.width / 2 + 5
    const cy = dieLine.height / 2 + 5
    const rad = angleDeg * Math.PI / 180

    const rotatePoint = (p: Point2D): Point2D => ({
      x: cx + (p.x - cx) * Math.cos(rad) - (p.y - cy) * Math.sin(rad),
      y: cy + (p.x - cx) * Math.sin(rad) + (p.y - cy) * Math.cos(rad)
    })

    transformDieLine(seg => ({
      ...seg,
      start: rotatePoint(seg.start),
      end: rotatePoint(seg.end),
      center: seg.center ? rotatePoint(seg.center) : undefined
    }))
  }, [dieLine, transformDieLine])

  // Mirror
  const mirror = useCallback((axis: 'horizontal' | 'vertical') => {
    if (!dieLine) return
    const cx = dieLine.width / 2 + 5
    const cy = dieLine.height / 2 + 5

    transformDieLine(seg => ({
      ...seg,
      start: axis === 'horizontal' 
        ? { x: 2 * cx - seg.start.x, y: seg.start.y }
        : { x: seg.start.x, y: 2 * cy - seg.start.y },
      end: axis === 'horizontal'
        ? { x: 2 * cx - seg.end.x, y: seg.end.y }
        : { x: seg.end.x, y: 2 * cy - seg.end.y },
      center: seg.center ? (axis === 'horizontal'
        ? { x: 2 * cx - seg.center.x, y: seg.center.y }
        : { x: seg.center.x, y: 2 * cy - seg.center.y }
      ) : undefined
    }))
  }, [dieLine, transformDieLine])

  // Change line type
  const changeLineType = useCallback((lineType: DieLineType) => {
    transformDieLine(seg => ({ ...seg, lineType }))
  }, [transformDieLine])

  // Add shape
  const addShape = useCallback((shape: 'rect' | 'circle' | 'oval', params: {
    x: number, y: number, width: number, height: number
  }) => {
    if (!dieLine) return

    const newSegments: DieSegment[] = []
    let segId = Date.now()

    if (shape === 'rect') {
      const { x, y, width, height } = params
      newSegments.push(
        { id: `seg_${segId++}`, type: 'LINE', lineType: 'CUT', start: { x, y }, end: { x: x + width, y } },
        { id: `seg_${segId++}`, type: 'LINE', lineType: 'CUT', start: { x: x + width, y }, end: { x: x + width, y: y + height } },
        { id: `seg_${segId++}`, type: 'LINE', lineType: 'CUT', start: { x: x + width, y: y + height }, end: { x, y: y + height } },
        { id: `seg_${segId++}`, type: 'LINE', lineType: 'CUT', start: { x, y: y + height }, end: { x, y } }
      )
    } else {
      const { x, y, width, height } = params
      const cx = x + width / 2
      const cy = y + height / 2
      const rx = width / 2
      const ry = shape === 'circle' ? rx : height / 2
      const steps = 32

      for (let i = 0; i < steps; i++) {
        const a1 = (2 * Math.PI * i) / steps
        const a2 = (2 * Math.PI * (i + 1)) / steps
        newSegments.push({
          id: `seg_${segId++}`,
          type: 'LINE',
          lineType: 'CUT',
          start: { x: cx + rx * Math.cos(a1), y: cy + ry * Math.sin(a1) },
          end: { x: cx + rx * Math.cos(a2), y: cy + ry * Math.sin(a2) }
        })
      }
    }

    const newPath: DiePath = {
      id: `path_${Date.now()}`,
      segments: newSegments,
      isClosed: true,
      lineType: 'CUT',
      bounds: {
        minX: params.x,
        minY: params.y,
        maxX: params.x + params.width,
        maxY: params.y + params.height,
        width: params.width,
        height: params.height
      }
    }

    onDieLineChange({
      ...dieLine,
      paths: [...dieLine.paths, newPath]
    })
  }, [dieLine, onDieLineChange])

  // Delete selected
  const deleteSelected = useCallback(() => {
    if (!dieLine || selectedSegments.length === 0) return

    const newPaths = dieLine.paths.map(path => ({
      ...path,
      segments: path.segments.filter(seg => !selectedSegments.includes(seg.id))
    })).filter(path => path.segments.length > 0)

    onDieLineChange({
      ...dieLine,
      paths: newPaths
    })
    setSelectedSegments([])
  }, [dieLine, selectedSegments, onDieLineChange])

  // Select all
  const selectAll = useCallback(() => {
    if (!dieLine) return
    const allIds = dieLine.paths.flatMap(p => p.segments.map(s => s.id))
    setSelectedSegments(allIds)
  }, [dieLine])

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedSegments([])
  }, [])

  return {
    selectedSegments,
    setSelectedSegments,
    move,
    scale,
    rotate,
    mirror,
    changeLineType,
    addShape,
    deleteSelected,
    selectAll,
    deselectAll,
    activeTool,
    setActiveTool
  }
}

// Tool definitions
export const EDITOR_TOOLS: { id: EditorTool; label: string; icon: string; shortcut?: string }[] = [
  { id: 'SELECT', label: 'Výber', icon: '↖', shortcut: 'V' },
  { id: 'MOVE', label: 'Presun', icon: '✥', shortcut: 'M' },
  { id: 'SCALE', label: 'Mierka', icon: '⤢', shortcut: 'S' },
  { id: 'ROTATE', label: 'Rotácia', icon: '↻', shortcut: 'R' },
  { id: 'ADD_RECT', label: 'Obdĺžnik', icon: '▭', shortcut: 'U' },
  { id: 'ADD_CIRCLE', label: 'Kruh', icon: '○', shortcut: 'O' },
  { id: 'ADD_OVAL', label: 'Ovál', icon: '⬭', shortcut: 'E' },
  { id: 'ADD_LINE', label: 'Čiara', icon: '/', shortcut: 'L' },
  { id: 'MEASURE', label: 'Meranie', icon: '📏', shortcut: 'I' },
  { id: 'ALIGN', label: 'Zarovnanie', icon: '⊞', shortcut: 'A' },
]

// Line type options
export const LINE_TYPE_OPTIONS: { id: DieLineType; label: string; color: string }[] = [
  { id: 'CUT', label: 'Rez (CUT)', color: '#ef4444' },
  { id: 'CREASE', label: 'Ohyb (CREASE)', color: '#22c55e' },
  { id: 'PERFORATION', label: 'Perforácia', color: '#eab308' },
  { id: 'SCORE', label: 'Ryha (SCORE)', color: '#14b8a6' },
  { id: 'BLEED', label: 'Spadávka (BLEED)', color: '#3b82f6' },
]
