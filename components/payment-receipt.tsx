"use client";
import { useEffect } from "react";
import { useShop } from "./shop-provider";
export function ClearPaidCart({
  signature,
  sessionId,
}: {
  signature: string;
  sessionId: string;
}) {
  const { state, dispatch } = useShop();
  useEffect(() => {
    if (!state.hydrated) return;
    // Revisiting a paid receipt must not clear a newly rebuilt identical cart.
    const key = "office-supply.paid-sessions.v1";
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      const sessions = Array.isArray(saved)
        ? saved
            .filter(
              (id): id is string =>
                typeof id === "string" && /^cs_test_[A-Za-z0-9]+$/.test(id),
            )
            .slice(-50)
        : [];
      if (sessions.includes(sessionId)) return;
      localStorage.setItem(
        key,
        JSON.stringify([...sessions, sessionId].slice(-50)),
      );
    } catch {
      /* With blocked storage, the current tab still keeps a working cart. */
    }
    dispatch({ type: "paid", signature });
  }, [state.hydrated, dispatch, signature, sessionId]);
  return null;
}
