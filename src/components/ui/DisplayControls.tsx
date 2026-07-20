import { useEffect } from 'react';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import { useSettings } from '../../hooks/useDb';

const ZOOM_MIN = 85;
const ZOOM_MAX = 130;
const ZOOM_STEP = 5;

export function MinimizeToggle() {
  const settings = useSettings();
  const density = settings?.uiDensity || 'comfortable';

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  const setDensity = (next: 'comfortable' | 'compact') => {
    try {
      localStorage.setItem('pace-density', next);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('data-density', next);
    db.settings.update(1, { uiDensity: next });
  };

  const isCompact = density === 'compact';

  return (
    <div
      onClick={() => setDensity(isCompact ? 'comfortable' : 'compact')}
      role="switch"
      aria-checked={isCompact}
      aria-label="Minimize (compact) layout"
      style={{
        width: '46px',
        height: '24px',
        borderRadius: '12px',
        backgroundColor: isCompact ? 'var(--accent)' : 'var(--stroke-2)',
        padding: '2px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCompact ? 'flex-end' : 'flex-start',
        transition: 'all 0.3s var(--ease)',
      }}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.3s var(--ease)',
        }}
      />
    </div>
  );
}

export function ZoomControl() {
  const settings = useSettings();
  const zoom = settings?.uiZoom ?? 100;

  useEffect(() => {
    document.documentElement.style.zoom = (zoom / 100).toString();
  }, [zoom]);

  const setZoom = (next: number) => {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    try {
      localStorage.setItem('pace-zoom', String(clamped));
    } catch {
      // ignore
    }
    document.documentElement.style.zoom = (clamped / 100).toString();
    db.settings.update(1, { uiZoom: clamped });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button
        type="button"
        onClick={() => setZoom(zoom - ZOOM_STEP)}
        disabled={zoom <= ZOOM_MIN}
        className="btn soft"
        aria-label="Zoom out"
        style={{ width: '32px', height: '32px', padding: 0, borderRadius: '10px', display: 'grid', placeItems: 'center' }}
      >
        <Icons.Minus size={15} />
      </button>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', minWidth: '42px', textAlign: 'center' }}>
        {zoom}%
      </div>
      <button
        type="button"
        onClick={() => setZoom(zoom + ZOOM_STEP)}
        disabled={zoom >= ZOOM_MAX}
        className="btn soft"
        aria-label="Zoom in"
        style={{ width: '32px', height: '32px', padding: 0, borderRadius: '10px', display: 'grid', placeItems: 'center' }}
      >
        <Icons.Plus size={15} />
      </button>
      {zoom !== 100 && (
        <button
          type="button"
          onClick={() => setZoom(100)}
          className="btn soft"
          aria-label="Reset zoom"
          style={{ padding: '6px 10px', borderRadius: '10px', fontSize: '12px' }}
        >
          Reset
        </button>
      )}
    </div>
  );
}
