import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brown Basketball Analytics",
  description: "Brown men's basketball analytics dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
