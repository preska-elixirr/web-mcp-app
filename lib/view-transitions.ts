"use client";

import { startTransition } from "react";

// Development-only evidence of the browser's actual snapshot animations. No
// customer data is collected or persisted; production builds omit these logs.
export function traceViewTransition(kind: string, name: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.debug(
    "[view-transition]",
    JSON.stringify({
      kind,
      name,
      scrollY: window.scrollY,
      animations: document.getAnimations().flatMap((animation) => {
        const effect = animation.effect;
        if (!(effect instanceof KeyframeEffect) || !effect.pseudoElement)
          return [];
        return [
          { pseudo: effect.pseudoElement, frames: effect.getKeyframes() },
        ];
      }),
    }),
  );
}

// React 19.3 coordinates document.startViewTransition() with its DOM commits.
// Keep urgent input updates outside this helper so typing remains responsive.
export function transitionView(update: () => void): void {
  if (
    typeof document === "undefined" ||
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return;
  }
  startTransition(update);
}
