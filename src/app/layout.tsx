import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Local Project OS",
  description: "A local-first project operating system for one owner.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="dark">{children}</body>
    </html>
  );
}
