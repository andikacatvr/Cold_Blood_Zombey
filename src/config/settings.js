/* =========================================================================
   SETTINGS & PREFERENCES CONFIGURATION
   ========================================================================= */
export const DEFAULT_SETTINGS = {
  settingsVersion: 2,
  volume: 0.8,
  sensitivity: 1.0,
  graphicMode: 'hd',
  crtEnabled: false,
  difficulty: 'normal',
  crosshairColor: '#c5d5e2',
  weapon: 'spin',
  touchControls: 'auto'
};

export let gameSettings = Object.assign({}, DEFAULT_SETTINGS);

try {
  const saved = localStorage.getItem('cold_blood_ps1_settings');
  if (saved) {
    const parsed = JSON.parse(saved);
    gameSettings = Object.assign({}, DEFAULT_SETTINGS, parsed);
    // Migrate legacy v1 saves (which defaulted to 240p 'ps1') to smooth HD
    if (!parsed.settingsVersion || parsed.settingsVersion < 2) {
      gameSettings.graphicMode = 'hd';
      gameSettings.settingsVersion = 2;
      localStorage.setItem('cold_blood_ps1_settings', JSON.stringify(gameSettings));
    }
  }
  gameSettings.weapon = 'spin';
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
