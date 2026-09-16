"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ROOM_RULES, type RoomKey } from "@/lib/rooms";
import { DIRECTIONS_16, type Direction16 } from "@/lib/utils";
import { detectDoshas, type Dosha, type PlacedRoom } from "@/lib/dosha";

export function DoshaView() {
  const t = useTranslations("dosha");
  const tRooms = useTranslations("rooms");
  const tDir = useTranslations("directions");

  const [placed, setPlaced] = useState<PlacedRoom[]>([]);
  const [doshas, setDoshas] = useState<Dosha[] | null>(null);

  const setRoomDir = (room: RoomKey, dir: Direction16 | "") => {
    setPlaced((prev) => {
      const rest = prev.filter((p) => p.room !== room);
      return dir === "" ? rest : [...rest, { room, direction: dir }];
    });
  };

  const scan = () => setDoshas(detectDoshas(placed));

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </header>

      <div className="space-y-2 mb-4">
        {ROOM_RULES.map((r) => {
          const cur = placed.find((p) => p.room === r.key)?.direction ?? "";
          return (
            <div
              key={r.key}
              className="flex items-center justify-between rounded-xl border bg-[var(--card)] p-3"
            >
              <div className="text-sm font-medium">
                {tRooms(`list.${r.key}`)}
              </div>
              <select
                value={cur}
                onChange={(e) =>
                  setRoomDir(r.key, e.target.value as Direction16 | "")
                }
                className="rounded-lg border bg-[var(--bg)] px-2 py-1 text-sm"
              >
                <option value="">—</option>
                {DIRECTIONS_16.map((d) => (
                  <option key={d} value={d}>
                    {tDir(d)} ({d})
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <button
        onClick={scan}
        className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-fg)]"
      >
        {t("scan")}
      </button>

      {doshas && (
        <div className="mt-6 space-y-2">
          {doshas.length === 0 ? (
            <div className="rounded-xl border p-4 text-center text-green-600 dark:text-green-400">
              {t("none")}
            </div>
          ) : (
            doshas.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border bg-[var(--card)] p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    {tRooms(`list.${d.room}`)} · {tDir(d.direction)}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      d.severity === "high"
                        ? "bg-red-500 text-white"
                        : d.severity === "medium"
                          ? "bg-orange-500 text-white"
                          : "bg-yellow-400 text-black"
                    }`}
                  >
                    {t(`severity.${d.severity}`)}
                  </span>
                </div>
                <div className="mt-2 text-sm text-[var(--muted)]">
                  {d.messageKey}
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-xs uppercase text-[var(--muted)]">
                    {t("remedy")}:{" "}
                  </span>
                  {d.remedyKey}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
