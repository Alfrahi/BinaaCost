import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/utils";

export default function PageLoader({ className }: { className?: string }) {
  const { t } = useTranslation("common");
  return (
    <div
      className={cn(
        "w-full h-screen flex flex-col items-center justify-center bg-background text-foreground",
        className,
      )}
    >
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
      <p className="text-lg">{t("loading")}</p>
    </div>
  );
}
