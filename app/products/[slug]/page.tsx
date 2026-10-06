import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ProductDetails } from "@/components/product-details";
import { catalog, categoryLabels } from "@/lib/catalog";
import { productImage, productSlug } from "@/lib/products";
export function generateStaticParams() {
  return catalog.map((product) => ({ slug: productSlug(product) }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = catalog.find((item) => productSlug(item) === slug);
  return product
    ? {
        title: product.name,
        description: product.description,
        openGraph: { title: product.name, images: [productImage(product)] },
      }
    : { title: "Product not found" };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = catalog.find((item) => productSlug(item) === slug);
  if (!product) notFound();
  return (
    <main id="main" className="page-wrap">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/shop">Shop</Link>
        <span>/</span>
        <Link href={`/shop?category=${product.category}`}>
          {categoryLabels[product.category]}
        </Link>
        <span>/</span>
        <span aria-current="page">{product.name}</span>
      </nav>
      <ProductDetails product={product} />
      <section className="section-space">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Keep good company</p>
            <h2>A few more essentials.</h2>
          </div>
        </div>
        <div className="product-grid">
          {catalog
            .filter((item) => item.id !== product.id && item.stock > 0)
            .sort(
              (a, b) =>
                Number(b.category === product.category) -
                Number(a.category === product.category),
            )
            .slice(0, 4)
            .map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
        </div>
      </section>
    </main>
  );
}
