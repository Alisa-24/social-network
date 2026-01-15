import type { Metadata } from "next";
import "./globals.css";
import ToastContainer from "@/components/ui/toast-container";

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
      <body className="antialiased bg-slate-950 text-white">
        {children}

        <ToastContainer />
      </body>
    </html>
  );
}
