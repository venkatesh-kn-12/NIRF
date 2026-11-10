import type { Metadata } from "next";
import "./globals.css";
import { RootLayoutWrapper } from "@/components/RootLayoutWrapper";

export const metadata: Metadata = {
  title: "MCA NIRF Assist — Institutional Portal",
  description: "Academic data intelligence repository for NIRF metric compilation, verification workflows, and DCS parameter analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface-canvas text-slate-800 antialiased min-h-screen">
        <RootLayoutWrapper>{children}</RootLayoutWrapper>
      </body>
    </html>
  );
}

