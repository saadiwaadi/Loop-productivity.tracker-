import { motion } from 'motion/react';

interface ProgressRingProps {
  size?: number;
  stroke?: number;
  progress: number; // 0..1 (values above 1 are clamped)
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export default function ProgressRing({
  size = 120,
  stroke = 10,
  progress,
  color = 'var(--accent)',
  trackColor = 'var(--stroke-2)',
  children,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="hring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped) }}
          transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
        />
      </svg>
      <div className="hring-center">{children}</div>
    </div>
  );
}
