/**
 * GPCS CodeStudio - Trap Tags Panel
 * ESKO-kompatibilný systém pre selektívny trapping
 */

import React, { useState } from 'react'

export type TrapTagMode = 'AUTO' | 'ALWAYS' | 'NEVER'
export type TrapTagDirection = 'AUTO' | 'IN' | 'OUT' | 'CENTERLINE'

export interface TrapTag {
  id: string
  objectId: string
  objectName?: string
  trappingMode: TrapTagMode
  trappingDirection: TrapTagDirection
  customDistanceMm?: number
  reverseMode: TrapTagMode
  reverseDirection: TrapTagDirection
  reverseDistanceMm?: number
  priorityOverride?: number
  pullBackOverride?: 'AUTO' | 'FORCE' | 'NEVER'
  note?: string
  createdAt: Date
}

interface TrapTagsPanelProps {
  tags: TrapTag[]
  selectedTagIds: string[]
  onTagSelect: (tagId: string, multi?: boolean) => void
  onTagCreate: (objectIds: string[]) => void
  onTagUpdate: (tagId: string, updates: Partial<TrapTag>) => void
  onTagDelete: (tagIds: string[]) => void
  onApplyToSelection: (tag: Partial<TrapTag>) => void
  selectedObjectIds: string[]
  totalObjects: number
}

