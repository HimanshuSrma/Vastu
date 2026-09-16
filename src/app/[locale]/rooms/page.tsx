import { setRequestLocale } from "next-intl/server";
import { RoomsView } from "@/components/RoomsView";

export default async function RoomsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RoomsView />;
}
