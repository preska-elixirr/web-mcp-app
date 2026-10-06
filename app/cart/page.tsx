import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false, follow: false },
};
export default function CartPage() {
  return (
    <main id="main" className="page-wrap">
      <CartView />
    </main>
  );
}
