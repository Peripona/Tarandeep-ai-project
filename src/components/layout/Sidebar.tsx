"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, Home, LineChart, BookMarked, MoreHorizontal, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/vocabulary", label: "Vocabulary", icon: BookOpen },
  { href: "/grammar", label: "Grammar", icon: GraduationCap },
  { href: "/progress", label: "Progress", icon: LineChart },
];

const moreLinks = [
  { href: "/reading", label: "Reading", icon: BookMarked },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:block">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/" className="font-semibold tracking-tight">
          <span className="text-destructive">Deutsch</span> Tutor
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {[...primaryLinks, ...moreLinks].map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card/95 backdrop-blur md:hidden">
        {primaryLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                active ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
            moreLinks.some(({ href }) => pathname.startsWith(href))
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          <MoreHorizontal className="size-5" />
          More
        </button>
      </nav>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-border bg-card p-4 pb-8 md:hidden">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">More</span>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <X className="size-5 text-muted-foreground" />
              </button>
            </div>
            {moreLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
