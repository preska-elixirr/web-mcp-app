import type { Metadata } from "next";
import "./globals.css";
import { ShopProvider } from "@/components/shop-provider";
import {
  RouteTransition,
  SiteFooter,
  SiteHeader,
} from "@/components/site-shell";
import { WebMcpPanel } from "@/components/webmcp-activity";
import { metadataOrigin } from "@/lib/stripe";

export const metadata: Metadata = {
  metadataBase: new URL(metadataOrigin()),
  title: {
    default: "Office Supply — A calmer workspace",
    template: "%s · Office Supply",
  },
  description:
    "A fictional office webshop demonstrating shared operations for people and webpage tools.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ShopProvider>
          <SiteHeader />
          <RouteTransition>{children}</RouteTransition>
          <SiteFooter />
          <WebMcpPanel />
        </ShopProvider>
      </body>
    </html>
  );
}
