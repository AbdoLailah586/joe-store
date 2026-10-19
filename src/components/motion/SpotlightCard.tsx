// Adapted from React Bits SpotlightCard by David Haz.
// https://github.com/DavidHDev/react-bits
// License: third-party/REACT_BITS_LICENSE.md (MIT + Commons Clause).
import React, { useEffect, useRef } from "react";

/** A small, light-theme adaptation: local pointer tracking, no animation loop. */
export function SpotlightCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const card = root.current;
    if (!card) return;
    const media = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const bounds = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
      card.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
      card.style.setProperty("--spot-opacity", "1");
    };
    const reset = () => card.style.setProperty("--spot-opacity", "0");
    const sync = () => {
      reset();
      card.removeEventListener("pointermove", move);
      if (media.matches)
        card.addEventListener("pointermove", move, { passive: true });
    };
    sync();
    media.addEventListener("change", sync);
    card.addEventListener("pointerleave", reset);
    return () => {
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", reset);
      media.removeEventListener("change", sync);
    };
  }, []);
  return (
    <div ref={root} className={`joe-spotlight ${className}`}>
      <span className="joe-spotlight-light" aria-hidden="true" />
      {children}
    </div>
  );
}
