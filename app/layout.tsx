import type { Metadata } from "next";
import "./globals.css";
import "./country-picker.css";

export const metadata: Metadata = { title: "Bitvora — Trade. Earn. Grow.", description: "Modern crypto copy-trading and team growth dashboard." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
