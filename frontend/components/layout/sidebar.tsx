"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/review", label: "Review" },
  { href: "/queue", label: "Queue" },
  { href: "/replies", label: "Replies" },
  { href: "/targets", label: "Targets" },
  { href: "/media", label: "Media" },
  { href: "/settings", label: "Settings" },
];

function ReplyStatus() {
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/v1/config/REPLIES_ENABLED");
        if (res.ok) {
          const data = await res.json();
          setIsEnabled(data.value !== "false");
        }
      } catch (e) {}
    }
    fetchStatus();
  }, []);

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8B98A5]">Reply System</span>
        <span
          className={cn(
            "text-xs font-mono px-2 py-0.5 rounded-full",
            isEnabled ? "bg-[#00BA7C] text-white" : "bg-[#F4212E] text-white",
          )}
        >
          {isEnabled ? "Active" : "Paused"}
        </span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#0F0F0F] border-r border-[#FFFFFF1A] flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-[#FFFFFF1A]">
        <Link href="/" className="flex items-center gap-2">
          <span
            style={{ fontFamily: '"Bambino New", sans-serif' }}
            className="text-[20px] font-bold text-white"
          >
            Mandle
          </span>
          <span className="w-2 h-2 rounded-full bg-[#1D9BF0]" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center h-10 px-3 rounded-md text-sm transition-colors relative",
                    isActive
                      ? "bg-[#FFFFFF0D] text-white"
                      : "text-[#8B98A5] hover:text-white hover:bg-[#FFFFFF0D]",
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#1D9BF0] rounded-r" />
                  )}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer with Reply Status */}
      <div className="border-t border-[#FFFFFF1A] py-2">
        <ReplyStatus />
      </div>
    </aside>
  );
}