export const TrapTagsPanel: React.FC<TrapTagsPanelProps> = ({
  tags,
  selectedTagIds,
  onTagSelect,
  onTagCreate,
  onTagUpdate,
  onTagDelete,
  onApplyToSelection,
  selectedObjectIds,
  totalObjects
}) => {
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkSettings, setBulkSettings] = useState<Partial<TrapTag>>({
    trappingMode: 'AUTO',
    trappingDirection: 'AUTO',
    reverseMode: 'AUTO',
    reverseDirection: 'AUTO'
  })

  const getModeColor = (mode: TrapTagMode) => {
    switch (mode) {
      case 'ALWAYS': return 'text-green-400'
      case 'NEVER': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  const getModeIcon = (mode: TrapTagMode) => {
    switch (mode) {
      case 'ALWAYS': return '✓'
      case 'NEVER': return '✗'
      default: return '◐'
    }
  }

  return (
    <div className="h-full flex flex-col text-sm">
      {/* Header */}
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-pink-400">🏷️ Trap Tags</h3>
          <span className="text-xs text-slate-500">{tags.length} tags</span>
        </div>
        
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-1 text-xs">
          <div className="bg-slate-800 rounded p-1.5 text-center">
            <div className="text-green-400 font-medium">{tags.filter(t => t.trappingMode === 'ALWAYS').length}</div>
            <div className="text-slate-500">Always</div>
          </div>
          <div className="bg-slate-800 rounded p-1.5 text-center">
            <div className="text-red-400 font-medium">{tags.filter(t => t.trappingMode === 'NEVER').length}</div>
            <div className="text-slate-500">Never</div>
          </div>
          <div className="bg-slate-800 rounded p-1.5 text-center">
            <div className="text-slate-300 font-medium">{tags.filter(t => t.trappingMode === 'AUTO').length}</div>
            <div className="text-slate-500">Auto</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-2 border-b border-slate-700 space-y-1">
        <button
          onClick={() => onTagCreate(selectedObjectIds)}
          disabled={selectedObjectIds.length === 0}
          className="w-full py-1.5 bg-pink-600 hover:bg-pink-500 disabled:bg-slate-700 disabled:text-slate-500 rounded text-xs transition-colors"
        >
          + Tag Selected Objects ({selectedObjectIds.length})
        </button>
        
        <button
          onClick={() => setShowBulkEdit(!showBulkEdit)}
          disabled={selectedTagIds.length === 0}
          className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-xs transition-colors"
        >
          ✏️ Bulk Edit ({selectedTagIds.length} selected)
        </button>
      </div>

      {/* Bulk Edit Panel */}
      {showBulkEdit && selectedTagIds.length > 0 && (
        <div className="p-2 bg-slate-800/50 border-b border-slate-700 space-y-2">
          <div className="text-xs text-slate-400 mb-1">Apply to {selectedTagIds.length} tags:</div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500">Trapping</label>
              <select
                value={bulkSettings.trappingMode}
                onChange={e => setBulkSettings({ ...bulkSettings, trappingMode: e.target.value as TrapTagMode })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
              >
                <option value="AUTO">Auto</option>
                <option value="ALWAYS">Always</option>
                <option value="NEVER">Never</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Direction</label>
              <select
                value={bulkSettings.trappingDirection}
                onChange={e => setBulkSettings({ ...bulkSettings, trappingDirection: e.target.value as TrapTagDirection })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
              >
                <option value="AUTO">Auto</option>
                <option value="IN">In (Choke)</option>
                <option value="OUT">Out (Spread)</option>
                <option value="CENTERLINE">Centerline</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500">Reverse</label>
              <select
                value={bulkSettings.reverseMode}
                onChange={e => setBulkSettings({ ...bulkSettings, reverseMode: e.target.value as TrapTagMode })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
              >
                <option value="AUTO">Auto</option>
                <option value="ALWAYS">Always</option>
                <option value="NEVER">Never</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Rev. Direction</label>
              <select
                value={bulkSettings.reverseDirection}
                onChange={e => setBulkSettings({ ...bulkSettings, reverseDirection: e.target.value as TrapTagDirection })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
              >
                <option value="AUTO">Auto</option>
                <option value="IN">In</option>
                <option value="OUT">Out</option>
                <option value="CENTERLINE">Centerline</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              onApplyToSelection(bulkSettings)
              setShowBulkEdit(false)
            }}
            className="w-full py-1.5 bg-green-600 hover:bg-green-500 rounded text-xs"
          >
            Apply to Selected
          </button>
        </div>
      )}

      {/* Tags List */}
      <div className="flex-1 overflow-y-auto">
        {tags.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">
            <div className="text-2xl mb-2">🏷️</div>
            <p>No trap tags defined</p>
            <p className="mt-1">Select objects and click "Tag Selected"</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {tags.map(tag => (
              <div
                key={tag.id}
                onClick={() => onTagSelect(tag.id)}
                className={`p-2 cursor-pointer transition-colors ${
                  selectedTagIds.includes(tag.id)
                    ? 'bg-pink-900/30 border-l-2 border-pink-500'
                    : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate">
                    {tag.objectName || `Object ${tag.objectId.slice(0, 8)}`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingTagId(editingTagId === tag.id ? null : tag.id)
                    }}
                    className="text-slate-500 hover:text-white text-xs"
                  >
                    ⚙️
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {/* Trapping Mode */}
                  <span className={`${getModeColor(tag.trappingMode)}`}>
                    {getModeIcon(tag.trappingMode)} Trap
                  </span>
                  
                  {/* Direction */}
                  <span className="text-slate-500">
                    {tag.trappingDirection === 'IN' ? '←' : 
                     tag.trappingDirection === 'OUT' ? '→' : 
                     tag.trappingDirection === 'CENTERLINE' ? '↔' : '◐'}
                  </span>

                  {/* Reverse Mode */}
                  <span className={`${getModeColor(tag.reverseMode)}`}>
                    {getModeIcon(tag.reverseMode)} Rev
                  </span>

                  {/* Custom distance */}
                  {tag.customDistanceMm && (
                    <span className="text-cyan-400">{tag.customDistanceMm}mm</span>
                  )}
                </div>

                {/* Expanded Edit */}
                {editingTagId === tag.id && (
                  <div className="mt-2 pt-2 border-t border-slate-700 space-y-2" onClick={e => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500">Trapping</label>
                        <select
                          value={tag.trappingMode}
                          onChange={e => onTagUpdate(tag.id, { trappingMode: e.target.value as TrapTagMode })}
                          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                        >
                          <option value="AUTO">Auto</option>
                          <option value="ALWAYS">Always</option>
                          <option value="NEVER">Never</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Direction</label>
                        <select
                          value={tag.trappingDirection}
                          onChange={e => onTagUpdate(tag.id, { trappingDirection: e.target.value as TrapTagDirection })}
                          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                        >
                          <option value="AUTO">Auto</option>
                          <option value="IN">In (Choke)</option>
                          <option value="OUT">Out (Spread)</option>
                          <option value="CENTERLINE">Centerline</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500">Reverse</label>
                        <select
                          value={tag.reverseMode}
                          onChange={e => onTagUpdate(tag.id, { reverseMode: e.target.value as TrapTagMode })}
                          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                        >
                          <option value="AUTO">Auto</option>
                          <option value="ALWAYS">Always</option>
                          <option value="NEVER">Never</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Distance (mm)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={tag.customDistanceMm || ''}
                          onChange={e => onTagUpdate(tag.id, { 
                            customDistanceMm: e.target.value ? parseFloat(e.target.value) : undefined 
                          })}
                          placeholder="Default"
                          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500">Priority Override (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tag.priorityOverride || ''}
                        onChange={e => onTagUpdate(tag.id, { 
                          priorityOverride: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder="Auto"
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-500">Note</label>
                      <input
                        type="text"
                        value={tag.note || ''}
                        onChange={e => onTagUpdate(tag.id, { note: e.target.value })}
                        placeholder="Optional note..."
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                      />
                    </div>

                    <button
                      onClick={() => onTagDelete([tag.id])}
                      className="w-full py-1 bg-red-600/50 hover:bg-red-600 rounded text-xs"
                    >
                      🗑️ Delete Tag
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-2 border-t border-slate-700 bg-slate-800/50">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Tagged: {tags.length} / {totalObjects}</span>
          <span>Exceptions: {tags.filter(t => t.trappingMode !== 'AUTO' || t.reverseMode !== 'AUTO').length}</span>
        </div>
      </div>
    </div>
  )
}

export default TrapTagsPanel
