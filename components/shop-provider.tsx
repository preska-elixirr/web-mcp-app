"use client";
import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { serializeCart } from "@/lib/domain";
import {
  cartStorageKey,
  initialShopState,
  type ShopAction,
  type ShopState,
  shopReducer,
} from "@/lib/store";
import { transitionView } from "@/lib/view-transitions";
import { Button } from "./ui/button";
import { WebMcpProvider } from "./webmcp-provider";

type ShopContext = {
  state: ShopState;
  dispatch: (action: ShopAction, animate?: boolean) => ShopState;
  getState: () => ShopState;
};
const Context = createContext<ShopContext | null>(null);
export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialShopState);
  const current = useRef(initialShopState);
  const [storageError, setStorageError] = useState("");
  const dispatch = useCallback((action: ShopAction, animate = true) => {
    const next = shopReducer(current.current, action);
    current.current = next;
    // Hydration only reads storage. Writing it back would echo between tabs.
    if (next.hydrated && action.type !== "hydrate") {
      try {
        localStorage.setItem(cartStorageKey, serializeCart(next.cart));
      } catch {
        setStorageError("Your cart cannot be saved in this browser.");
      }
    }
    if (animate) transitionView(() => setState(next));
    else flushSync(() => setState(next));
    return next;
  }, []);
  const getState = useCallback(() => current.current, []);
  useEffect(() => {
    try {
      dispatch({
        type: "hydrate",
        serialized: localStorage.getItem(cartStorageKey),
      });
    } catch {
      dispatch({ type: "hydrate", serialized: null });
      setStorageError(
        "Browser storage is unavailable. Keep this tab open to retain your cart.",
      );
    }
  }, [dispatch]);
  useEffect(() => {
    // Another tab changed the cart: follow it without animation.
    const follow = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || event.key !== cartStorageKey)
        return;
      dispatch({ type: "hydrate", serialized: event.newValue }, false);
    };
    window.addEventListener("storage", follow);
    return () => window.removeEventListener("storage", follow);
  }, [dispatch]);
  useEffect(() => {
    if (!state.message && !state.error) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "dismiss-feedback" }),
      8000,
    );
    return () => window.clearTimeout(timer);
  }, [state.message, state.error, dispatch]);
  return (
    <Context value={{ state, dispatch, getState }}>
      <WebMcpProvider>{children}</WebMcpProvider>
      {storageError && (
        <p className="storage-notice" role="status">
          {storageError}
        </p>
      )}
      {(state.error || state.message) && (
        <div className="shop-toast" role={state.error ? "alert" : "status"}>
          <p>{state.error || state.message}</p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dismiss notification"
            onClick={() => dispatch({ type: "dismiss-feedback" })}
          >
            <X />
          </Button>
        </div>
      )}
    </Context>
  );
}
export function useShop() {
  const context = useContext(Context);
  if (!context) throw new Error("useShop requires ShopProvider");
  return context;
}
