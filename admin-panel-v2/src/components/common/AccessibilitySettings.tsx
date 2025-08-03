import React from 'react';
import { Settings, Eye, Palette, Type, Keyboard, RotateCcw } from 'lucide-react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import AccessibleModal from './AccessibleModal';

interface AccessibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useAccessibility();

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Accessibility Settings"
      description="Customize your viewing experience for better accessibility"
      size="md"
    >
      <div className="space-y-6">
        {/* Color Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Palette className="w-4 h-4 mr-2" />
            Visual Settings
          </h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Colorblind Mode</span>
              <input
                type="checkbox"
                checked={settings.colorblindMode}
                onChange={(e) => updateSettings({ colorblindMode: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                aria-describedby="colorblind-help"
              />
            </label>
            <p id="colorblind-help" className="text-xs text-gray-500 ml-6">
              Uses patterns and borders to distinguish shift types
            </p>

            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">High Contrast</span>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                aria-describedby="contrast-help"
              />
            </label>
            <p id="contrast-help" className="text-xs text-gray-500 ml-6">
              Increases contrast for better visibility
            </p>
          </div>
        </div>

        {/* Motion Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            Motion Settings
          </h4>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Reduce Motion</span>
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(e) => updateSettings({ reduceMotion: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              aria-describedby="motion-help"
            />
          </label>
          <p id="motion-help" className="text-xs text-gray-500 ml-6 mt-1">
            Minimizes animations and transitions
          </p>
        </div>

        {/* Text Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Type className="w-4 h-4 mr-2" />
            Text Settings
          </h4>
          <label className="block text-sm text-gray-700 mb-2">
            Font Size
          </label>
          <select
            value={settings.fontSize}
            onChange={(e) => updateSettings({ fontSize: e.target.value as any })}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
            <option value="normal">Normal</option>
            <option value="large">Large</option>
            <option value="extra-large">Extra Large</option>
          </select>
        </div>

        {/* Keyboard Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Keyboard className="w-4 h-4 mr-2" />
            Keyboard Navigation
          </h4>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Show Keyboard Hints</span>
            <input
              type="checkbox"
              checked={settings.keyboardNavigationHints}
              onChange={(e) => updateSettings({ keyboardNavigationHints: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              aria-describedby="keyboard-help"
            />
          </label>
          <p id="keyboard-help" className="text-xs text-gray-500 ml-6 mt-1">
            Shows keyboard shortcuts and navigation hints
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <button
            onClick={resetSettings}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Done
          </button>
        </div>
      </div>
    </AccessibleModal>
  );
};

export default AccessibilitySettings;