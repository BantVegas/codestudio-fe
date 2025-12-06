/**
 * GPCS CodeStudio - Trap Rules Panel
 * ESKO-kompatibilný rule-based engine UI
 */

import React, { useState } from 'react'

export interface TrapEngineRule {
  id: string
  name: string
  description: string
  priority: number
  enabled: boolean
  conditions: TrapRuleCondition[]
  action: TrapRuleAction
}

export interface TrapRuleCondition {
  type: string
  operator: string
  value: string | number | boolean | [number, number]
  target: 'SOURCE' | 'TARGET' | 'BOTH' | 'EITHER'
}

export interface TrapRuleAction {
  type: string
  distanceMm?: number
  distancePercent?: number
  colorOverride?: string
  truncation?: string
}

interface TrapRulesPanelProps {
  rules: TrapEngineRule[]
  onRuleToggle: (ruleId: string) => void
  onRuleUpdate: (ruleId: string, updates: Partial<TrapEngineRule>) => void
  onRuleDelete: (ruleId: string) => void
  onRuleCreate: (rule: Omit<TrapEngineRule, 'id'>) => void
  onRulesReorder: (ruleIds: string[]) => void
  onResetToDefaults: () => void
}

const CONDITION_TYPES = [
  { value: 'COLOR_TYPE', label: 'Color Type' },
  { value: 'LUMINANCE_DIFF', label: 'Luminance Difference' },
  { value: 'INK_STRENGTH_DIFF', label: 'Ink Strength Diff' },
  { value: 'OBJECT_TYPE', label: 'Object Type' },
  { value: 'OBJECT_SIZE', label: 'Object Size' },
  { value: 'LINE_WIDTH', label: 'Line Width' },
  { value: 'TEXT_SIZE', label: 'Text Size' },
  { value: 'HAS_TRAP_TAG', label: 'Has Trap Tag' },
  { value: 'IS_KNOCKOUT', label: 'Is Knockout' },
  { value: 'IS_OVERPRINT', label: 'Is Overprint' },
  { value: 'ADJACENT_TO_BLACK', label: 'Adjacent to Black' },
  { value: 'ADJACENT_TO_WHITE', label: 'Adjacent to White' },
  { value: 'IS_NEGATIVE_TEXT', label: 'Is Negative Text' },
  { value: 'IS_RICH_BLACK', label: 'Is Rich Black' },
]

const ACTION_TYPES = [
  { value: 'TRAP', label: 'Apply Trap', color: 'text-green-400' },
  { value: 'NO_TRAP', label: 'No Trap', color: 'text-red-400' },
  { value: 'SPREAD', label: 'Spread', color: 'text-cyan-400' },
  { value: 'CHOKE', label: 'Choke', color: 'text-orange-400' },
  { value: 'CENTERLINE', label: 'Centerline', color: 'text-yellow-400' },
  { value: 'REVERSE_KNOCKOUT', label: 'Reverse Knockout', color: 'text-purple-400' },
  { value: 'PULLBACK', label: 'Pullback', color: 'text-pink-400' },
]

