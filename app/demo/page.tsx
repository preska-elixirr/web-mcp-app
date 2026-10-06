import type { Metadata } from "next";
import { DemoGuide } from "@/components/demo-guide";
export const metadata: Metadata = { title: "WebMCP demo guide" };
export default function DemoPage() {
  return (
    <main id="main" className="page-wrap">
      <div className="page-intro">
        <p className="eyebrow">From clicks to tool calls</p>
        <h1>A shop people and agents can use.</h1>
        <p>Try the same shopping operations through native webpage tools.</p>
      </div>
      <DemoGuide />
    </main>
  );
}
