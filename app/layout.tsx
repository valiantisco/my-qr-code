import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Tracker",
  description: "Internal QR code tracking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
