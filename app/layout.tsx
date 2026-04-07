import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirPulse Airtime Service",
  description: "Advanced USSD Airtime Dashboard",
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
