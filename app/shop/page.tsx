import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog-view";
import { categories } from "@/lib/validation";
export const metadata: Metadata = { title: "Shop essentials" };
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const initialCategory = categories.find((value) => value === category);
  return (
    <main id="main" className="page-wrap">
      <div className="page-intro">
        <p className="eyebrow">Good tools for everyday work</p>
        <h1>Your desk. Your way.</h1>
        <p>Find the small upgrades that make your workday feel better.</p>
      </div>
      <CatalogView
        key={initialCategory ?? "all"}
        initialCategory={initialCategory}
      />
    </main>
  );
}
