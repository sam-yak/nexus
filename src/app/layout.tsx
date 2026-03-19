import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus — Multi-Hop Research Engine",
  description:
    "AI-powered research with autonomous multi-hop search, knowledge graph visualization, and contradiction detection.",
};

// Inline script to prevent theme flash on load
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('nexus-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="noise-overlay">{children}</body>
    </html>
  );
}
