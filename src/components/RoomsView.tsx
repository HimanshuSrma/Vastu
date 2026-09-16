"use client";

import { useTranslations } from "next-intl";
import { ROOM_RULES } from "@/lib/rooms";

export function RoomsView() {
  const t = useTranslations("rooms");
  const tDir = useTranslations("directions");

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </header>
      <ul className="space-y-2">
        {ROOM_RULES.map((r) => (
          <li
            key={r.key}
            className="rounded-xl border bg-[var(--card)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold">{t(`list.${r.key}`)}</div>
              <div className="text-xs text-[var(--muted)]">{r.reasonKey}</div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-[var(--muted)]">
                  {t("ideal")}
                </div>
                <div className="text-green-600 dark:text-green-400 font-medium">
                  {r.ideal.map((d) => tDir(d)).join(", ")}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">
                  {t("avoid")}
                </div>
                <div className="text-red-500 font-medium">
                  {r.avoid.map((d) => tDir(d)).join(", ") || "—"}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
