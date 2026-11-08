'use client';

import { ReactNode, useCallback, useRef } from 'react';

export default function Tilt({ children, className = '', max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`);
      el.style.setProperty('--rx', `${(0.5 - py) * max * 2}deg`);
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
    });
  }, [max]);

  const onLeave = useCallback(() => {
    cancelAnimationFrame(frame.current);
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  return (
    <div ref={ref} className={`tilt ${className}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="tilt-inner relative rounded-xl h-full">
        {children}
        <span className="tilt-glare" aria-hidden />
      </div>
    </div>
  );
}