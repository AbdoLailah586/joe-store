import { useEffect, RefObject } from "react";

/**
 * Lightweight zero-dependency storefront reveal motion using IntersectionObserver.
 * Respects prefers-reduced-motion and preserves GSAP-free MIT licensing.
 */
export default function StorefrontMotion({
  root,
  motionKey,
}: {
  root: RefObject<HTMLElement>;
  motionKey: string;
}) {
  useEffect(() => {
    const container = root.current;
    if (!container || typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    const animateElement = (el: HTMLElement, delayMs = 0) => {
      if (el.dataset.motionDone === "1") return;
      el.dataset.motionDone = "1";
      try {
        el.animate(
          [
            { opacity: 0, transform: "translateY(22px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 620,
            delay: delayMs,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "both",
          }
        );
      } catch {}
    };

    const heroPieces = Array.from(container.querySelectorAll<HTMLElement>("[data-hero-piece]"));
    heroPieces.forEach((el, idx) => animateElement(el, idx * 80));

    const splitTitles = Array.from(container.querySelectorAll<HTMLElement>("[data-split-title]"));
    splitTitles.forEach((el, idx) => animateElement(el, idx * 90));

    const revealEls = Array.from(container.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (typeof IntersectionObserver === "undefined") {
      revealEls.forEach((el) => animateElement(el));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            animateElement(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
    );

    revealEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [root, motionKey]);

  return null;
}
