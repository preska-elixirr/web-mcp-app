"use client";
import { useSearchParams } from "next/navigation";
import { categories, type SearchFilters } from "@/lib/validation";
import { CatalogView } from "./catalog-view";
// Reading the query on the client keeps /shop static, so links prefetch the
// full page and navigation never shows the loading fallback.
export function CatalogRoute() {
  const categoryParam = useSearchParams().get("category");
  const category = categories.find((value) => value === categoryParam);
  const changeCategory = (value: SearchFilters["category"]) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("category", value);
    else url.searchParams.delete("category");
    if (url.href === window.location.href) return;
    // Next syncs native history updates with useSearchParams without a reload.
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
  };
  return <CatalogView category={category} onCategoryChange={changeCategory} />;
}
