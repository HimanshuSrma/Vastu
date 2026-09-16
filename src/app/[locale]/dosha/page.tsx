import { setRequestLocale } from "next-intl/server";
import { DoshaView } from "@/components/DoshaView";

export default async function DoshaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DoshaView />;
}
