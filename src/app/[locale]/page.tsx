import { setRequestLocale, getTranslations } from "next-intl/server";
import { Compass } from "@/components/Compass";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("compass");
  const tApp = await getTranslations("app");

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">{tApp("name")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("title")}</p>
      </header>
      <Compass />
    </div>
  );
}
