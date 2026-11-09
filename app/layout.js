import { Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { ClimbingRobot } from "@/components/climbing-robot-client";

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

// The app is dark only (see app/globals.css): tell the browser before the CSS
// loads, and tint the mobile browser bar to match.
export const viewport = {
  colorScheme: "dark",
  themeColor: "#060503",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.variable} ${geistMono.variable}`}>
      {/* relative: the climbing robot hangs from the top of the body and
          its rope runs the full height of the page. */}
      <body className="relative antialiased">
        {children}
        <ClimbingRobot />
      </body>
    </html>
  );
}
