"use client";
import { useRouter } from "next/navigation";
import { startTransition, useLayoutEffect, useRef, useState } from "react";
import { installScrollRestoration } from "@/lib/scroll-restoration";

export function useRouteScrollRestoration() {
  const router = useRouter();
  const controller = useRef<ReturnType<typeof installScrollRestoration>>(null);
  const [, updateTraversal] = useState(0);
  useLayoutEffect(() => {
    controller.current = installScrollRestoration(window, (href) => {
      startTransition(() => {
        updateTraversal((value) => value + 1);
        if (href) router.replace(href, { scroll: false });
      });
    });
    return () => controller.current?.dispose();
  }, [router]);
  useLayoutEffect(() => {
    if (controller.current?.commit()) {
      const heading = document.querySelector<HTMLElement>("main h1");
      if (heading) {
        if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
  });
}
