"use client";

import { ReactNode } from "react";
import "./globals.css";
import { ConvexProvider } from "@/lib/convex";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0F0F0F] text-white antialiased">
        <ConvexProvider>
          <TooltipProvider>
            <div className="flex">
              <Sidebar />
              <main className="flex-1 ml-[240px] p-6">
                <div className="max-w-[1200px] mx-auto">{children}</div>
              </main>
            </div>
          </TooltipProvider>
        </ConvexProvider>
      </body>
    </html>
  );
}
