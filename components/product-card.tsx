"use client";

import { Cable, Keyboard, Monitor, Mouse, Plus } from "lucide-react";
import { ViewTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { categoryLabels } from "@/lib/catalog";
import { formatPrice } from "@/lib/domain";
import type { Product } from "@/lib/validation";

const categoryIcons = {
  keyboards: Keyboard,
  mice: Mouse,
  monitors: Monitor,
  accessories: Cable,
};

export function ProductCard({
  product,
  quantity,
  ready,
  onAdd,
}: {
  product: Product;
  quantity: number;
  ready: boolean;
  onAdd: () => void;
}) {
  const Icon = categoryIcons[product.category];
  const atLimit = quantity >= product.stock;
  return (
    <ViewTransition default="product-transition">
      <Card className="h-full overflow-hidden border-border/80 py-0 shadow-none">
        <div
          className={`product-art product-art-${product.category}`}
          aria-hidden="true"
        >
          <Icon className="size-20" strokeWidth={1.1} />
          <span className="product-art-label">
            OFFICE / {product.category.toUpperCase()}
          </span>
        </div>
        <CardContent className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{categoryLabels[product.category]}</span>
            {product.connectivity !== "none" && (
              <Badge variant="secondary" className="capitalize">
                {product.connectivity}
              </Badge>
            )}
          </div>
          <h3 className="text-base font-semibold tracking-tight">
            {product.name}
          </h3>
          <p className="min-h-10 text-sm leading-5 text-muted-foreground">
            {product.description}
          </p>
          <div className="mt-auto flex items-center justify-between gap-2">
            <span className="text-xl font-semibold tabular-nums">
              {formatPrice(product.priceCents)}
            </span>
            <span className="text-xs text-muted-foreground">
              {product.stock ? `${product.stock} in stock` : "Out of stock"}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              className="min-h-12 flex-1"
              type="button"
              onClick={onAdd}
              disabled={!ready || atLimit}
              aria-label={`Add ${product.name} to cart`}
            >
              <Plus aria-hidden="true" />
              {product.stock === 0
                ? "Sold out"
                : atLimit
                  ? "Stock limit"
                  : "Add to cart"}
            </Button>
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12"
                  />
                }
                aria-label={`Details for ${product.name}`}
              >
                Details
              </DialogTrigger>
              <DialogContent className="max-h-[85dvh] overflow-y-auto p-6 sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="pr-6 text-xl">
                    {product.name}
                  </DialogTitle>
                  <DialogDescription>{product.description}</DialogDescription>
                </DialogHeader>
                <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                  {product.specifications.map((specification) => (
                    <li key={specification}>{specification}</li>
                  ))}
                </ul>
                <p className="text-xl font-semibold">
                  {formatPrice(product.priceCents)}
                </p>
                <p className="text-muted-foreground">
                  {product.stock} in stock · {quantity} in your cart
                </p>
                <Button
                  type="button"
                  className="min-h-12"
                  disabled={!ready || atLimit}
                  onClick={onAdd}
                >
                  Add to cart
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </ViewTransition>
  );
}
