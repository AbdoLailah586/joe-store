import { RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

export default function StorefrontMotion({
  root,
  motionKey,
}: {
  root: RefObject<HTMLElement>;
  motionKey: string;
}) {
  useGSAP(
    () => {
      let disposed = false;
      const media = gsap.matchMedia();
      // Font metrics matter for Arabic line wrapping. Never split Arabic letters.
      document.fonts.ready.then(() => {
        if (disposed || !root.current) return;
        media.add("(prefers-reduced-motion: no-preference)", () => {
          root.current
            ?.querySelectorAll<HTMLElement>("[data-split-title]")
            .forEach((title) => {
              SplitText.create(title, {
                type: "lines",
                autoSplit: true,
                aria: "auto",
                onSplit: (split) =>
                  gsap.from(split.lines, {
                    y: 26,
                    opacity: 0,
                    stagger: 0.12,
                    duration: 0.85,
                    ease: "power3.out",
                    clearProps: "transform,opacity",
                  }),
              });
            });
          root.current
            ?.querySelectorAll<HTMLElement>("[data-reveal]")
            .forEach((section) => {
              gsap.from(section, {
                y: 24,
                opacity: 0,
                duration: 0.65,
                ease: "power2.out",
                clearProps: "transform,opacity",
                scrollTrigger: {
                  trigger: section,
                  start: "top 94%",
                  once: true,
                },
              });
            });
          gsap.from(root.current?.querySelectorAll("[data-hero-piece]") || [], {
            y: 22,
            opacity: 0,
            stagger: 0.1,
            duration: 0.9,
            ease: "power3.out",
            clearProps: "transform,opacity",
          });
        });
      });
      return () => {
        disposed = true;
        media.revert();
      };
    },
    { scope: root, dependencies: [motionKey], revertOnUpdate: true },
  );
  return null;
}
