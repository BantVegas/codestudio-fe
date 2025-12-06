/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * GPCS CodeStudio - Advanced Trapping Panel
 * ESKO-kompatibilný profesionálny panel nastavení
 */

import React, { useState } from 'react'
import type { 
  TrapSettings, 
  PrintingTechnology,
  DirectionMode,
  TruncationMode,
  EndCapStyle,
  CornerStyle,
  PullBackMode,
  CenterlineBehavior,
  TrapDecisionMode,
  ImageTrapDirection,
  ImageTrapColor,
  TrapMode
} from '../../trapping/types/trappingTypes'
import { TRAP_PRESETS } from '../../trapping/types/trappingTypes'

interface AdvancedTrappingPanelProps {
  settings: TrapSettings
  onSettingsChange: (settings: Partial<TrapSettings>) => void
  onGenerateTraps: () => void
  onClearTraps: () => void
  isProcessing: boolean
  trapCount: number
  colorEdgesCount: number
}

type TabId = 'mode' | 'distance' | 'color' | 'pullback' | 'processing' | 'rules' | 'presets'

export const AdvancedTrappingPanel: React.FC<AdvancedTrappingPanelProps> = ({
  settings,
  onSettingsChange,
  onGenerateTraps,
  onClearTraps,
  isProcessing,
  trapCount,
  colorEdgesCount
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('mode')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']))

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'mode', label: 'Mód', icon: '🎯' },
    { id: 'distance', label: 'Vzdialenosť', icon: '📏' },
    { id: 'color', label: 'Farba', icon: '🎨' },
    { id: 'pullback', label: 'Pull Back', icon: '↩️' },
    { id: 'processing', label: 'Spracovanie', icon: '⚙️' },
    { id: 'presets', label: 'Presety', icon: '💾' },
  ]

  const renderSelect = <T extends string>(
    label: string,
    value: T,
    options: { value: T; label: string }[],
    onChange: (value: T) => void,
    description?: string
  ) => (
    <div className="mb-3">
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-pink-500 focus:outline-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
    </div>
  )

  const renderNumberInput = (
    label: string,
    value: number,
    onChange: (value: number) => void,
    options?: { min?: number; max?: number; step?: number; unit?: string; description?: string }
  ) => (
    <div className="mb-3">
      <label className="block text-xs text-slate-400 mb-1">
        {label} {options?.unit && <span className="text-slate-500">({options.unit})</span>}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={options?.min}
        max={options?.max}
        step={options?.step || 0.01}
        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-pink-500 focus:outline-none"
      />
      {options?.description && <p className="text-xs text-slate-500 mt-1">{options.description}</p>}
    </div>
  )

  const renderCheckbox = (
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
    description?: string
  ) => (
    <div className="mb-3">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 rounded border-slate-600 bg-slate-800 text-pink-500 focus:ring-pink-500"
        />
        <div>
          <span className="text-sm text-white">{label}</span>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      </label>
    </div>
  )

  const renderModeTab = () => (
    <div className="space-y-4">
      {/* Trapping Mode */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-pink-400 mb-3">Režim Trappingu</h4>
        
        {renderSelect<TrapMode>(
          'Mód',
          settings.mode,
          [
            { value: 'NORMAL', label: 'Normal - Svetlá do tmavej' },
            { value: 'REVERSE', label: 'Reverse - Biely knockout' }
          ],
          (value) => onSettingsChange({ mode: value }),
          settings.mode === 'REVERSE' 
            ? 'Pre Dry Offset tlač (kovové plechovky)' 
            : 'Štandardný trapping - svetlejšie farby sa rozširujú pod tmavšie'
        )}

        {renderSelect<PrintingTechnology>(
          'Technológia tlače',
          settings.technology,
          [
            { value: 'FLEXO', label: 'Flexografia' },
            { value: 'OFFSET', label: 'Offset' },
            { value: 'DIGITAL', label: 'Digitálna tlač' },
            { value: 'SCREEN', label: 'Sieťotlač' },
            { value: 'GRAVURE', label: 'Hĺbkotlač' },
            { value: 'DRY_OFFSET', label: 'Dry Offset (plechovky)' }
          ],
          (value) => onSettingsChange({ technology: value })
        )}

        {renderCheckbox(
          'Povoliť trapping',
          settings.enabled,
          (checked) => onSettingsChange({ enabled: checked })
        )}
      </div>

      {/* White Knockout (for Reverse mode) */}
      {settings.mode === 'REVERSE' && (
        <div className="bg-slate-800/50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-cyan-400 mb-3">White Knockout</h4>
          
          {renderCheckbox(
            'Povoliť White Knockout',
            settings.whiteKnockoutEnabled,
            (checked) => onSettingsChange({ whiteKnockoutEnabled: checked }),
            'Biely knockout trap na vrchu svetlejšej farby'
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Štatistiky</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-900 rounded p-2">
            <div className="text-slate-500">Detekované hrany</div>
            <div className="text-lg text-cyan-400">{colorEdgesCount}</div>
          </div>
          <div className="bg-slate-900 rounded p-2">
            <div className="text-slate-500">Vygenerované trapy</div>
            <div className="text-lg text-pink-400">{trapCount}</div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderDistanceTab = () => (
    <div className="space-y-4">
      {/* Basic Distances */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-pink-400 mb-3">Základné vzdialenosti</h4>
        
        {renderNumberInput(
          'Trapping Distance',
          settings.defaultWidthMm,
          (value) => onSettingsChange({ defaultWidthMm: value }),
          { min: 0.01, max: 1, step: 0.01, unit: 'mm', description: 'Hlavná šírka trapy' }
        )}

        {renderNumberInput(
          'Into Black',
          settings.intoBlackMm,
          (value) => onSettingsChange({ intoBlackMm: value }),
          { min: 0.01, max: 1, step: 0.01, unit: 'mm', description: 'Vzdialenosť pre trap do čiernej' }
        )}

        {renderNumberInput(
          'Into Spot Color',
          settings.intoSpotColorMm,
          (value) => onSettingsChange({ intoSpotColorMm: value }),
          { min: 0.01, max: 1, step: 0.01, unit: 'mm' }
        )}

        {renderNumberInput(
          'Into Image',
          settings.intoImageMm,
          (value) => onSettingsChange({ intoImageMm: value }),
          { min: 0.01, max: 1, step: 0.01, unit: 'mm' }
        )}

        {renderNumberInput(
          'Pull Back Distance',
          settings.pullBackDistanceMm,
          (value) => onSettingsChange({ pullBackDistanceMm: value }),
          { min: 0, max: 0.5, step: 0.01, unit: 'mm' }
        )}
      </div>

      {/* Minimum Ink Difference */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-cyan-400 mb-3">Minimum Ink Difference</h4>
        
        {renderNumberInput(
          'Rozdiel farieb',
          settings.minInkDifference,
          (value) => onSettingsChange({ minInkDifference: value }),
          { min: 0, max: 100, step: 1, unit: '%', description: 'Percentuálny rozdiel pre aktiváciu trapu' }
        )}
      </div>

      {/* Direction */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-purple-400 mb-3">Smer trapu</h4>
        
        {renderSelect<DirectionMode>(
          'Direction Mode',
          settings.directionMode,
          [
            { value: 'USE_LIGHTNESS', label: 'Use Lightness - podľa luminancie' },
            { value: 'SPOT_AS_OPAQUE', label: 'Spot Colors as Opaque' },
            { value: 'SEPARATION_ORDER', label: 'Separation Order' },
            { value: 'REVERSE_SEPARATION', label: 'Reverse Separation Order' },
            { value: 'INTO_BOTH_COLORS', label: 'Into Both Colors (bidirectional)' }
          ],
          (value) => onSettingsChange({ directionMode: value })
        )}

        {renderSelect<ImageTrapDirection>(
          'Image Trap Direction',
          settings.imageTrapDirection,
          [
            { value: 'AUTOMATIC', label: 'Automatic' },
            { value: 'TOWARDS_IMAGES', label: 'Always Towards Images' },
            { value: 'TOWARDS_LINEART', label: 'Always Towards Line Art' }
          ],
          (value) => onSettingsChange({ imageTrapDirection: value })
        )}
      </div>
    </div>
  )

  const renderColorTab = () => (
    <div className="space-y-4">
      {/* Trap Color */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-pink-400 mb-3">Farba trapu</h4>
        
        {renderNumberInput(
          'Trap Color Intensity',
          settings.trapColorIntensity,
          (value) => onSettingsChange({ trapColorIntensity: value }),
          { min: 0, max: 100, step: 5, unit: '%', description: 'Znížením vytvoríte svetlejšiu trapu' }
        )}

        {renderSelect<ImageTrapColor>(
          'Image Trap Color',
          settings.imageTrapColor,
          [
            { value: 'ORIGINAL_DATA', label: 'Original Image Data' },
            { value: 'EXTEND_DATA', label: 'Extend Image Data' },
            { value: 'APPROXIMATE_FLAT', label: 'Approximate Flat Color' }
          ],
          (value) => onSettingsChange({ imageTrapColor: value })
        )}
      </div>

      {/* Truncation */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-cyan-400 mb-3">Truncation (Orezanie)</h4>
        
        {renderSelect<TruncationMode>(
          'Truncation Mode',
          settings.truncationMode,
          [
            { value: 'ON_CENTER', label: 'On Center - polovica vzdialenosti' },
            { value: 'ON_EDGE', label: 'On Edge - na okraji objektu' }
          ],
          (value) => onSettingsChange({ truncationMode: value })
        )}

        {renderSelect<TruncationMode>(
          'Truncation Into Black',
          settings.truncationIntoBlack,
          [
            { value: 'ON_CENTER', label: 'On Center' },
            { value: 'ON_EDGE', label: 'On Edge' }
          ],
          (value) => onSettingsChange({ truncationIntoBlack: value })
        )}
      </div>

      {/* End Caps & Corners */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-purple-400 mb-3">Zakončenie a rohy</h4>
        
        {renderSelect<EndCapStyle>(
          'End Caps',
          settings.endCapStyle,
          [
            { value: 'SQUARE', label: 'Square - pravouhlé' },
            { value: 'ROUND', label: 'Round - zaoblené' },
            { value: 'OBJECT_DEPENDENT', label: 'Object Dependent' }
          ],
          (value) => onSettingsChange({ endCapStyle: value })
        )}

        {renderSelect<CornerStyle>(
          'Trap Corners',
          settings.cornerStyle,
          [
            { value: 'MITER', label: 'Mitered - ostré' },
            { value: 'ROUND', label: 'Round - zaoblené' },
            { value: 'BEVEL', label: 'Beveled - skosené' }
          ],
          (value) => onSettingsChange({ cornerStyle: value })
        )}

        {settings.cornerStyle === 'MITER' && renderNumberInput(
          'Miter Limit',
          settings.miterLimit,
          (value) => onSettingsChange({ miterLimit: value }),
          { min: 1, max: 10, step: 0.5, description: 'Ak dĺžka rohu > limit × distance → skosenie' }
        )}
      </div>
    </div>
  )

  const renderPullbackTab = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-pink-400 mb-3">Ink Pull Back</h4>
        
        {renderSelect<PullBackMode>(
          'Pull Back Mode',
          settings.pullBackMode,
          [
            { value: 'AUTOMATIC', label: 'Automatic - pre rich black/spot' },
            { value: 'ONLY_RICH_BLACK', label: 'Only Rich Black' },
            { value: 'DO_NOT_PULL_BACK', label: 'Do Not Pull Back' }
          ],
          (value) => onSettingsChange({ pullBackMode: value })
        )}

        {renderCheckbox(
          'Pull back light inks',
          settings.pullBackLightInks,
          (checked) => onSettingsChange({ pullBackLightInks: checked }),
          'Pullback aj keď zostávajúci atrament je viditeľne odlišný'
        )}

        {renderCheckbox(
          'Pull back images and gradients',
          settings.pullBackImagesGradients,
          (checked) => onSettingsChange({ pullBackImagesGradients: checked })
        )}
      </div>

      {/* Rich Black */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-cyan-400 mb-3">Rich Black</h4>
        
        {renderCheckbox(
          'Trap Black to All',
          settings.trapBlackToAll,
          (checked) => onSettingsChange({ trapBlackToAll: checked }),
          'Pridanie atramentu pod čiernu pre sýtejšiu čiernu'
        )}

        {renderNumberInput(
          'Black Trap Width',
          settings.blackTrapWidthMm,
          (value) => onSettingsChange({ blackTrapWidthMm: value }),
          { min: 0.05, max: 0.5, step: 0.01, unit: 'mm' }
        )}
      </div>

      {/* White Underprint */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-purple-400 mb-3">White Underprint</h4>
        
        {renderCheckbox(
          'Trap White Underprint',
          settings.trapWhiteUnderprint,
          (checked) => onSettingsChange({ trapWhiteUnderprint: checked }),
          'Automatické vytvorenie bielej podtlače'
        )}

        {renderNumberInput(
          'White Spread',
          settings.whiteSpreadMm,
          (value) => onSettingsChange({ whiteSpreadMm: value }),
          { min: 0.1, max: 1, step: 0.05, unit: 'mm' }
        )}
      </div>
    </div>
  )

  const renderProcessingTab = () => (
    <div className="space-y-4">
      {/* Centerline */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-pink-400 mb-3">Centerline Behavior</h4>
        
        {renderSelect<CenterlineBehavior>(
          'Centerline',
          settings.centerlineBehavior,
          [
            { value: 'AUTOMATIC', label: 'Automatic - podľa pravidiel' },
            { value: 'NEVER_ON_DARK', label: 'Never on Dark Areas' },
            { value: 'NEVER', label: 'Never' }
          ],
          (value) => onSettingsChange({ centerlineBehavior: value })
        )}
      </div>

      {/* Trap Decision */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-cyan-400 mb-3">Trap Decision</h4>
        
        {renderSelect<TrapDecisionMode>(
          'Decision Mode',
          settings.trapDecisionMode,
          [
            { value: 'EACH_HIT_OWN', label: 'Each hit own decision' },
            { value: 'SAME_FOR_ALL', label: 'Same for all hits' },
            { value: 'SAME_FOR_SMALL', label: 'Same for small objects' }
          ],
          (value) => onSettingsChange({ trapDecisionMode: value })
        )}

        {settings.trapDecisionMode === 'SAME_FOR_SMALL' && renderNumberInput(
          'Small Object Threshold',
          settings.smallObjectThresholdMm,
          (value) => onSettingsChange({ smallObjectThresholdMm: value }),
          { min: 0.1, max: 5, step: 0.1, unit: 'mm' }
        )}
      </div>

      {/* Ignore Options */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-purple-400 mb-3">Ignore Options</h4>
        
        {renderCheckbox(
          'Respect existing traps',
          settings.respectExistingTraps,
          (checked) => onSettingsChange({ respectExistingTraps: checked })
        )}

        {renderCheckbox(
          'Ignore bitmaps',
          settings.ignoreBitmaps,
          (checked) => onSettingsChange({ ignoreBitmaps: checked }),
          'Zrýchli spracovanie'
        )}

        {renderCheckbox(
          'Trap images to images',
          settings.trapImagesToImages,
          (checked) => onSettingsChange({ trapImagesToImages: checked })
        )}
      </div>

      {/* Gaps */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-slate-400 mb-3">Gaps & Overshoot</h4>
        
        {renderNumberInput(
          'Close gaps smaller than',
          settings.closeGapsSmallerThanMm,
          (value) => onSettingsChange({ closeGapsSmallerThanMm: value }),
          { min: 0, max: 0.1, step: 0.001, unit: 'mm' }
        )}

        {renderCheckbox(
          'Allow trap overshoot',
          settings.allowTrapOvershoot,
          (checked) => onSettingsChange({ allowTrapOvershoot: checked })
        )}
      </div>
    </div>
  )

  const renderPresetsTab = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-pink-400 mb-3">Predvolené presety</h4>
        
        <div className="space-y-2">
          {TRAP_PRESETS.map((preset, index) => (
            <button
              key={index}
              onClick={() => onSettingsChange(preset.settings)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                settings.technology === preset.technology
                  ? 'border-pink-500 bg-pink-500/10'
                  : 'border-slate-700 bg-slate-900 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{preset.name}</div>
                  <div className="text-xs text-slate-500">{preset.description}</div>
                </div>
                {preset.isDefault && (
                  <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded">
                    Default
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Settings Summary */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Aktuálne nastavenia</h4>
        <div className="text-xs text-slate-500 space-y-1">
          <div>Technológia: <span className="text-white">{settings.technology}</span></div>
          <div>Mód: <span className="text-white">{settings.mode}</span></div>
          <div>Šírka: <span className="text-white">{settings.defaultWidthMm} mm</span></div>
          <div>Min. rozdiel: <span className="text-white">{settings.minInkDifference}%</span></div>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'mode': return renderModeTab()
      case 'distance': return renderDistanceTab()
      case 'color': return renderColorTab()
      case 'pullback': return renderPullbackTab()
      case 'processing': return renderProcessingTab()
      case 'presets': return renderPresetsTab()
      default: return null
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold">
          <span className="text-pink-400">AutoTrap</span> Settings
        </h2>
        <p className="text-xs text-slate-500 mt-1">ESKO-kompatibilný trapping engine</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-slate-800 bg-slate-950">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2 py-1.5 text-xs rounded transition-colors ${
              activeTab === tab.id
                ? 'bg-pink-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {renderTabContent()}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <button
          onClick={onGenerateTraps}
          disabled={isProcessing}
          className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-all"
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
            '🎯 Generovať trapy'
          )}
        </button>
        
        <button
          onClick={onClearTraps}
          disabled={trapCount === 0}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
        >
          🗑️ Vyčistiť trapy
        </button>
      </div>
    </div>
  )
}

export default AdvancedTrappingPanel
