import { z } from "zod";
import type { PendingToolCall, ToolActivity } from "./webmcp";

export const activityStorageKey = "office-supply.webmcp-activity.v1";
export const activityLimit = 30;
const activitySchema = z.strictObject({
  id: z.uuid(),
  name: z.string().max(128),
  input: z.unknown(),
  output: z.string().max(60000),
  success: z.boolean(),
  timestamp: z.iso.datetime(),
  durationMs: z.number().int().nonnegative(),
  cancelled: z.boolean().optional(),
});

function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[omitted]";
  if (typeof value === "string")
    return value
      .replace(
        /https?:\/\/checkout\.stripe\.com[^\s"<>]*/gi,
        "[Stripe checkout URL omitted]",
      )
      .replace(/cs_(?:test|live)_[A-Za-z0-9]+/g, "[session ID omitted]")
      .replace(/[A-Z0-9._%+'-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
      .replace(/(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+/g, "[key redacted]")
      .slice(0, 1000);
  if (Array.isArray(value))
    return value.slice(0, 30).map((item) => redact(item, depth + 1));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 40)
        .map(([key, item]) => [
          key,
          /email|contact|address|card|token|secret|sessionId|attemptId/i.test(
            key,
          )
            ? "[redacted]"
            : redact(item, depth + 1),
        ]),
    );
  return value;
}

// Invalid extra arguments may contain arbitrary private data. Only recognized
// arguments enter the transcript; contact names and emails are always omitted.
export function safeToolInput(entry: PendingToolCall): PendingToolCall {
  const allowed = new Set([
    "productId",
    "quantity",
    "query",
    "category",
    "connectivity",
    "maxPriceCents",
    "inStockOnly",
    "sort",
    "shippingMethod",
    "acknowledgeDemo",
  ]);
  const input =
    entry.input &&
    typeof entry.input === "object" &&
    !Array.isArray(entry.input)
      ? Object.fromEntries(
          Object.entries(entry.input)
            .filter(([key]) => allowed.has(key))
            .slice(0, 30)
            .map(([key, value]) => [key, redact(value)]),
        )
      : "[invalid input omitted]";
  return { ...entry, input };
}

export function safeToolActivity(entry: ToolActivity): ToolActivity {
  let output: unknown;
  try {
    output = redact(JSON.parse(entry.output));
  } catch {
    output = "[unavailable output]";
  }
  return {
    ...entry,
    input: safeToolInput(entry).input,
    output: JSON.stringify(output),
  };
}

export function restoreToolActivity(serialized: string | null): ToolActivity[] {
  if (!serialized || serialized.length > 2_000_000) return [];
  try {
    return z
      .array(activitySchema)
      .max(activityLimit)
      .parse(JSON.parse(serialized))
      .map(safeToolActivity);
  } catch {
    return [];
  }
}

export function exportToolActivity(entries: ToolActivity[]): string {
  return JSON.stringify(
    {
      format: "office-supply.webmcp-activity.v1",
      note: "Recorded WebMCP handler calls, including any in-page scripted scenarios. Caller identity is not provided by this integration. Contact details and Stripe URLs are omitted.",
      calls: [...entries].reverse().map((entry) => {
        const safe = safeToolActivity(entry);
        return { ...safe, output: JSON.parse(safe.output) };
      }),
    },
    null,
    2,
  );
}
