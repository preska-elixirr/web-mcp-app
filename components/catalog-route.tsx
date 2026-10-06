"use client";
import { useSearchParams } from "next/navigation";
import { categories } from "@/lib/validation";
import { CatalogView } from "./catalog-view";
// Reading the query on the client keeps /shop static, so links prefetch the
// full page and navigation never shows the loading fallback.
export function CatalogRoute() {
  const category = useSearchParams().get("category");
  const initialCategory = categories.find((value) => value === category);
  return (
    <CatalogView
      key={initialCategory ?? "all"}
      initialCategory={initialCategory}
    />
  );
}
