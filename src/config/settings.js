/* =========================================================================
   SETTINGS & PREFERENCES CONFIGURATION
   ========================================================================= */
export const DEFAULT_SETTINGS = {
  volume: 0.8,
  sensitivity: 1.0,
  graphicMode: 'ps2',
  crtEnabled: false,
  difficulty: 'normal',
  crosshairColor: '#c5d5e2',
  weapon: 'spin',
  touchControls: 'auto'
};

export let gameSettings = Object.assign({}, DEFAULT_SETTINGS);

try {
  const saved = localStorage.getItem('cold_blood_ps1_settings');
  if (saved) gameSettings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(saved));
} catch (e) {
  console.warn('Failed reading settings:', e);
}

export function saveSettings() {
  try {
    localStorage.setItem('cold_blood_ps1_settings', JSON.stringify(gameSettings));
  } catch (e) {}
}

export function resetSettings() {
  gameSettings = Object.assign({}, DEFAULT_SETTINGS);
  saveSettings();
  return gameSettings;
}
