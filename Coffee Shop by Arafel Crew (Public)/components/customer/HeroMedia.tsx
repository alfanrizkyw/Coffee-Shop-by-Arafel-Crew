'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export default function HeroMedia({ alt }: { alt: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (calm.matches || conn?.saveData) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    const el = video.current;
    if (!enabled || !el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <Image
        src="/hero-forest.webp"
        alt={alt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-[72%_50%] lg:object-[72%_58%]"
      />
      {enabled && (
        <video
          ref={video}
          className={`absolute inset-0 h-full w-full object-cover object-[72%_50%] lg:object-[72%_58%] transition-opacity duration-500 ${playing ? 'opacity-100' : 'opacity-0'}`}
          poster="/hero-forest.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
        >
          <source src="/hero-loop.mp4" type="video/mp4" />
        </video>
      )}
    </div>
  );
}
