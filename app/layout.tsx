import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirPulse Airtime Service",
  description: "Advanced USSD Airtime Dashboard",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 0.8,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        {children}
      </body>
    </html>
  );
}
