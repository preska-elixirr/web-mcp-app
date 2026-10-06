import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Office Supply — WebMCP demo",
  description:
    "A fictional office webshop demonstrating shared operations for people and webpage tools.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
