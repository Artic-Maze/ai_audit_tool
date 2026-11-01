import { Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "GrowthLens — Free AI growth audit for Shopify stores",
    template: "%s · GrowthLens",
  },
  description:
    "Enter a Shopify store URL and get a scored audit of AI opportunities across product copy, search, support, recommendations and email.",
  applicationName: "GrowthLens",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.variable} ${geistMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
