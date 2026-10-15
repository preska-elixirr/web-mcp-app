"use client";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createShopTools,
  executeNativeTool,
  type ModelContext,
  type PendingToolCall,
  registerShopTools,
  type ToolActivity,
  type ToolDefinition,
} from "@/lib/webmcp";
import {
  activityLimit,
  activityStorageKey,
  restoreToolActivity,
  safeToolActivity,
  safeToolInput,
} from "@/lib/webmcp-activity";
import { useShop } from "./shop-provider";

type Support = "checking" | "available" | "unavailable" | "failed";
export type DemoScenario = "shopping" | "stock" | "adjust";
type ContextValue = {
  support: Support;
  definitions: ToolDefinition[];
  registeredCount: number;
  callsThisDocument: number;
  canRunScenario: boolean;
  scenario: DemoScenario | null;
  activity: ToolActivity[];
  pending: PendingToolCall[];
  historySaved: boolean;
  clearActivity: () => void;
  runNativeScenario: (scenario?: DemoScenario) => Promise<void>;
};
const Context = createContext<ContextValue | null>(null);
export function WebMcpProvider({ children }: { children: React.ReactNode }) {
  const { dispatch, getState } = useShop();
  const router = useRouter();
  const [support, setSupport] = useState<Support>("checking");
  const [registeredCount, setRegisteredCount] = useState(0);
  const [callsThisDocument, setCallsThisDocument] = useState(0);
  const [canRunScenario, setCanRunScenario] = useState(false);
  const [scenario, setScenario] = useState<DemoScenario | null>(null);
  const scenarioRunning = useRef(false);
  const [activity, setActivity] = useState<ToolActivity[]>([]);
  const activityRef = useRef<ToolActivity[]>([]);
  const [pending, setPending] = useState<PendingToolCall[]>([]);
  const [historySaved, setHistorySaved] = useState(true);
  const native = useRef<ModelContext | null>(null);
  useEffect(() => {
    try {
      const restored = restoreToolActivity(
        sessionStorage.getItem(activityStorageKey),
      );
      activityRef.current = restored;
      setActivity(restored);
    } catch {
      setHistorySaved(false);
    }
  }, []);
  const clearActivity = useCallback(() => {
    activityRef.current = [];
    setActivity([]);
    try {
      sessionStorage.removeItem(activityStorageKey);
    } catch {
      setHistorySaved(false);
    }
  }, []);
  const record = useCallback((entry: ToolActivity) => {
    const next = [safeToolActivity(entry), ...activityRef.current].slice(
      0,
      activityLimit,
    );
    activityRef.current = next;
    setActivity(next);
    setPending((previous) => previous.filter((call) => call.id !== entry.id));
    setCallsThisDocument((count) => count + 1);
    // Write the redacted transcript before returning, including before a
    // Stripe navigation. No contact data or checkout URL is persisted.
    try {
      sessionStorage.setItem(activityStorageKey, JSON.stringify(next));
    } catch {
      setHistorySaved(false);
    }
  }, []);
  const started = useCallback((entry: PendingToolCall) => {
    setPending((previous) => [...previous, safeToolInput(entry)]);
  }, []);
  const tools = useMemo(
    () =>
      createShopTools({
        getState,
        dispatch: (action) => dispatch(action, false),
        openCheckout: () => router.push("/checkout"),
        record,
        started,
      }),
    [dispatch, getState, router, record, started],
  );
  const definitions = useMemo(
    () => tools.map(({ execute: _execute, ...definition }) => definition),
    [tools],
  );
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    setCanRunScenario(false);
    setRegisteredCount(0);
    if (!context || typeof context.registerTool !== "function") {
      setSupport("unavailable");
      return;
    }
    native.current = context;
    const controller = new AbortController();
    setSupport("checking");
    registerShopTools(context, tools, controller.signal, () => {
      if (!controller.signal.aborted) setRegisteredCount((count) => count + 1);
    })
      .then(() => {
        if (!controller.signal.aborted) {
          setSupport("available");
          setCanRunScenario(
            typeof context.getTools === "function" &&
              typeof context.executeTool === "function",
          );
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        controller.abort();
        native.current = null;
        setRegisteredCount(0);
        setCanRunScenario(false);
        setSupport("failed");
      });
    return () => {
      controller.abort();
      native.current = null;
    };
  }, [tools]);
  const runNativeScenario = useCallback(
    async (selected: DemoScenario = "shopping") => {
      if (scenarioRunning.current) return;
      const context = native.current;
      if (!context?.getTools || !context.executeTool)
        throw new Error(
          "This browser cannot run the in-page scenario. Registration for a compatible external agent may still be available.",
        );
      scenarioRunning.current = true;
      setScenario(selected);
      try {
        async function call(
          name: string,
          input: unknown,
          expectedError?: string,
        ) {
          const available = await context?.getTools?.();
          const tool = available?.find((item) => item.name === name);
          if (!tool || !context) throw new Error(`Tool unavailable: ${name}`);
          const result = await executeNativeTool(context, tool, input);
          if (result === null) return null;
          if (typeof result !== "string")
            throw new Error("Unexpected native tool response.");
          const parsed = JSON.parse(result);
          if (expectedError) {
            if (parsed.ok !== false || parsed.error?.code !== expectedError)
              throw new Error(
                `Expected ${expectedError}; the scenario did not complete as described.`,
              );
          } else if (parsed.ok === false) throw new Error(parsed.error.message);
          return parsed.result;
        }
        clearActivity();
        await call("clear_cart", {});
        if (selected === "stock") {
          const product = await call("get_product_details", {
            productId: "kb-air",
          });
          await call(
            "add_to_cart",
            { productId: "kb-air", quantity: product.stock + 1 },
            "INSUFFICIENT_STOCK",
          );
          await call("get_cart", {});
          await call("add_to_cart", { productId: "kb-air", quantity: 2 });
        } else if (selected === "adjust") {
          await call("add_to_cart", { productId: "mouse-air", quantity: 4 });
          await call("set_cart_quantity", {
            productId: "mouse-air",
            quantity: 2,
          });
          await call("get_cart", {});
        } else {
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
        }
        await call("get_checkout_summary", { shippingMethod: "standard" });
        if (selected === "shopping") await call("prepare_checkout", {});
      } finally {
        scenarioRunning.current = false;
        setScenario(null);
      }
    },
    [clearActivity],
  );
  return (
    <Context
      value={{
        support,
        definitions,
        registeredCount,
        callsThisDocument,
        canRunScenario,
        scenario,
        activity,
        pending,
        historySaved,
        clearActivity,
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