export const TrapRulesPanel: React.FC<TrapRulesPanelProps> = ({
  rules,
  onRuleToggle,
  onRuleUpdate,
  onRuleDelete,
  onRuleCreate,
  onResetToDefaults
}) => {
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRule, setNewRule] = useState<Partial<TrapEngineRule>>({
    name: '',
    description: '',
    priority: 50,
    enabled: true,
    conditions: [],
    action: { type: 'TRAP' }
  })

  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)

  const getActionColor = (type: string) => {
    return ACTION_TYPES.find(a => a.value === type)?.color || 'text-slate-400'
  }

  const handleCreateRule = () => {
    if (newRule.name && newRule.action) {
      onRuleCreate({
        name: newRule.name,
        description: newRule.description || '',
        priority: newRule.priority || 50,
        enabled: true,
        conditions: newRule.conditions || [],
        action: newRule.action as TrapRuleAction
      })
      setNewRule({
        name: '',
        description: '',
        priority: 50,
        enabled: true,
        conditions: [],
        action: { type: 'TRAP' }
      })
      setShowCreateForm(false)
    }
  }

  return (
    <div className="h-full flex flex-col text-sm">
      {/* Header */}
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-pink-400">⚙️ Trap Rules Engine</h3>
          <span className="text-xs text-slate-500">{rules.filter(r => r.enabled).length}/{rules.length} active</span>
        </div>
        
        <p className="text-xs text-slate-500">
          Rules are evaluated by priority (highest first). First matching rule wins.
        </p>
      </div>

      {/* Actions */}
      <div className="p-2 border-b border-slate-700 flex gap-2">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex-1 py-1.5 bg-pink-600 hover:bg-pink-500 rounded text-xs transition-colors"
        >
          + New Rule
        </button>
        <button
          onClick={onResetToDefaults}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
          title="Reset to ESKO defaults"
        >
          ↺ Reset
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="p-3 bg-slate-800/50 border-b border-slate-700 space-y-2">
          <input
            type="text"
            value={newRule.name}
            onChange={e => setNewRule({ ...newRule, name: e.target.value })}
            placeholder="Rule name..."
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs"
          />
          
          <input
            type="text"
            value={newRule.description}
            onChange={e => setNewRule({ ...newRule, description: e.target.value })}
            placeholder="Description..."
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500">Priority</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newRule.priority}
                onChange={e => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Action</label>
              <select
                value={newRule.action?.type}
                onChange={e => setNewRule({ ...newRule, action: { type: e.target.value } })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
              >
                {ACTION_TYPES.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateRule}
              disabled={!newRule.name}
              className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 rounded text-xs"
            >
              Create Rule
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto">
        {sortedRules.map((rule) => (
          <div
            key={rule.id}
            className={`border-b border-slate-800 ${!rule.enabled ? 'opacity-50' : ''}`}
          >
            {/* Rule Header */}
            <div
              onClick={() => setExpandedRuleId(expandedRuleId === rule.id ? null : rule.id)}
              className="p-2 cursor-pointer hover:bg-slate-800/50 flex items-center gap-2"
            >
              {/* Enable Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRuleToggle(rule.id)
                }}
                className={`w-4 h-4 rounded border ${
                  rule.enabled 
                    ? 'bg-green-500 border-green-400' 
                    : 'bg-slate-700 border-slate-600'
                }`}
              >
                {rule.enabled && <span className="text-xs">✓</span>}
              </button>

              {/* Priority Badge */}
              <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded font-mono">
                {rule.priority}
              </span>

              {/* Name & Action */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{rule.name}</div>
                <div className={`text-xs ${getActionColor(rule.action.type)}`}>
                  → {ACTION_TYPES.find(a => a.value === rule.action.type)?.label}
                  {rule.action.distanceMm && ` (${rule.action.distanceMm}mm)`}
                  {rule.action.distancePercent && ` (${rule.action.distancePercent}%)`}
                </div>
              </div>

              {/* Expand Arrow */}
              <span className="text-slate-500 text-xs">
                {expandedRuleId === rule.id ? '▼' : '▶'}
              </span>
            </div>

            {/* Expanded Details */}
            {expandedRuleId === rule.id && (
              <div className="px-3 pb-3 space-y-2 bg-slate-800/30">
                <p className="text-xs text-slate-500">{rule.description}</p>

                {/* Conditions */}
                <div>
                  <div className="text-xs text-slate-400 mb-1">Conditions:</div>
                  {rule.conditions.length === 0 ? (
                    <div className="text-xs text-slate-600 italic">No conditions (always matches)</div>
                  ) : (
                    <div className="space-y-1">
                      {rule.conditions.map((cond, i) => (
                        <div key={i} className="text-xs bg-slate-700/50 px-2 py-1 rounded flex items-center gap-1">
                          <span className="text-cyan-400">{cond.target}</span>
                          <span className="text-slate-400">{CONDITION_TYPES.find(c => c.value === cond.type)?.label}</span>
                          <span className="text-yellow-400">{cond.operator}</span>
                          <span className="text-green-400">{String(cond.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Details */}
                <div>
                  <div className="text-xs text-slate-400 mb-1">Action:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Type</label>
                      <select
                        value={rule.action.type}
                        onChange={e => onRuleUpdate(rule.id, { 
                          action: { ...rule.action, type: e.target.value } 
                        })}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                      >
                        {ACTION_TYPES.map(a => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Distance (mm)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={rule.action.distanceMm || ''}
                        onChange={e => onRuleUpdate(rule.id, { 
                          action: { ...rule.action, distanceMm: e.target.value ? parseFloat(e.target.value) : undefined } 
                        })}
                        placeholder="Default"
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs text-slate-500">Priority (0-100, higher = evaluated first)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={rule.priority}
                    onChange={e => onRuleUpdate(rule.id, { priority: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Delete */}
                <button
                  onClick={() => onRuleDelete(rule.id)}
                  className="w-full py-1 bg-red-600/50 hover:bg-red-600 rounded text-xs"
                >
                  🗑️ Delete Rule
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-700 bg-slate-800/50 text-xs text-slate-500">
        <div className="flex justify-between">
          <span>Evaluation order: Priority ↓</span>
          <span>First match wins</span>
        </div>
      </div>
    </div>
  )
}

export default TrapRulesPanel
