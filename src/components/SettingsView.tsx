"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Download, Check } from "lucide-react";
import { useSettings, type Theme, type Depth } from "@/lib/store";
import { usePwaStore, requestInstall } from "@/lib/pwa-install";
import { routing } from "@/i18n/routing";

export function SettingsView() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, depth, setTheme, setDepth } = useSettings();

  const changeLocale = (next: string) => {
    router.replace(pathname, { locale: next as (typeof routing.locales)[number] });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </header>

      <Section title={t("language")}>
        <select
          value={locale}
          onChange={(e) => changeLocale(e.target.value)}
          className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
        >
          {routing.locales.map((l) => (
            <option key={l} value={l}>
              {l === "en" ? "English" : "हिन्दी"}
            </option>
          ))}
        </select>
      </Section>

      <Section title={t("theme")}>
        <div className="flex gap-2">
          {(["system", "light", "dark"] as Theme[]).map((k) => (
            <button
              key={k}
              onClick={() => setTheme(k)}
              className={`rounded-lg border px-3 py-2 text-sm ${theme === k ? "bg-[var(--accent)] text-[var(--accent-fg)] border-transparent" : ""}`}
            >
              {t(k === "system" ? "themeSystem" : k === "light" ? "themeLight" : "themeDark")}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("depth")}>
        <div className="flex flex-col gap-2">
          {(["simple", "full"] as Depth[]).map((k) => (
            <button
              key={k}
              onClick={() => setDepth(k)}
              className={`rounded-lg border px-3 py-3 text-left text-sm ${depth === k ? "border-[var(--accent)] bg-[var(--accent)]/10" : ""}`}
            >
              {t(k === "simple" ? "depthSimple" : "depthFull")}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("about")}>
        <p className="text-sm text-[var(--muted)]">{t("aboutText")}</p>
      </Section>

      <InstallSection />
    </div>
  );
}

function InstallSection() {
  const t = useTranslations("install");
  const phase = usePwaStore((s) => s.phase);
  const platform = usePwaStore((s) => s.platform);
  const openDialog = usePwaStore((s) => s.openDialog);

  if (phase === "idle" || phase === "unavailable") return null;

  if (phase === "already_installed") {
    return (
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {t("settingsInstall")}
        </h2>
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Check size={16} className="text-emerald-500" />
          {t("alreadyInstalled")}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {t("settingsInstall")}
      </h2>
      <button
        onClick={() => (platform === "ios" ? requestInstall() : openDialog())}
        className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm"
      >
        <Download size={16} />
        {t("installButton")}
      </button>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}
