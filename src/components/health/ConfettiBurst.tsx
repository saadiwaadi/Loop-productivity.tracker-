import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
  size: number;
}

const COLORS = ['var(--accent)', 'var(--violet)', 'var(--sky)', 'var(--coral)', 'var(--mint)', 'var(--amber)'];

/**
 * Small celebratory burst rendered at the center of its (position: relative) parent.
 * Fire it by bumping the `trigger` counter.
 */
export default function ConfettiBurst({ trigger }: { trigger: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const next: Particle[] = Array.from({ length: 22 }, (_, i) => ({
      id: trigger * 100 + i,
      x: (Math.random() - 0.5) * 220,
      y: -40 - Math.random() * 140,
      rotate: (Math.random() - 0.5) * 540,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
    }));
    setParticles(next);
    const t = setTimeout(() => setParticles([]), 1400);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <div className="confetti-anchor" aria-hidden>
      <AnimatePresence>
        {particles.map(p => (
          <motion.span
            key={p.id}
            className="confetti-bit"
            style={{ background: p.color, width: p.size, height: p.size * 0.6 }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 0.84, 0.44, 1] }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
