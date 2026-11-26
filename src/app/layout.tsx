import "@/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
  title: { default: "AskCode", template: "%s · AskCode" },
  description:
    "Connect a GitHub repository and ask questions about the code in plain English.",
  icons: [{ rel: "icon", url: "/logo.png" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-screen antialiased">
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
