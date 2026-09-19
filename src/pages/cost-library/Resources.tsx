

import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import PageHeader from "@/shared/components/PageHeader";
import LibraryMaterialsManager from "@/features/cost-library/components/resources/LibraryMaterialsManager";
import LibraryLaborManager from "@/features/cost-library/components/resources/LibraryLaborManager";
import LibraryEquipmentManager from "@/features/cost-library/components/resources/LibraryEquipmentManager";
import LibraryAssembliesManager from "@/features/cost-library/components/resources/LibraryAssembliesManager";
import { Package, Hammer, HardHat, Wrench } from "lucide-react";
import { useIsMobile } from "@/shared/hooks/useMobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

export default function Resources() {
  const { t } = useTranslation(["resources", "common"]);
  const [activeTab, setActiveTab] = useState("materials");
  const isMobile = useIsMobile();

  const tabItems = useMemo(
    () => [
      { value: "materials", labelKey: "resources:materials", icon: Hammer },
      { value: "labor", labelKey: "resources:labor", icon: HardHat },
      { value: "equipment", labelKey: "resources:equipment", icon: Wrench },
      {
        value: "assemblies",
        labelKey: "resources:assemblies.title",
        icon: Package,
      },
    ],
    [],
  );

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title={t("resources:title")} />

      <Tabs
        defaultValue="materials"
        value={activeTab}
        onValueChange={handleTabChange}
      >
        {isMobile ? (
          <Select value={activeTab} onValueChange={handleTabChange}>
            <SelectTrigger className="w-full text-sm mb-4">
              <SelectValue placeholder={t("resources:selectCategory")} />
            </SelectTrigger>
            <SelectContent>
              {tabItems.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="text-sm"
                >
                  {t(item.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <TabsList className="w-full justify-start">
              {tabItems.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <item.icon className="w-4 h-4" />
                  {t(item.labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
        )}

        <TabsContent value="materials" className="mt-4">
          <LibraryMaterialsManager />
        </TabsContent>

        <TabsContent value="labor" className="mt-4">
          <LibraryLaborManager />
        </TabsContent>

        <TabsContent value="equipment" className="mt-4">
          <LibraryEquipmentManager />
        </TabsContent>

        <TabsContent value="assemblies" className="mt-4">
          <LibraryAssembliesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
