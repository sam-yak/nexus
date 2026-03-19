import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus — Multi-Hop Research Engine",
  description:
    "AI-powered research with autonomous multi-hop search, knowledge graph visualization, and contradiction detection.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="noise-overlay">{children}</body>
    </html>
  );
}
