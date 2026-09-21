'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface CountdownTimerProps {
  startedAt: number;
  timeLimitSec: number;
  onExpired: () => void;
}

export function CountdownTimer({ startedAt, timeLimitSec, onExpired }: CountdownTimerProps) {
  const [pct, setPct] = useState(100);
  const [secsLeft, setSecsLeft] = useState(timeLimitSec);
  const expiredRef = useRef(false);
  const onExpiredRef = useRef(onExpired);
  useLayoutEffect(() => {
    onExpiredRef.current = onExpired;
  });

  useEffect(() => {
    expiredRef.current = false;
    const limitMs = timeLimitSec * 1000;

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, limitMs - elapsed);
      const fraction = remaining / limitMs;
      setPct(fraction * 100);
      setSecsLeft(Math.ceil(remaining / 1000));

      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpiredRef.current();
      }
    };

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [startedAt, timeLimitSec]);

  // 朱 → 朱深 as time runs out
  const barColor = pct > 40 ? 'var(--kg-accent)' : pct > 15 ? 'var(--kg-accent-deep)' : '#7d0e09';

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="flex justify-end items-baseline gap-1">
        <span
          className="text-[1.7rem] text-[var(--kg-paper)]"
          style={{ fontFamily: 'var(--font-bebas)', lineHeight: 1 }}
        >
          {secsLeft}
        </span>
        <span className="text-[0.7rem] text-[var(--kg-mist)]" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.1em' }}>
          s
        </span>
      </div>
      <div className="w-full h-[3px] overflow-hidden" style={{ backgroundColor: 'rgba(var(--kg-paper-rgb),.12)' }}>
        <div
          className="h-full transition-[width] duration-100 ease-linear"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
