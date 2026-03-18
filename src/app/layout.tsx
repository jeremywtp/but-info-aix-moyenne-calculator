import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.scss";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "600"],
});

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Coefficients & Notes | BUT Informatique",
  description: "Calculateur de moyennes et validation pour le BUT Informatique - Arrete du 26 mai 2022",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
