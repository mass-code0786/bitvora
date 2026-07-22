import type { Metadata } from "next";
import "./globals.css";
import "./country-picker.css";

export const metadata: Metadata = { title: "Bitvora — Trade. Earn. Grow.", description: "Modern crypto copy-trading and team growth dashboard." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><head><link rel="preconnect" href="https://s3.tradingview.com"/><link rel="dns-prefetch" href="https://s3.tradingview.com"/><link rel="preload" href="https://s3.tradingview.com/tv.js" as="script"/></head><body>{children}</body></html>; }
