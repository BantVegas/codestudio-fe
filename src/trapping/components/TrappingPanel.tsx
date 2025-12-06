/**
 * GPCS CodeStudio - Auto-Trapping Engine
 * Trapping Control Panel (TODO 4)
 * 
 * Main UI for trapping settings and controls
 */

import React, { useState, useCallback } from 'react'
import type {
  TrapSettings,
  PrintingTechnology,
  TrapWarning,
  ViewMode,
} from '../types/trappingTypes'
import { DEFAULT_TRAP_SETTINGS } from '../types/trappingTypes'

interface TrappingPanelProps {
  settings: TrapSettings
  onSettingsChange: (settings: TrapSettings) => void
  onGenerateTraps: () => void
  onClearTraps: () => void
  isProcessing: boolean
  warnings: TrapWarning[]
  trapCount: number
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export const TrappingPanel: React.FC<TrappingPanelProps> = ({
  settings,
  onSettingsChange,
  onGenerateTraps,
  onClearTraps,
  isProcessing,
  warnings,
  trapCount,
  viewMode,
  onViewModeChange,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('general')

  const updateSetting = useCallback(<K extends keyof TrapSettings>(
    key: K,
    value: TrapSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value })
  }, [settings, onSettingsChange])

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const technologies: { value: PrintingTechnology; label: string }[] = [
    { value: 'FLEXO', label: 'Flexotlač' },
    { value: 'OFFSET', label: 'Offset' },
    { value: 'DIGITAL', label: 'Digitálna tlač' },
    { value: 'GRAVURE', label: 'Hĺbkotlač' },
    { value: 'SCREEN', label: 'Sieťotlač' },
  ]

  const viewModes: { value: ViewMode; label: string; icon: string }[] = [
    { value: 'NORMAL', label: 'Normálny', icon: '👁️' },
    { value: 'TRAP_OVERLAY', label: 'Trap Overlay', icon: '🎯' },
    { value: 'OVERPRINT_PREVIEW', label: 'Overprint', icon: '🔲' },
    { value: 'SEPARATION_PREVIEW', label: 'Separácie', icon: '🎨' },
  ]

