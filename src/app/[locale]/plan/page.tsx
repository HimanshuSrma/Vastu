import { setRequestLocale } from "next-intl/server";
import { FloorPlan } from "@/components/FloorPlan";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FloorPlan />;
}
