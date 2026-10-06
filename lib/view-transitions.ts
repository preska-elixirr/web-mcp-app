"use client";

import { startTransition } from "react";

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
