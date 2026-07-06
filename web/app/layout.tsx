import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RekberWE.id",
  description: "Transaksi rekber aman untuk buyer dan seller",
  icons: {
    icon: "/assets/rekberwe-favicon.png?v=6",
    apple: "/assets/rekberwe-favicon.png?v=6",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
