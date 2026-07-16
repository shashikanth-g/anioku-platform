import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { HydrationMarker } from "@/components/HydrationMarker";

export const metadata: Metadata = {
  title: "ANKU",
  description: "AI-native collaborative software engineering platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <HydrationMarker />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
