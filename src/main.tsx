import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AgentDiffChart, useResolvedTheme, type ThemeSetting } from './AgentDiffChart';
import './preview.css';

const STORAGE_KEY = 'adc-preview-theme';
const OPTIONS: Array<{ value: ThemeSetting; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function readSaved(): ThemeSetting {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Preview wrapper only: page surface + theme switcher. Not part of the component. */
function Preview() {
  const [theme, setTheme] = useState<ThemeSetting>(readSaved);
  const resolved = useResolvedTheme(theme);

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const choose = (value: ThemeSetting) => {
    setTheme(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* storage unavailable: the choice still applies for this visit */
    }
  };

  return (
    <>
      <div className="preview-theme" role="radiogroup" aria-label="Color theme">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={theme === o.value}
            className={theme === o.value ? 'is-on' : undefined}
            onClick={() => choose(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <main className="preview">
        <div className="preview-stage">
          <AgentDiffChart theme={theme} />
        </div>
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
