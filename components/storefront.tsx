"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Package,
  RotateCcw,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { CartPanel } from "@/components/cart-panel";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { catalog, categoryLabels } from "@/lib/catalog";
import { getCart, searchProducts, serializeCart } from "@/lib/domain";
import {
  cartStorageKey,
  initialShopState,
  type ShopAction,
  shopReducer,
} from "@/lib/store";
import { categories, type SearchFilters } from "@/lib/validation";
import { transitionView } from "@/lib/view-transitions";

export function Storefront() {
  const [state, dispatch] = useReducer(shopReducer, initialShopState);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState<SearchFilters["category"]>();
  const [connectivity, setConnectivity] =
    useState<SearchFilters["connectivity"]>();
  const [sort, setSort] = useState<SearchFilters["sort"]>("featured");
  const [price, setPrice] = useState("");
  const [maxPriceCents, setMaxPriceCents] = useState<number>();
  const [stockOnly, setStockOnly] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const cartHeading = useRef<HTMLHeadingElement>(null);
  const returnFocusToCart = useRef(false);

  useEffect(() => {
    if (!state.message && !state.error) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "dismiss-feedback" }),
      8000,
    );
    return () => window.clearTimeout(timer);
  }, [state.message, state.error]);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(cartStorageKey);
    } catch {
      setStorageWarning(
        "Your browser cannot save the cart. You can still use the demo.",
      );
    }
    dispatch({ type: "hydrate", serialized: saved });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      window.localStorage.setItem(cartStorageKey, serializeCart(state.cart));
    } catch {
      setStorageWarning(
        "Your browser cannot save the cart. You can still use the demo.",
      );
    }
  }, [state.cart, state.hydrated]);

  useEffect(() => {
    if (returnFocusToCart.current) {
      cartHeading.current?.focus({ preventScroll: true });
      returnFocusToCart.current = false;
    }
  });

  function send(action: ShopAction) {
    if (
      action.type === "confirm" ||
      action.type === "review" ||
      action.type === "cancel-review" ||
      (action.type === "set" && action.quantity === 0)
    )
      returnFocusToCart.current = true;
    transitionView(() => dispatch(action));
  }

  function reset() {
    setQuery("");
    setPrice("");
    transitionView(() => {
      setCategory(undefined);
      setConnectivity(undefined);
      setSort("featured");
      setStockOnly(false);
      setMaxPriceCents(undefined);
      dispatch({ type: "reset" });
    });
  }

  const products = searchProducts({
    query: deferredQuery,
    category,
    connectivity,
    sort,
    maxPriceCents,
    inStockOnly: stockOnly,
  });
  const cart = getCart(state.cart);

  return (
    <>
      <a href="#catalog" className="skip-link">
        Skip to catalog
      </a>
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <a
            href="/"
            className="flex items-center gap-3 font-semibold tracking-tight"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Package className="size-5" aria-hidden="true" />
            </span>
            <span>
              office supply<span className="ml-1 text-primary">.</span>
            </span>
          </a>
          <nav aria-label="Main" className="flex items-center gap-3 sm:gap-5">
            <Badge variant="outline" className="hidden sm:inline-flex">
              WebMCP demo
            </Badge>
            <a
              href="#cart"
              className="flex min-h-12 items-center gap-2 text-sm font-medium"
            >
              <ShoppingBag className="size-4" aria-hidden="true" />
              Cart ({cart.itemCount})
            </a>
            <Button
              type="button"
              variant="ghost"
              className="min-h-12"
              disabled={!state.hydrated}
              onClick={reset}
            >
              <RotateCcw aria-hidden="true" />
              <span className="hidden sm:inline">Reset demo</span>
              <span className="sr-only sm:hidden">Reset demo</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <section
          className="grid gap-8 border-b py-12 sm:py-16 md:grid-cols-[1.5fr_1fr] md:items-end"
          aria-labelledby="page-title"
        >
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              A better day at your desk
            </p>
            <h1
              id="page-title"
              className="max-w-xl text-4xl leading-[1.08] font-semibold tracking-[-0.045em] sm:text-6xl"
            >
              Good tools.
              <br />
              Great work.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
              Thoughtful essentials for your everyday workspace. Find what fits,
              build your cart, and make yourself at home.
            </p>
          </div>
          <div className="rounded-2xl bg-secondary p-6 sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest">
                Try the demo
              </span>
              <ArrowDownRight className="size-5" aria-hidden="true" />
            </div>
            <p className="text-lg leading-7 font-medium">
              Two new colleagues. Two wireless keyboards. Two wireless mice.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Your budget: €180. Start with an empty cart.
            </p>
          </div>
        </section>
        <div className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section
            id="catalog"
            aria-labelledby="catalog-heading"
            className="min-w-0 scroll-mt-6"
          >
            <div className="mb-6 flex items-end justify-between gap-3">
              <h2
                id="catalog-heading"
                className="text-2xl font-semibold tracking-tight"
              >
                The essentials
              </h2>
              <p className="text-sm text-muted-foreground" role="status">
                {products.length} of {catalog.length} products
              </p>
            </div>
            <fieldset className="mb-6 flex flex-wrap gap-2">
              <legend className="sr-only">Product category</legend>
              <Button
                type="button"
                variant={!category ? "default" : "outline"}
                aria-pressed={!category}
                className="min-h-12"
                onClick={() => transitionView(() => setCategory(undefined))}
              >
                All products
              </Button>
              {categories.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={category === value ? "default" : "outline"}
                  aria-pressed={category === value}
                  className="min-h-12"
                  onClick={() => transitionView(() => setCategory(value))}
                >
                  {categoryLabels[value]}
                </Button>
              ))}
            </fieldset>
            <form
              action="/"
              method="get"
              className="mb-7 grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4"
              onSubmit={(event) => event.preventDefault()}
              aria-label="Filter catalog"
            >
              <div className="sm:col-span-2 xl:col-span-4">
                <label
                  htmlFor="query"
                  className="mb-2 block text-xs font-medium"
                >
                  Search products
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-4 left-3 size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="query"
                    name="query"
                    type="search"
                    maxLength={200}
                    placeholder="Keyboard, monitor, USB-C…"
                    className="min-h-12 pl-9 text-base"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="connectivity"
                  className="mb-2 block text-xs font-medium"
                >
                  Connection
                </label>
                <NativeSelect
                  id="connectivity"
                  name="connectivity"
                  className="w-full [&_select]:min-h-12 [&_select]:text-base"
                  value={connectivity ?? "all"}
                  onChange={(event) => {
                    const value = event.target.value;
                    transitionView(() =>
                      setConnectivity(
                        value === "all"
                          ? undefined
                          : (value as SearchFilters["connectivity"]),
                      ),
                    );
                  }}
                >
                  <NativeSelectOption value="all">
                    Any connection
                  </NativeSelectOption>
                  <NativeSelectOption value="wireless">
                    Wireless
                  </NativeSelectOption>
                  <NativeSelectOption value="wired">Wired</NativeSelectOption>
                  <NativeSelectOption value="none">
                    No connection
                  </NativeSelectOption>
                </NativeSelect>
              </div>
              <div>
                <label
                  htmlFor="max-price"
                  className="mb-2 block text-xs font-medium"
                >
                  Max unit price (€)
                </label>
                <Input
                  id="max-price"
                  name="maxPrice"
                  type="number"
                  min="0"
                  max="10000"
                  step="0.01"
                  inputMode="decimal"
                  className="min-h-12 text-base"
                  placeholder="Any price"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  onBlur={(event) => {
                    const input = event.currentTarget;
                    if (input.validity.valid) {
                      const value = input.value;
                      transitionView(() =>
                        setMaxPriceCents(
                          value === ""
                            ? undefined
                            : Math.round(Number(value) * 100),
                        ),
                      );
                    }
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="sort"
                  className="mb-2 block text-xs font-medium"
                >
                  Sort by
                </label>
                <NativeSelect
                  id="sort"
                  name="sort"
                  className="w-full [&_select]:min-h-12 [&_select]:text-base"
                  value={sort}
                  onChange={(event) => {
                    const value = event.target.value as SearchFilters["sort"];
                    transitionView(() => setSort(value));
                  }}
                >
                  <NativeSelectOption value="featured">
                    Featured
                  </NativeSelectOption>
                  <NativeSelectOption value="price_asc">
                    Price: low to high
                  </NativeSelectOption>
                  <NativeSelectOption value="price_desc">
                    Price: high to low
                  </NativeSelectOption>
                  <NativeSelectOption value="name">Name</NativeSelectOption>
                </NativeSelect>
              </div>
              <label
                htmlFor="stock-only"
                className="flex min-h-12 items-center gap-2 self-end text-sm"
              >
                <input
                  id="stock-only"
                  name="inStockOnly"
                  type="checkbox"
                  className="size-5"
                  checked={stockOnly}
                  onChange={(event) => {
                    const value = event.target.checked;
                    transitionView(() => setStockOnly(value));
                  }}
                />
                <span>In stock only</span>
              </label>
            </form>
            {products.length ? (
              <div
                className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                aria-busy={query !== deferredQuery}
              >
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    ready={state.hydrated}
                    quantity={
                      state.cart.find((item) => item.productId === product.id)
                        ?.quantity ?? 0
                    }
                    onAdd={() =>
                      send({ type: "add", productId: product.id, quantity: 1 })
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed py-16 text-center">
                <h3 className="font-semibold">No matches this time.</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a different search or clear your filters.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 min-h-12"
                  onClick={() => {
                    setQuery("");
                    setPrice("");
                    transitionView(() => {
                      setCategory(undefined);
                      setConnectivity(undefined);
                      setMaxPriceCents(undefined);
                      setStockOnly(false);
                    });
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </section>
          <div className="min-w-0 space-y-4 lg:contents">
            <CartPanel state={state} send={send} headingRef={cartHeading} />
          </div>
        </div>
        <div
          className="fixed right-5 bottom-5 left-5 z-40 mx-auto max-w-xl space-y-2 sm:left-auto"
          aria-live="polite"
          aria-atomic="true"
        >
          {(state.message || state.error) && (
            <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2 text-sm shadow-lg">
              <p className={state.error ? "text-destructive" : undefined}>
                {state.error || state.message}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto size-12 shrink-0"
                aria-label="Dismiss notification"
                onClick={() => dispatch({ type: "dismiss-feedback" })}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          )}
          {storageWarning && (
            <p className="rounded-xl border bg-card px-4 py-3 text-sm">
              {storageWarning}
            </p>
          )}
        </div>
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-xs text-muted-foreground">
          <span>Office Supply · A fictional webshop</span>
          <a
            href="https://developer.chrome.com/docs/ai/webmcp"
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center gap-1 underline underline-offset-4"
          >
            About WebMCP
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </a>
        </footer>
      </main>
    </>
  );
}
