"use client";
import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/domain";
import type { ToolActivity } from "@/lib/webmcp";
import { activityLimit, exportToolActivity } from "@/lib/webmcp-activity";
import { Button } from "./ui/button";
import { useWebMcp } from "./webmcp-provider";

export function WebMcpStatus() {
  const {
    support,
    registeredCount,
    definitions,
    callsThisDocument,
    canRunScenario,
  } = useWebMcp();
  return (
    <div className="webmcp-status">
      <dl>
        <div>
          <dt>Browser API</dt>
          <dd>
            {support === "checking"
              ? "Checking…"
              : support === "unavailable"
                ? "Not available"
                : "Available"}
          </dd>
        </div>
        <div>
          <dt>Tool registration</dt>
          <dd>
            {support === "failed"
              ? "Failed"
              : support === "unavailable"
                ? "Unavailable"
                : `${registeredCount} / ${definitions.length} registered`}
          </dd>
        </div>
        <div>
          <dt>Calls in this page session</dt>
          <dd>{callsThisDocument || "None observed yet"}</dd>
        </div>
        <div>
          <dt>In-page scenario runner</dt>
          <dd>{canRunScenario ? "Available" : "Unavailable"}</dd>
        </div>
      </dl>
      <p>
        Registration confirms browser support, not an agent connection. Calls
        may come from an agent, an inspector or the scripted scenarios; this
        integration cannot identify the caller.
      </p>
    </div>
  );
}

function activitySummary(entry: ToolActivity): string {
  const output = JSON.parse(entry.output);
  if (!entry.success)
    return output?.error?.message ?? "The call did not complete.";
  const result = output?.result;
  if (Array.isArray(result)) return `${result.length} products returned`;
  if (result && typeof result === "object") {
    if (typeof result.itemCount === "number")
      return `${result.itemCount} items · ${formatPrice(result.totalCents)}${typeof result.shippingCents === "number" ? " including delivery" : " product subtotal"}`;
    if (typeof result.shippingCents === "number")
      return `Stripe test checkout · ${formatPrice(result.totalCents)} · payment awaits human review`;
    if (typeof result.stock === "number")
      return `${result.name} · ${formatPrice(result.priceCents)} · ${result.stock} in stock`;
  }
  return "Completed";
}

export function ToolActivityList() {
  const { activity, pending } = useWebMcp();
  return (
    <div className="webmcp-calls">
      <p
        className="webmcp-announcement"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {pending.length
          ? `${pending.length} WebMCP call${pending.length === 1 ? "" : "s"} running.`
          : activity[0]
            ? `Latest call: ${activity[0].name}, ${activity[0].cancelled ? "cancelled" : activity[0].success ? "completed" : "returned an error"}.`
            : "Waiting for a WebMCP call. Ordinary shop clicks do not create entries."}
      </p>
      {pending.map((call) => (
        <div key={call.id} className="webmcp-pending">
          <code>{call.name}</code>
          <span>Running…</span>
        </div>
      ))}
      {activity.map((entry) => (
        <details
          key={entry.id}
          className="tool-activity"
          data-outcome={
            entry.cancelled ? "cancelled" : entry.success ? "success" : "error"
          }
        >
          <summary>
            <strong>{entry.name}</strong>
            <span>
              {entry.cancelled
                ? "Cancelled"
                : entry.success
                  ? "Success"
                  : "Error"}{" "}
              · {entry.durationMs} ms ·{" "}
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <small>{activitySummary(entry)}</small>
          </summary>
          <pre>
            {JSON.stringify(
              { input: entry.input, output: JSON.parse(entry.output) },
              null,
              2,
            )}
          </pre>
        </details>
      ))}
    </div>
  );
}

export function ToolActivityActions() {
  const { activity, clearActivity, historySaved } = useWebMcp();
  const [copyMessage, setCopyMessage] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  return (
    <>
      <div className="webmcp-actions">
        <Button
          type="button"
          variant="outline"
          disabled={!activity.length}
          onClick={async () => {
            const transcript = exportToolActivity(activity);
            try {
              await navigator.clipboard.writeText(transcript);
              setCopyFallback("");
              setCopyMessage("Redacted transcript copied.");
            } catch {
              setCopyFallback(transcript);
              setCopyMessage(
                "Clipboard access is unavailable. Select and copy the transcript below.",
              );
            }
          }}
        >
          Copy transcript
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={!activity.length}
          onClick={() => {
            clearActivity();
            setCopyFallback("");
            setCopyMessage("Activity cleared.");
          }}
        >
          Clear activity
        </Button>
      </div>
      <p className="webmcp-copy-status" role="status">
        {copyMessage}
      </p>
      {copyFallback && (
        <label className="webmcp-copy-fallback">
          Copyable WebMCP transcript
          <textarea
            readOnly
            value={copyFallback}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      )}
      <p className="webmcp-privacy">
        {historySaved
          ? `Up to ${activityLimit} redacted calls stay in this tab across reloads and a return from Stripe.`
          : "Browser storage is unavailable; activity lasts only while this page stays open."}{" "}
        Contact details and Stripe checkout URLs are omitted. Clear activity
        removes this tab’s saved transcript.
      </p>
    </>
  );
}

export function ToolCatalog() {
  const { definitions } = useWebMcp();
  return (
    <div className="webmcp-catalog">
      {definitions.map((tool) => (
        <details key={tool.name} className="tool-activity">
          <summary>
            <strong>{tool.name}</strong>
            <span>
              {tool.annotations.readOnlyHint
                ? "Read only"
                : tool.annotations.consequentialHint
                  ? "Creates a test payment session"
                  : "Updates the shop"}
            </span>
          </summary>
          <p>{tool.description}</p>
          <pre>
            {JSON.stringify(
              { inputSchema: tool.inputSchema, annotations: tool.annotations },
              null,
              2,
            )}
          </pre>
        </details>
      ))}
    </div>
  );
}

export function WebMcpPanel() {
  const { support, registeredCount, activity, pending, scenario } = useWebMcp();
  return (
    <details className="webmcp-panel">
      <summary>
        <span className="webmcp-dot" data-state={support} aria-hidden="true" />
        <strong>WebMCP</strong>
        <span>
          {pending.length
            ? "Running…"
            : support === "available"
              ? `${registeredCount} tools · ${activity.length} calls`
              : support === "checking"
                ? "Checking…"
                : support === "failed"
                  ? "Registration failed"
                  : "API unavailable"}
        </span>
      </summary>
      <div className="webmcp-panel-body">
        <h2>Behind the interaction</h2>
        <p>Actual tool handler calls from this shop.</p>
        {scenario && (
          <p className="webmcp-scenario-note" role="status">
            Scripted in-page scenario running: {scenario}. This is not an
            autonomous agent.
          </p>
        )}
        <WebMcpStatus />
        <ToolActivityActions />
        <ToolActivityList />
        <Link href="/demo">Scenarios, schemas & browser setup →</Link>
      </div>
    </details>
  );
}
