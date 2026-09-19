import React from "react";
import EmptyState from "@/shared/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { TFunction } from "i18next";
import { CategoryKey, AnyItem, compareItems, getDisplayLabel } from "../utils/versionDiff";
import { ConflictDiffRow } from "./ConflictDiffRow";
import { ResolutionMap } from "./VersionConflictResolver";

interface ConflictCategorySectionProps {
  category: CategoryKey;
  currentItems: AnyItem[];
  versionItems: AnyItem[];
  selectedResolution: ResolutionMap;
  onToggleResolution: (
    item: AnyItem,
    type: CategoryKey,
    action: "add" | "remove" | "update" | "keep_current" | "ignore",
  ) => void;
  formatCurrency: any;
  currentCurrency: string;
  versionCurrency: string;
  t: TFunction;
  allOptions: any;
}

export const ConflictCategorySection = React.memo(({
  category,
  currentItems,
  versionItems,
  selectedResolution,
  onToggleResolution,
  formatCurrency,
  currentCurrency,
  versionCurrency,
  t,
  allOptions,
}: ConflictCategorySectionProps) => {
  const { onlyInCurrent, onlyInVersion, modifiedInBoth } = compareItems(
    currentItems,
    versionItems,
    category,
  );

  const allItems = [
    ...onlyInVersion.map((item) => ({
      item,
      status: "version_only" as const,
      versionItem: item,
    })),
    ...modifiedInBoth.map(({ current, version }) => ({
      item: current,
      versionItem: version,
      status: "modified" as const,
    })),
    ...onlyInCurrent.map((item) => ({
      item,
      status: "current_only" as const,
      versionItem: undefined,
    })),
  ].sort((a, b) =>
    getDisplayLabel(a.item, category, t).localeCompare(
      getDisplayLabel(b.item, category, t),
    ),
  );

  return (
    <div className="space-y-4">
      {allItems.length === 0 ? (
        <EmptyState message={t("project_versions:noChangesInCategory")} />
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("project_versions:currentProject")}
                </TableHead>
                <TableHead className="w-1/4 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("project_versions:currentDetails")}
                </TableHead>
                <TableHead className="w-1/4 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("project_versions:changeType")}
                </TableHead>
                <TableHead className="w-1/4 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("project_versions:versionDetails")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.map(({ item, versionItem, status }) => (
                <ConflictDiffRow
                  key={item.id}
                  item={item}
                  type={category}
                  status={status}
                  versionItem={versionItem}
                  selectedResolution={selectedResolution}
                  onToggleResolution={onToggleResolution}
                  formatCurrency={formatCurrency}
                  currentCurrency={currentCurrency}
                  versionCurrency={versionCurrency}
                  t={t}
                  allOptions={allOptions}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
});
