"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import EmptyState from "@/components/ui/EmptyState";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import LoadingState from "@/components/ui/LoadingState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    return <LoadingState className="h-64" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-base">{t("common:error")}</AlertTitle>
        <AlertDescription className="text-sm">{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!database) {
    return <EmptyState message={t("pages:cost_databases.notFound")} />;
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
          <Heading level={2} className="text-foreground">
            {database.name}
          </Heading>
          <p className="text-sm text-muted-foreground">
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
