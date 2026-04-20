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

  // Color: pink → orange → red as time runs out
  const barColor = pct > 40 ? '#FF0080' : pct > 15 ? '#FF6B00' : '#FF0000';

  return (
    <div className="w-full flex flex-col gap-1">
      <div className="flex justify-end">
        <span
          className="text-2xl text-pr-dark"
          style={{ fontFamily: 'var(--font-bebas)', lineHeight: 1 }}
        >
          {secsLeft}s
        </span>
      </div>
      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden border-[2px] border-pr-dark">
        <div
          className="h-full rounded-full transition-[width] duration-100 ease-linear"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
