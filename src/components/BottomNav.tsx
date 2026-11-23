"use client";

import { Compass, Map, Home, AlertTriangle, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", key: "compass", Icon: Compass, isAvailable: true },
  { href: "/plan", key: "plan", Icon: Map, isAvailable: false },
  { href: "/rooms", key: "rooms", Icon: Home, isAvailable: false },
  { href: "/dosha", key: "dosha", Icon: AlertTriangle, isAvailable: false },
  { href: "/settings", key: "settings", Icon: Settings, isAvailable: true },
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
        {items.map(({ href, key, Icon, isAvailable }) => {
          const isActive = isAvailable && pathname === href;
          const className = cn(
            "flex w-full flex-col items-center gap-1 py-2 text-xs",
            isActive ? "text-[var(--accent)]" : "text-[var(--muted)]",
            !isAvailable && "cursor-not-allowed",
          );
          const content = (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} className={cn(!isAvailable && "opacity-40")} />
              <span className={cn("leading-none", !isAvailable && "opacity-40")}>{t(key)}</span>
              <span
                aria-hidden={isAvailable}
                className={cn(
                  "max-w-full truncate rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none tracking-wide",
                  isAvailable ? "invisible" : "bg-[var(--accent)]/15 text-[var(--accent)]",
                )}
              >
                {t("comingSoon")}
              </span>
            </>
          );
          return (
            <li key={key}>
              {isAvailable ? (
                <Link href={href} className={className} aria-current={isActive ? "page" : undefined}>
                  {content}
                </Link>
              ) : (
                <button type="button" disabled className={className}>
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
