import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "E-Commerce Platform — White Label Store",
  description:
    "Production-ready white-label e-commerce platform with admin panel and storefront",

  metadataBase: new URL("https://fokrul-store.com"),

  openGraph: {
    title: "E-Commerce Platform — White Label Store",
    description:
      "Production-ready white-label e-commerce platform with admin panel and storefront",
    url: "https://fokrul-store.com",
    siteName: "E-Commerce Platform",
    type: "website",
    images: [
      {
        url: "https://your-project.vercel.app/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
