import { describe, expect, it, vi } from "vitest";
import { installScrollRestoration } from "../lib/scroll-restoration";

function browser() {
  const navigation = Object.assign(new EventTarget(), {
    currentEntry: { key: "catalog-1" },
  });
  const host = Object.assign(new EventTarget(), {
    navigation,
    document: new EventTarget(),
    history: { scrollRestoration: "auto" as "auto" | "manual" },
    scrollX: 0,
    scrollY: 1400,
    scrollTo: vi.fn((options: ScrollToOptions) => {
      host.scrollX = options.left ?? 0;
      host.scrollY = options.top ?? 0;
    }),
  });
  const traverse = (key: string) => {
    navigation.dispatchEvent(
      Object.assign(new Event("navigate"), {
        navigationType: "traverse",
        destination: { key },
      }),
    );
    navigation.currentEntry = { key };
    host.dispatchEvent(new Event("popstate"));
  };
  return { host, traverse };
}

describe("route scroll restoration", () => {
  it("keeps the outgoing snapshot still and restores back/forward at commit", () => {
    const { host, traverse } = browser();
    const changed = vi.fn();
    const controller = installScrollRestoration(host, changed);
    expect(host.history.scrollRestoration).toBe("manual");
    host.document.dispatchEvent(new Event("click"));
    host.navigation.currentEntry = { key: "product-1" };
    host.scrollY = 0;
    controller?.commit();
    traverse("catalog-1");
    expect(changed).toHaveBeenCalledOnce();
    expect(host.scrollTo).not.toHaveBeenCalled();
    host.scrollY = 80; // A layout-induced scroll must not replace saved history.
    host.dispatchEvent(new Event("scroll"));
    controller?.commit();
    expect(host.scrollTo).toHaveBeenLastCalledWith({
      left: 0,
      top: 1400,
      behavior: "instant",
    });
    host.scrollY = 1700;
    host.dispatchEvent(new Event("scroll"));
    traverse("product-1");
    controller?.commit();
    expect(host.scrollY).toBe(0);
  });
  it("keeps separate positions for repeated entries at the same URL", () => {
    const { host, traverse } = browser();
    const controller = installScrollRestoration(host, () => {});
    host.navigation.currentEntry = { key: "catalog-2" };
    host.scrollY = 300;
    controller?.commit();
    traverse("catalog-1");
    controller?.commit();
    expect(host.scrollY).toBe(1400);
    traverse("catalog-2");
    controller?.commit();
    expect(host.scrollY).toBe(300);
  });
  it("does not reset push navigation or invent a position for an unknown entry", () => {
    const { host, traverse } = browser();
    const controller = installScrollRestoration(host, () => {});
    host.navigation.currentEntry = { key: "product-1" };
    host.scrollY = 132;
    controller?.commit();
    expect(host.scrollTo).not.toHaveBeenCalled();
    traverse("unknown");
    controller?.commit();
    expect(host.scrollTo).not.toHaveBeenCalled();
  });
  it("preserves native document navigation and removes every listener on disposal", () => {
    const { host, traverse } = browser();
    const changed = vi.fn();
    const controller = installScrollRestoration(host, changed);
    host.dispatchEvent(new Event("pagehide"));
    expect(host.history.scrollRestoration).toBe("auto");
    host.dispatchEvent(new Event("pageshow"));
    expect(host.history.scrollRestoration).toBe("manual");
    controller?.dispose();
    expect(host.history.scrollRestoration).toBe("auto");
    traverse("other");
    expect(changed).not.toHaveBeenCalled();
  });
  it("leaves unsupported browsers on their native restoration path", () => {
    const { host } = browser();
    const legacy = { ...host, navigation: undefined };
    expect(installScrollRestoration(legacy, () => {})).toBeNull();
    expect(host.history.scrollRestoration).toBe("auto");
  });
  it("uses intercepted traversal outside popstate and unblocks it in the layout commit", async () => {
    const { host } = browser();
    const render = vi.fn();
    const controller = installScrollRestoration(host, render);
    host.navigation.currentEntry = { key: "product-1" };
    host.scrollY = 0;
    controller?.commit();
    let finished: Promise<void> = Promise.resolve();
    const intercept = vi.fn((options: { handler: () => Promise<void> }) => {
      finished = options.handler();
    });
    host.navigation.dispatchEvent(
      Object.assign(new Event("navigate"), {
        navigationType: "traverse",
        canIntercept: true,
        hashChange: false,
        destination: {
          key: "catalog-1",
          url: "https://shop.example/shop",
          sameDocument: true,
        },
        intercept,
      }),
    );
    host.navigation.currentEntry = { key: "catalog-1" };
    const legacyRouter = vi.fn();
    host.addEventListener("popstate", legacyRouter);
    host.dispatchEvent(new Event("popstate"));
    expect(legacyRouter).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledWith("https://shop.example/shop");
    expect(intercept).toHaveBeenCalledWith(
      expect.objectContaining({ scroll: "manual", focusReset: "manual" }),
    );
    expect(host.scrollY).toBe(0);
    expect(controller?.commit()).toBe(true);
    await finished;
    expect(host.scrollY).toBe(1400);
  });
  it("retains saved scroll through Next's same-destination replaceState abort", async () => {
    const { host } = browser();
    const controller = installScrollRestoration(host, () => {});
    host.navigation.currentEntry = { key: "product-1" };
    host.scrollY = 0;
    controller?.commit();
    const cancellation = new AbortController();
    let finished: Promise<void> = Promise.resolve();
    host.navigation.dispatchEvent(
      Object.assign(new Event("navigate"), {
        navigationType: "traverse",
        canIntercept: true,
        signal: cancellation.signal,
        destination: {
          key: "catalog-1",
          url: "https://shop.example/shop",
          sameDocument: true,
        },
        intercept: (options: { handler: () => Promise<void> }) => {
          finished = options.handler();
        },
      }),
    );
    host.navigation.currentEntry = { key: "catalog-1" };
    cancellation.abort();
    host.navigation.dispatchEvent(
      Object.assign(new Event("navigate"), {
        navigationType: "replace",
        destination: { key: "catalog-1", url: "https://shop.example/shop" },
      }),
    );
    await finished;
    controller?.commit();
    expect(host.scrollY).toBe(1400);
  });
  it("leaves cross-document, hash and un-interceptable traversals to the native router", () => {
    for (const overrides of [
      { canIntercept: false },
      { hashChange: true },
      {
        destination: {
          key: "other",
          url: "https://shop.example/help",
          sameDocument: false,
        },
      },
    ]) {
      const { host } = browser();
      const render = vi.fn();
      installScrollRestoration(host, render);
      const intercept = vi.fn();
      host.navigation.dispatchEvent(
        Object.assign(new Event("navigate"), {
          navigationType: "traverse",
          canIntercept: true,
          hashChange: false,
          destination: {
            key: "other",
            url: "https://shop.example/shop",
            sameDocument: true,
          },
          intercept,
          ...overrides,
        }),
      );
      host.dispatchEvent(new Event("popstate"));
      expect(intercept).not.toHaveBeenCalled();
      expect(render).toHaveBeenCalledWith();
    }
  });
});