  const errorCount = warnings.filter(w => w.severity === 'ERROR').length
  const warningCount = warnings.filter(w => w.severity === 'WARNING').length

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-pink-600/20 to-purple-600/20 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <h2 className="font-semibold text-lg">Auto Trapping</h2>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-slate-400">Zapnuté</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => updateSetting('enabled', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-10 h-5 rounded-full transition-colors ${
                settings.enabled ? 'bg-pink-500' : 'bg-slate-600'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                  settings.enabled ? 'translate-x-5' : 'translate-x-0.5'
                } mt-0.5`} />
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* View Mode Selector */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-800 rounded-lg">
          {viewModes.map(mode => (
            <button
              key={mode.value}
              onClick={() => onViewModeChange(mode.value)}
              className={`px-2 py-1.5 text-xs rounded-md transition-all ${
                viewMode === mode.value
                  ? 'bg-pink-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span className="mr-1">{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>

        {/* General Settings Section */}
        <CollapsibleSection
          title="Všeobecné nastavenia"
          isExpanded={expandedSection === 'general'}
          onToggle={() => toggleSection('general')}
        >
          {/* Technology */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Technológia tlače</label>
            <select
              value={settings.technology}
              onChange={(e) => updateSetting('technology', e.target.value as PrintingTechnology)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm focus:border-pink-500 focus:outline-none"
            >
              {technologies.map(tech => (
                <option key={tech.value} value={tech.value}>{tech.label}</option>
              ))}
            </select>
          </div>

          {/* Default Width */}
          <div className="space-y-2 mt-4">
            <div className="flex justify-between">
              <label className="text-xs text-slate-400">Šírka trapu</label>
              <span className="text-xs text-pink-400">{settings.defaultWidthMm.toFixed(2)} mm</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.01"
              value={settings.defaultWidthMm}
              onChange={(e) => updateSetting('defaultWidthMm', parseFloat(e.target.value))}
              className="w-full accent-pink-500"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>0.05 mm</span>
              <span>0.50 mm</span>
            </div>
          </div>

          {/* Direction Method */}
          <div className="space-y-2 mt-4">
            <label className="text-xs text-slate-400">Metóda smeru trapu</label>
            <select
              value={settings.trapDirectionMethod}
              onChange={(e) => updateSetting('trapDirectionMethod', e.target.value as TrapSettings['trapDirectionMethod'])}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm focus:border-pink-500 focus:outline-none"
            >
              <option value="NEUTRAL_DENSITY">Neutrálna hustota</option>
              <option value="LUMINANCE">Svetlosť</option>
              <option value="CHROMA">Sýtosť</option>
              <option value="CUSTOM">Vlastná</option>
            </select>
          </div>
        </CollapsibleSection>

        {/* Special Colors Section */}
        <CollapsibleSection
          title="Špeciálne farby"
          isExpanded={expandedSection === 'special'}
          onToggle={() => toggleSection('special')}
        >
          {/* Black Trapping */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Trap čiernej</span>
            <input
              type="checkbox"
              checked={settings.trapBlackToAll}
              onChange={(e) => updateSetting('trapBlackToAll', e.target.checked)}
              className="w-4 h-4 accent-pink-500"
            />
          </div>
          {settings.trapBlackToAll && (
            <div className="mt-2 pl-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Šírka</span>
                <span className="text-pink-400">{settings.blackTrapWidthMm} mm</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.01"
                value={settings.blackTrapWidthMm}
                onChange={(e) => updateSetting('blackTrapWidthMm', parseFloat(e.target.value))}
                className="w-full accent-pink-500 mt-1"
              />
            </div>
          )}

          {/* White Underprint */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm">White Underprint</span>
            <input
              type="checkbox"
              checked={settings.trapWhiteUnderprint}
              onChange={(e) => updateSetting('trapWhiteUnderprint', e.target.checked)}
              className="w-4 h-4 accent-pink-500"
            />
          </div>
          {settings.trapWhiteUnderprint && (
            <div className="mt-2 pl-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Spread</span>
                <span className="text-pink-400">{settings.whiteSpreadMm} mm</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.01"
                value={settings.whiteSpreadMm}
                onChange={(e) => updateSetting('whiteSpreadMm', parseFloat(e.target.value))}
                className="w-full accent-pink-500 mt-1"
              />
            </div>
          )}

          {/* Metallic */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm">Metalické farby</span>
            <input
              type="checkbox"
              checked={settings.trapMetallics}
              onChange={(e) => updateSetting('trapMetallics', e.target.checked)}
              className="w-4 h-4 accent-pink-500"
            />
          </div>
        </CollapsibleSection>

        {/* Text & Lines Section */}
        <CollapsibleSection
          title="Text a línie"
          isExpanded={expandedSection === 'text'}
          onToggle={() => toggleSection('text')}
        >
          {/* Text Trapping */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Trap textu</span>
            <input
              type="checkbox"
              checked={settings.trapText}
              onChange={(e) => updateSetting('trapText', e.target.checked)}
              className="w-4 h-4 accent-pink-500"
            />
          </div>
          {settings.trapText && (
            <div className="mt-2 pl-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Min. veľkosť</span>
                  <span className="text-pink-400">{settings.minTextSizePt} pt</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="12"
                  step="0.5"
                  value={settings.minTextSizePt}
                  onChange={(e) => updateSetting('minTextSizePt', parseFloat(e.target.value))}
                  className="w-full accent-pink-500 mt-1"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Redukcia trapu</span>
                  <span className="text-pink-400">{Math.round(settings.textTrapReduction * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.textTrapReduction}
                  onChange={(e) => updateSetting('textTrapReduction', parseFloat(e.target.value))}
                  className="w-full accent-pink-500 mt-1"
                />
              </div>
            </div>
          )}

          {/* Thin Lines */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm">Trap tenkých línií</span>
            <input
              type="checkbox"
              checked={settings.trapThinLines}
              onChange={(e) => updateSetting('trapThinLines', e.target.checked)}
              className="w-4 h-4 accent-pink-500"
            />
          </div>
        </CollapsibleSection>

        {/* Corner Handling Section */}
        <CollapsibleSection
          title="Rohy a detaily"
          isExpanded={expandedSection === 'corners'}
          onToggle={() => toggleSection('corners')}
        >
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Štýl rohov</label>
            <div className="grid grid-cols-3 gap-2">
              {(['MITER', 'ROUND', 'BEVEL'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => updateSetting('cornerStyle', style)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                    settings.cornerStyle === style
                      ? 'border-pink-500 bg-pink-500/20 text-pink-300'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {style === 'MITER' && 'Ostrý'}
                  {style === 'ROUND' && 'Oblý'}
                  {style === 'BEVEL' && 'Skosený'}
                </button>
              ))}
            </div>
          </div>

          {settings.cornerStyle === 'MITER' && (
            <div className="mt-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Miter limit</span>
                <span className="text-pink-400">{settings.miterLimit}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={settings.miterLimit}
                onChange={(e) => updateSetting('miterLimit', parseFloat(e.target.value))}
                className="w-full accent-pink-500 mt-1"
              />
            </div>
          )}
        </CollapsibleSection>

        {/* Warnings Section */}
        {warnings.length > 0 && (
          <CollapsibleSection
            title={`Upozornenia (${warnings.length})`}
            isExpanded={expandedSection === 'warnings'}
            onToggle={() => toggleSection('warnings')}
            badge={errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : undefined}
          >
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className={`p-2 rounded-lg text-xs ${
                    warning.severity === 'ERROR'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : warning.severity === 'WARNING'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span>
                      {warning.severity === 'ERROR' && '❌'}
                      {warning.severity === 'WARNING' && '⚠️'}
                      {warning.severity === 'INFO' && 'ℹ️'}
                    </span>
                    <span>{warning.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-700 space-y-3">
        {/* Stats */}
        <div className="flex justify-between text-xs text-slate-400">
          <span>Počet trapov:</span>
          <span className="text-pink-400 font-medium">{trapCount}</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClearTraps}
            disabled={isProcessing || trapCount === 0}
            className="flex-1 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Vymazať
          </button>
          <button
            onClick={onGenerateTraps}
            disabled={isProcessing || !settings.enabled}
            className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all font-medium"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generujem...
              </span>
            ) : (
              'Generovať trapy'
            )}
          </button>
        </div>

        {/* Reset */}
        <button
          onClick={() => onSettingsChange(DEFAULT_TRAP_SETTINGS)}
          className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Obnoviť predvolené nastavenia
        </button>
      </div>
    </div>
  )
}

// ============================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================

interface CollapsibleSectionProps {
  title: string
  isExpanded: boolean
  onToggle: () => void
  badge?: 'error' | 'warning'
  children: React.ReactNode
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  badge,
  children,
}) => {
  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {badge && (
            <span className={`w-2 h-2 rounded-full ${
              badge === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-4 py-3 bg-slate-800/30 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

export default TrappingPanel
