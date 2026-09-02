"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecord } from "@/lib/pb-mapper";
import { CostDatabase } from "@/types/cost-databases";
import CostItemsTable from "./CostItemsTable";
import LocationAdjustmentsManager from "./LocationAdjustmentsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface CostDatabaseDetailProps {
  databaseId: string;
  onBack: () => void;
}

export default function CostDatabaseDetail({
  databaseId,
  onBack,
}: CostDatabaseDetailProps) {
  const { t, i18n } = useTranslation(["resources", "common", "pages"]);

  const {
    data: database,
    isLoading,
    error,
  } = useQuery<CostDatabase>({
    queryKey: ["cost_database", databaseId],
    queryFn: async () =>
      mapRecord<CostDatabase>(
        await pb.collection("cost_databases").getOne(databaseId!),
      ),
    enabled: !!databaseId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-base">
        {t("common:error")}: {error.message}
      </div>
    );
  }

  if (!database) {
    return (
      <div className="text-center py-8 text-base text-muted-foreground">
        {t("pages:cost_databases.notFound")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={t("common:back")}
        >
          <ArrowLeft
            className={cn("w-5 h-5", i18n.dir() === "rtl" && "rotate-180")}
            aria-hidden="true"
          />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            {database.name}
          </h2>
          <p className="text-sm text-text-secondary">
            {database.description || t("common:noDescription")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="items">
            {t("pages:cost_databases.items")}
          </TabsTrigger>
          <TabsTrigger value="locations">
            {t("pages:cost_databases.locations")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="mt-4">
          <CostItemsTable database={database} onBack={onBack} />
        </TabsContent>
        <TabsContent value="locations" className="mt-4">
          <LocationAdjustmentsManager databaseId={database.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
