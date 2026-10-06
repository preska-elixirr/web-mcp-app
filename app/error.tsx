"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="page-wrap section-space">
      <div className="empty-state">
        <h1>Something interrupted the page.</h1>
        <p>
          Your saved cart is still in this browser. Try loading the page again.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
