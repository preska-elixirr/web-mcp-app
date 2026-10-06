"use client";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  createShopTools,
  executeNativeTool,
  type ModelContext,
  registerShopTools,
  type ToolActivity,
} from "@/lib/webmcp";
import { useShop } from "./shop-provider";

type Support = "checking" | "available" | "unavailable" | "failed";
type ContextValue = {
  support: Support;
  activity: ToolActivity[];
  clearActivity: () => void;
  runNativeScenario: () => Promise<void>;
};
const Context = createContext<ContextValue | null>(null);
export function WebMcpProvider({ children }: { children: React.ReactNode }) {
  const { dispatch, getState } = useShop();
  const router = useRouter();
  const [support, setSupport] = useState<Support>("checking");
  const [activity, setActivity] = useState<ToolActivity[]>([]);
  const native = useRef<ModelContext | null>(null);
  const record = useCallback(
    (entry: ToolActivity) =>
      setActivity((previous) => [entry, ...previous].slice(0, 20)),
    [],
  );
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context || typeof context.registerTool !== "function") {
      setSupport("unavailable");
      return;
    }
    native.current = context;
    const controller = new AbortController();
    const tools = createShopTools({
      getState,
      dispatch: (action) => dispatch(action, false),
      openCheckout: () => router.push("/checkout"),
      record,
    });
    registerShopTools(context, tools, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setSupport("available");
      })
      .catch(() => {
        controller.abort();
        native.current = null;
        setSupport("failed");
      });
    return () => {
      controller.abort();
      native.current = null;
    };
  }, [dispatch, getState, router, record]);
  const runNativeScenario = useCallback(async () => {
    const context = native.current;
    if (!context?.getTools || !context.executeTool)
      throw new Error(
        "This browser does not support native tool discovery and execution.",
      );
    const tools = await context.getTools();
    async function call(name: string, input: unknown) {
      const tool = tools.find((item) => item.name === name);
      if (!tool || !context?.executeTool)
        throw new Error(`Tool unavailable: ${name}`);
      const result = await executeNativeTool(context, tool, input);
      if (typeof result === "string" && JSON.parse(result).ok === false)
        throw new Error(JSON.parse(result).error.message);
    }
    dispatch({ type: "reset" }, false);
    setActivity([]);
    await call("search_products", {
      category: "keyboards",
      connectivity: "wireless",
      inStockOnly: true,
      sort: "price_asc",
    });
    await call("get_product_details", { productId: "kb-air" });
    await call("add_to_cart", { productId: "kb-air", quantity: 2 });
    await call("search_products", {
      category: "mice",
      connectivity: "wireless",
      inStockOnly: true,
      sort: "price_asc",
    });
    await call("add_to_cart", { productId: "mouse-air", quantity: 2 });
    await call("get_cart", {});
    await call("prepare_checkout", {});
  }, [dispatch]);
  return (
    <Context
      value={{
        support,
        activity,
        clearActivity: () => setActivity([]),
        runNativeScenario,
      }}
    >
      {children}
    </Context>
  );
}
export function useWebMcp() {
  const context = useContext(Context);
  if (!context) throw new Error("WebMCP provider required");
  return context;
}
