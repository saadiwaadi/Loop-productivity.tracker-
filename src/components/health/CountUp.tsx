import { useEffect, useRef } from 'react';
import { animate, useMotionValue } from 'motion/react';

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
}

/** Number that animates from its previous value to the new one. */
export default function CountUp({ value, duration = 0.8, decimals = 0, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(0);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 0.61, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) {
          ref.current.textContent = v.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          });
        }
      },
    });
    return () => controls.stop();
  }, [value, duration, decimals, mv]);

  return <span ref={ref} className={className}>0</span>;
}
