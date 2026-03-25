"use client";

import { useEffect, useRef, useState } from "react";

/**
 * FpsCounter — afișează FPS-ul curent în colțul dreapta sus al canvas-ului.
 *
 * Vizibil DOAR în development (process.env.NODE_ENV === 'development').
 * Nu produce niciun output în production.
 *
 * Culori:
 *   - Verde  (#48BB78) → > 50 fps
 *   - Galben (#D4B85A) → 30–50 fps
 *   - Roșu   (#E53E3E) → < 30 fps
 */
export default function FpsCounter() {
  // Nu rendăm nimic în production — early return înainte de orice hook
  // Verificăm la module load, nu în runtime, pentru tree-shaking corect
  if (process.env.NODE_ENV !== "development") return null;

  return <FpsCounterInner />;
}

function FpsCounterInner() {
  const [fps, setFps] = useState(null);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef(null);

  useEffect(() => {
    let running = true;

    function tick() {
      if (!running) return;

      frameCountRef.current += 1;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFps(currentFps);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    }

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Culoare bazată pe FPS — paleta din geometry.js
  function getColor(f) {
    if (f === null) return "#9DA3BC";
    if (f > 50) return "#48BB78";
    if (f >= 30) return "#D4B85A";
    return "#E53E3E";
  }

  const color = getColor(fps);
  const label = fps === null ? "—" : `${fps}`;

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(15, 17, 26, 0.82)",
        border: `1px solid ${color}`,
        borderRadius: 6,
        padding: "3px 8px",
        fontFamily: "monospace",
        fontSize: 12,
        fontWeight: 600,
        color,
        userSelect: "none",
        pointerEvents: "none",
        backdropFilter: "blur(4px)",
        lineHeight: "18px",
        minWidth: 58,
      }}
      aria-hidden="true"
    >
      <span
        style={{
          display: "inline-block",
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      {label} fps
    </div>
  );
}
