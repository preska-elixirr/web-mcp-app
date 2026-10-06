import {
  ArrowRight,
  Cable,
  Keyboard,
  Monitor,
  Mouse,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { catalog } from "@/lib/catalog";
export default function HomePage() {
  return (
    <main id="main">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">For the way you work</p>
          <h1>
            Make room
            <br />
            for <em>good work.</em>
          </h1>
          <p>
            Thoughtful essentials for a calmer desk.
            <br />
            Less clutter. More possibility.
          </p>
          <Button
            className="min-h-13"
            nativeButton={false}
            render={<Link href="/shop" />}
          >
            Find your essentials <ArrowRight />
          </Button>
          <span className="hero-note">
            {catalog.length} carefully chosen tools. One better workspace.
          </span>
        </div>
        <div className="hero-photo">
          <Image
            src="/images/workspace-hero.webp"
            alt="A calm oak workspace with a monitor, ivory keyboard and sage desk lamp"
            width={1672}
            height={941}
            preload
            sizes="(max-width: 768px) 100vw, 65vw"
          />
          <div className="hero-caption">
            <span>THE EVERYDAY WORKSPACE</span>
            <span>Considered, down to the details.</span>
          </div>
        </div>
      </section>
      <div className="benefit-strip">
        <span>
          <Truck />
          Free standard delivery over €100
        </span>
        <span>
          <PackageCheck />
          Simple, thoughtfully chosen essentials
        </span>
        <span>
          <ShieldCheck />
          Secure Stripe test checkout
        </span>
      </div>
      <section className="page-wrap section-space">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A place for everything</p>
            <h2>Find your focus.</h2>
          </div>
          <Link className="text-link" href="/shop">
            Explore the shop <ArrowRight size={18} />
          </Link>
        </div>
        <div className="category-grid">
          {[
            {
              id: "keyboards",
              name: "A better way to type",
              caption: "Keyboards",
              icon: Keyboard,
            },
            {
              id: "mice",
              name: "Move with intention",
              caption: "Mice",
              icon: Mouse,
            },
            {
              id: "monitors",
              name: "See the bigger picture",
              caption: "Monitors",
              icon: Monitor,
            },
            {
              id: "accessories",
              name: "The finishing touches",
              caption: "Desk accessories",
              icon: Cable,
            },
          ].map(({ id, name, caption, icon: Icon }) => (
            <Link
              key={id}
              className="category-tile"
              href={`/shop?category=${id}`}
            >
              <Icon size={32} strokeWidth={1.3} />
              <p>{caption}</p>
              <h3>{name}</h3>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <section className="page-wrap section-space">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Small upgrades. Everyday difference.</p>
            <h2>Meet your desk essentials.</h2>
          </div>
          <Link className="text-link" href="/shop">
            Shop all essentials <ArrowRight size={18} />
          </Link>
        </div>
        <div className="product-grid">
          {catalog
            .filter((product) =>
              ["kb-air", "mouse-arc", "acc-stand", "acc-light"].includes(
                product.id,
              ),
            )
            .map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
        </div>
      </section>
      <section className="editorial-banner page-wrap">
        <p className="eyebrow">Less, but considered.</p>
        <h2>
          A good workspace
          <br />
          starts with the little things.
        </h2>
        <p>
          Useful tools, clear choices and room to think.
          <br />
          That is the idea behind Office Supply.
        </p>
        <Link className="text-link" href="/about">
          Our approach <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}
