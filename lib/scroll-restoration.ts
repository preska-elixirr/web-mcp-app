type EntryNavigation = EventTarget & {
  currentEntry: { key: string; url?: string | null } | null;
};
type ScrollHost = EventTarget & {
  navigation?: EntryNavigation;
  history: { scrollRestoration: "auto" | "manual" };
  document: EventTarget;
  scrollX: number;
  scrollY: number;
  scrollTo(options: ScrollToOptions): void;
};
type TraverseEvent = Event & {
  navigationType: string;
  destination: { key: string; url?: string; sameDocument?: boolean };
  canIntercept?: boolean;
  hashChange?: boolean;
  signal?: AbortSignal;
  intercept?(options: {
    scroll: "manual";
    focusReset: "manual";
    handler: () => Promise<void>;
  }): void;
};

// Native history restoration can scroll the outgoing DOM before React takes its
// snapshot. Restore the destination in the layout phase of the same React commit.
// Entry keys keep repeated visits to the same URL independent. Older browsers
// retain Next.js/browser restoration without installing a second router.
export function installScrollRestoration(
  host: ScrollHost,
  onTraverse: (href?: string) => void,
) {
  const navigation = host.navigation;
  if (!navigation?.currentEntry) return null;
  const previous = host.history.scrollRestoration;
  host.history.scrollRestoration = "manual";
  const positions = new Map<string, { left: number; top: number }>();
  let activeKey = navigation.currentEntry.key;
  let activeRoute = navigation.currentEntry.url?.split("#")[0];
  let pendingKey: string | null = null;
  let pendingHref: string | undefined;
  let intercepted = false;
  let finishTraversal: (() => void) | undefined;
  const record = () => {
    if (pendingKey !== null) return;
    positions.set(activeKey, { left: host.scrollX, top: host.scrollY });
    const oldest = positions.keys().next().value;
    if (positions.size > 100 && oldest !== undefined) positions.delete(oldest);
  };
  record();
  const navigate = (event: Event) => {
    const traversal = event as TraverseEvent;
    if (traversal.navigationType !== "traverse") {
      if (pendingHref && traversal.destination.url !== pendingHref) {
        pendingKey = null;
        pendingHref = undefined;
        intercepted = false;
        finishTraversal?.();
        finishTraversal = undefined;
      }
      return;
    }
    record();
    pendingKey = traversal.destination.key;
    pendingHref = traversal.destination.url;
    if (
      !traversal.canIntercept ||
      !traversal.destination.sameDocument ||
      traversal.hashChange ||
      !traversal.destination.url ||
      !traversal.intercept
    )
      return;
    // React skips animations in legacy popstate. The Navigation API keeps the
    // native history entry/forward stack while Next renders via its public API.
    // Never intercept document loads, hash links or un-interceptable traversals.
    intercepted = true;
    traversal.intercept({
      scroll: "manual",
      focusReset: "manual",
      handler: () =>
        new Promise<void>((resolve) => {
          finishTraversal?.();
          finishTraversal = resolve;
          traversal.signal?.addEventListener(
            "abort",
            () => {
              if (finishTraversal !== resolve) return;
              finishTraversal = undefined;
              // Next's replaceState aborts the intercepted native operation as
              // it commits the same destination. Keep its saved scroll target.
              // A different navigation clears it in the navigate listener.
              resolve();
            },
            { once: true },
          );
          onTraverse(traversal.destination.url);
        }),
    });
  };
  const popState = (event: Event) => {
    if (intercepted) event.stopImmediatePropagation();
    else onTraverse();
  };
  const pageHide = () => {
    record();
    host.history.scrollRestoration = previous;
  };
  const pageShow = () => {
    host.history.scrollRestoration = "manual";
  };
  const entryChange = () => {
    const entry = navigation.currentEntry;
    // Native hash changes do not necessarily cause a React commit. Keep their
    // history entry separate, leaving anchor scrolling to the browser/Next.
    if (
      pendingKey ||
      !entry ||
      !activeRoute ||
      entry.url?.split("#")[0] !== activeRoute ||
      entry.key === activeKey
    )
      return;
    record();
    activeKey = entry.key;
    record();
  };
  navigation.addEventListener("navigate", navigate);
  navigation.addEventListener("currententrychange", entryChange);
  host.addEventListener("scroll", record, { passive: true });
  host.document.addEventListener("click", record, { capture: true });
  host.addEventListener("popstate", popState, { capture: true });
  host.addEventListener("pagehide", pageHide);
  host.addEventListener("pageshow", pageShow);
  return {
    commit() {
      const key = navigation.currentEntry?.key;
      if (!key) return false;
      const focusDestination = pendingKey === key && intercepted;
      if (pendingKey === key) {
        const position = positions.get(key);
        if (position) host.scrollTo({ ...position, behavior: "instant" });
        pendingKey = null;
        pendingHref = undefined;
        intercepted = false;
        // React waits for Navigation.finished before measuring its snapshots.
        // Unblock from the layout phase, never useEffect (which would deadlock).
        finishTraversal?.();
        finishTraversal = undefined;
      }
      activeKey = key;
      activeRoute = navigation.currentEntry?.url?.split("#")[0];
      record();
      return focusDestination;
    },
    dispose() {
      finishTraversal?.();
      host.history.scrollRestoration = previous;
      navigation.removeEventListener("navigate", navigate);
      navigation.removeEventListener("currententrychange", entryChange);
      host.removeEventListener("scroll", record);
      host.document.removeEventListener("click", record, { capture: true });
      host.removeEventListener("popstate", popState, { capture: true });
      host.removeEventListener("pagehide", pageHide);
      host.removeEventListener("pageshow", pageShow);
    },
  };
}
