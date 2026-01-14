import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Network",
  description: "Connect with friends and share your moments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
