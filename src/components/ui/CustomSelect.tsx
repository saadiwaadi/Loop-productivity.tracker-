import { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (val: any) => void;
  options: Option[];
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function CustomSelect({ value, onChange, options, placeholder, style }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOpt = options.find(o => o.value === value);

  useEffect(() => {
    const handleOuterClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOuterClick);
    return () => document.removeEventListener('mousedown', handleOuterClick);
  }, []);

  return (
    <div ref={containerRef} className="custom-select-container" style={{ position: 'relative', width: '100%', ...style }}>
      <div
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '11px 14px',
          borderRadius: '12px',
          background: 'var(--input-bg)',
          border: '1px solid var(--stroke-2)',
          color: 'var(--ink)',
          cursor: 'pointer',
          fontSize: '14px',
          userSelect: 'none',
          fontFamily: 'var(--font-body)',
          height: '44px',
          boxSizing: 'border-box'
        }}
      >
        <span>{selectedOpt ? selectedOpt.label : (placeholder || 'Select...')}</span>
        <Icons.ChevronDown size={15} style={{ opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {isOpen && (
        <div
          className="custom-select-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--card-solid)',
            backdropFilter: 'blur(24px) saturate(150%)',
            WebkitBackdropFilter: 'blur(24px) saturate(150%)',
            border: '1px solid var(--card-border)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow)',
            padding: '6px',
            zIndex: 9999,
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {options.map(opt => (
            <div
              key={opt.value}
              className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '13.5px',
                color: value === opt.value ? 'var(--bg-1)' : 'var(--ink)',
                backgroundColor: value === opt.value ? 'var(--ink)' : 'transparent',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                transition: 'background 0.15s, color 0.15s'
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.backgroundColor = 'var(--stroke-2)';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
