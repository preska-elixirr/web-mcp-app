"use client";
import { Search, SlidersHorizontal } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { catalog, categoryLabels } from "@/lib/catalog";
import { searchProducts } from "@/lib/domain";
import { categories, type SearchFilters } from "@/lib/validation";
import { transitionView } from "@/lib/view-transitions";
import { ProductCard } from "./product-card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
export function CatalogView({
  category,
  onCategoryChange,
}: {
  category?: SearchFilters["category"];
  onCategoryChange: (category: SearchFilters["category"]) => void;
}) {
  const [filters, setFilters] = useState<Omit<SearchFilters, "category">>({
    sort: "featured",
  });
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [maxPrice, setMaxPrice] = useState("");
  const [priceError, setPriceError] = useState("");
  const [mobileFilters, setMobileFilters] = useState(false);
  const products = searchProducts({
    ...filters,
    category,
    query: deferredQuery,
  });
  const update = (value: Partial<Omit<SearchFilters, "category">>) =>
    transitionView(() => setFilters((previous) => ({ ...previous, ...value })));
  return (
    <section className="catalog-layout" aria-label="Product catalog">
      <aside
        id="catalog-filters"
        className={`filter-panel ${mobileFilters ? "filters-open" : ""}`}
      >
        <h2>Make it yours</h2>
        <fieldset>
          <legend>Category</legend>
          <div className="category-filters">
            <Button
              variant={!category ? "secondary" : "ghost"}
              aria-pressed={!category}
              onClick={() => transitionView(() => onCategoryChange(undefined))}
            >
              All essentials <span>{catalog.length}</span>
            </Button>
            {categories.map((value) => (
              <Button
                key={value}
                variant={category === value ? "secondary" : "ghost"}
                aria-pressed={category === value}
                onClick={() => transitionView(() => onCategoryChange(value))}
              >
                {categoryLabels[value]}
                <span>
                  {
                    catalog.filter((product) => product.category === value)
                      .length
                  }
                </span>
              </Button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Connection</legend>
          <label htmlFor="connectivity" className="sr-only">
            Connection
          </label>
          <NativeSelect
            id="connectivity"
            value={filters.connectivity ?? "all"}
            onChange={(event) =>
              update({
                connectivity:
                  event.target.value === "all"
                    ? undefined
                    : (event.target.value as SearchFilters["connectivity"]),
              })
            }
          >
            <NativeSelectOption value="all">Any connection</NativeSelectOption>
            <NativeSelectOption value="wireless">Wireless</NativeSelectOption>
            <NativeSelectOption value="wired">Wired</NativeSelectOption>
            <NativeSelectOption value="none">
              No connection needed
            </NativeSelectOption>
          </NativeSelect>
        </fieldset>
        <fieldset>
          <legend>Price</legend>
          <label htmlFor="max-price">Maximum unit price (€)</label>
          <Input
            id="max-price"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="No limit"
            value={maxPrice}
            aria-invalid={!!priceError}
            aria-describedby={priceError ? "price-error" : undefined}
            onChange={(event) => setMaxPrice(event.target.value)}
            onBlur={() => {
              if (maxPrice === "") {
                setPriceError("");
                update({ maxPriceCents: undefined });
              } else {
                const value = Number(maxPrice);
                if (!Number.isFinite(value) || value < 0 || value > 100000)
                  setPriceError("Enter a price between €0 and €100,000.");
                else {
                  setPriceError("");
                  update({ maxPriceCents: Math.round(value * 100) });
                }
              }
            }}
          />
          {priceError && (
            <p id="price-error" className="field-error">
              {priceError}
            </p>
          )}
        </fieldset>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.inStockOnly ?? false}
            onChange={(event) => update({ inStockOnly: event.target.checked })}
          />
          In stock only
        </label>
        <Button
          variant="outline"
          onClick={() => {
            setQuery("");
            setMaxPrice("");
            setPriceError("");
            transitionView(() => {
              setFilters({ sort: "featured" });
              onCategoryChange(undefined);
            });
          }}
        >
          Clear filters
        </Button>
        <div className="filter-note">
          A calmer desk starts
          <br />
          with a clearer choice.
        </div>
      </aside>
      <div>
        <div className="catalog-toolbar">
          <div className="search-field">
            <Search size={18} aria-hidden="true" />
            <label htmlFor="product-search" className="sr-only">
              Search products
            </label>
            <Input
              id="product-search"
              type="search"
              placeholder="Search your next essential"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="sort-field">
            <label htmlFor="sort">Sort by</label>
            <NativeSelect
              id="sort"
              aria-label="Sort by"
              value={filters.sort}
              onChange={(event) =>
                update({ sort: event.target.value as SearchFilters["sort"] })
              }
            >
              <NativeSelectOption value="featured">Featured</NativeSelectOption>
              <NativeSelectOption value="price_asc">
                Price: low to high
              </NativeSelectOption>
              <NativeSelectOption value="price_desc">
                Price: high to low
              </NativeSelectOption>
              <NativeSelectOption value="name">Name</NativeSelectOption>
            </NativeSelect>
          </div>
          <Button
            variant="outline"
            className="filter-toggle"
            aria-expanded={mobileFilters}
            aria-controls="catalog-filters"
            onClick={() => setMobileFilters(!mobileFilters)}
          >
            <SlidersHorizontal />
            Filters
          </Button>
        </div>
        <p className="catalog-count" role="status">
          {products.length} essentials
          {category ? ` / ${categoryLabels[category]}` : ""}
        </p>
        <div className="product-grid catalog-products">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {products.length === 0 && (
          <div className="empty-state">
            <Search size={36} />
            <h2>No essentials found.</h2>
            <p>Try another search or loosen your filters.</p>
          </div>
        )}
      </div>
    </section>
  );
}
