import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogRoute } from "@/components/catalog-route";
export const metadata: Metadata = { title: "Shop essentials" };
export default function ShopPage() {
  return (
    <main id="main" className="page-wrap">
      <div className="page-intro">
        <p className="eyebrow">Good tools for everyday work</p>
        <h1>Your desk. Your way.</h1>
        <p>Find the small upgrades that make your workday feel better.</p>
      </div>
      <Suspense>
        <CatalogRoute />
      </Suspense>
    </main>
  );
}
