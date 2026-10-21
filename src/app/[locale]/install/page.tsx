import { setRequestLocale } from "next-intl/server";
import { InstallView } from "@/components/InstallView";

export default async function InstallPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <InstallView />;
}
