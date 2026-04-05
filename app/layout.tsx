import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toko Eyang Tono",
  description: "Sistem Manajemen Stok dan Penjualan",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
