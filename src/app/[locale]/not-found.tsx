import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("states");
  return (
    <div className="px-5 py-24 text-center">
      <h1 className="text-4xl font-bold">{t("notFoundTitle")}</h1>
      <p className="mx-auto mt-3 max-w-md">{t("notFoundBody")}</p>
      <Button asChild className="mt-6">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </div>
  );
}
