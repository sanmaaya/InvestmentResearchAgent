import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sanmaaya — AI Investment Research Agent",
  description: "AI-powered Investment Research Agent. Conducts automated financial due diligence, searches real-time news sentiment, and executes risk synthesis on public companies using LangGraph.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
