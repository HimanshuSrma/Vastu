"use client";

import { Compass, Map, Home, AlertTriangle, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", key: "compass", Icon: Compass },
  { href: "/plan", key: "plan", Icon: Map },
  { href: "/rooms", key: "rooms", Icon: Home },
  { href: "/dosha", key: "dosha", Icon: AlertTriangle },
  { href: "/settings", key: "settings", Icon: Settings },
] as const;

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t bg-[var(--card)]/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-5 max-w-2xl mx-auto">
        {items.map(({ href, key, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={key}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs",
                  active ? "text-[var(--accent)]" : "text-[var(--muted)]",
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                <span>{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
