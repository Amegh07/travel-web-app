/**
 * Dev-only debugging utilities
 * Exposes helpful state and logs for development
 */

export const initDevTools = () => {
  if (import.meta.env.MODE !== 'development') return;

  // Expose debugging info to window
  window.__TRAVEX_DEBUG__ = {
    version: '1.0.0',
    buildTime: new Date().toISOString(),
    appState: {},
    logs: [],
  };

  console.log(
    '%c✨ TRAVEX Dev Tools Enabled',
    'font-size: 14px; color: #2563eb; font-weight: bold;'
  );
  console.log(
    '%cAccess debug info via: window.__TRAVEX_DEBUG__',
    'font-size: 12px; color: #6b7280;'
  );
};

export const logDevInfo = (label, data) => {
  if (import.meta.env.MODE !== 'development') return;

  const timestamp = new Date().toLocaleTimeString();
  console.log(`%c[${timestamp}] ${label}`, 'color: #8b5cf6; font-weight: bold;', data);

  if (window.__TRAVEX_DEBUG__) {
    window.__TRAVEX_DEBUG__.logs.push({ timestamp, label, data });
  }
};

export const updateAppState = (key, value) => {
  if (import.meta.env.MODE !== 'development') return;
  if (window.__TRAVEX_DEBUG__) {
    window.__TRAVEX_DEBUG__.appState[key] = value;
    logDevInfo('State Updated', { key, value });
  }
};
