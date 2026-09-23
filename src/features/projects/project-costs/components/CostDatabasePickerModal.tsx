import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Database, Loader2, Search, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { PaginationControls } from "@/shared/components/PaginationControls";
import EmptyState from "@/shared/components/ui/EmptyState";
import LoadingState from "@/shared/components/ui/LoadingState";
import {
  useCostDatabases,
  useCostDatabaseItems,
  type CostDatabaseItem,
} from "@/features/cost-library";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { Decimal } from "@/shared/lib/math";
import { cn, getIconMarginClass } from "@/shared/lib/utils";

export interface CostDatabasePickerModalProps {
  projectCurrency: string;
  groups?: Array<{ id: string; name: string }>;
  onImport: (
    item: CostDatabaseItem,
    quantity: number,
    groupId?: string,
  ) => Promise<void>;
  buttonClassName?: string;
  triggerVariant?: "outline" | "default" | "secondary";
}

const PAGE_SIZE = 10;

export function CostDatabasePickerModal({
  projectCurrency,
  groups = [],
  onImport,
  buttonClassName,
  triggerVariant = "outline",
}: CostDatabasePickerModalProps) {
  const { t } = useTranslation(["project_detail", "common"]);
  const { format } = useCurrencyFormatter();
  const { convert } = useCurrencyConverter();

  const [open, setOpen] = useState(false);
  const [selectedDbId, setSelectedDbId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  // Selected item configuration state
  const [selectedItem, setSelectedItem] = useState<CostDatabaseItem | null>(
    null,
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [targetGroupId, setTargetGroupId] = useState<string>("ungrouped");
  const [keepOpen, setKeepOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Databases query
  const { databasesQuery } = useCostDatabases();
  const databases = useMemo(() => databasesQuery.data ?? [], [databasesQuery.data]);

  // Auto-select first database when available
  useEffect(() => {
    if (!selectedDbId && databases.length > 0) {
      setSelectedDbId(databases[0].id);
    }
  }, [databases, selectedDbId]);

  // Selected database metadata
  const selectedDatabase = useMemo(
    () => databases.find((db) => db.id === selectedDbId),
    [databases, selectedDbId],
  );

  const dbCurrency = selectedDatabase?.currency || "USD";

  // Items query with search filter and pagination
  const { itemsQuery } = useCostDatabaseItems(
    selectedDbId || undefined,
    page,
    PAGE_SIZE,
    searchQuery,
  );

  const items = itemsQuery.data?.data ?? [];
  const totalCount = itemsQuery.data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Converted unit price for currently selected item
  const convertedUnitPrice = useMemo(() => {
    if (!selectedItem) return 0;
    return convert(selectedItem.unit_price, dbCurrency, projectCurrency);
  }, [selectedItem, dbCurrency, projectCurrency, convert]);

  // Estimated line total
  const estimatedTotal = useMemo(() => {
    if (!selectedItem || !quantity) return 0;
    return new Decimal(convertedUnitPrice).times(quantity).toDecimalPlaces(2).toNumber();
  }, [selectedItem, quantity, convertedUnitPrice]);

  // Handle Search Input Change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(0);
  }, []);

  // Handle item selection
  const handleSelectItem = useCallback((item: CostDatabaseItem) => {
    setSelectedItem(item);
  }, []);

  // Handle Import
  const handleImport = useCallback(async () => {
    if (!selectedItem || quantity <= 0) return;
    setIsImporting(true);
    try {
      const itemToImport = {
        ...selectedItem,
        unit_price: convertedUnitPrice,
      };
      await onImport(
        itemToImport,
        quantity,
        targetGroupId === "ungrouped" ? undefined : targetGroupId,
      );
      toast.success(
        t("project_detail:cost_database_picker.successImported", {
          name: selectedItem.description,
        }),
      );

      if (!keepOpen) {
        setOpen(false);
        setSelectedItem(null);
        setQuantity(1);
      } else {
        // Reset item selection so estimator can pick another one
        setSelectedItem(null);
        setQuantity(1);
      }
    } catch (err: any) {
      toast.error(err?.message || t("common:error"));
    } finally {
      setIsImporting(false);
    }
  }, [
    selectedItem,
    quantity,
    convertedUnitPrice,
    onImport,
    targetGroupId,
    keepOpen,
    t,
  ]);

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size="sm"
        onClick={() => setOpen(true)}
        className={cn("h-11 text-sm", buttonClassName)}
        aria-label={t("project_detail:cost_database_picker.pickFromDatabase")}
      >
        <Database className={cn("w-4 h-4", getIconMarginClass())} aria-hidden="true" />
        {t("project_detail:cost_database_picker.pickFromDatabase")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Database className="w-5 h-5 text-primary" aria-hidden="true" />
              {t("project_detail:cost_database_picker.title")}
            </DialogTitle>
            <DialogDescription>
              {t("project_detail:cost_database_picker.description")}
            </DialogDescription>
          </DialogHeader>

          {/* Database Selector & Search Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 border-b">
            <div>
              <Label htmlFor="cost-db-select" className="text-xs mb-1 block">
                {t("project_detail:cost_database_picker.selectDatabase")}
              </Label>
              <Select
                value={selectedDbId}
                onValueChange={(val) => {
                  setSelectedDbId(val);
                  setPage(0);
                  setSelectedItem(null);
                }}
              >
                <SelectTrigger id="cost-db-select" className="h-10 text-sm">
                  <SelectValue
                    placeholder={t(
                      "project_detail:cost_database_picker.selectDbPlaceholder",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {databasesQuery.isLoading ? (
                    <SelectItem value="__loading" disabled className="text-sm">
                      {t("common:loading")}
                    </SelectItem>
                  ) : databases.length === 0 ? (
                    <SelectItem value="__none" disabled className="text-sm">
                      {t("project_detail:cost_database_picker.noDatabasesFound")}
                    </SelectItem>
                  ) : (
                    databases.map((db) => (
                      <SelectItem key={db.id} value={db.id} className="text-sm">
                        {db.name} ({db.currency})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cost-db-search" className="text-xs mb-1 block">
                {t("common:search")}
              </Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute start-3 top-3 text-muted-foreground pointer-events-none" />
                <Input
                  id="cost-db-search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={t(
                    "project_detail:cost_database_picker.searchPlaceholder",
                  )}
                  className="ps-9 h-10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Items Browser */}
          <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[340px] my-2 border rounded-md bg-card">
            {itemsQuery.isLoading ? (
              <LoadingState />
            ) : items.length === 0 ? (
              <EmptyState
                message={t("project_detail:cost_database_picker.noItemsFound")}
              />
            ) : (
              <div className="divide-y divide-border">
                {items.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const itemConvertedRate = convert(
                    item.unit_price,
                    dbCurrency,
                    projectCurrency,
                  );

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectItem(item);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      className={cn(
                        "p-3 text-sm cursor-pointer transition-colors flex items-center justify-between gap-3 select-none",
                        isSelected
                          ? "bg-primary/10 border-s-4 border-s-primary"
                          : "hover:bg-accent/40",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {item.csi_code && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {item.csi_code}
                            </Badge>
                          )}
                          {item.csi_division && (
                            <span className="text-xs text-muted-foreground">
                              {item.csi_division}
                            </span>
                          )}
                        </div>
                        <div className="font-medium text-foreground truncate">
                          {item.description}
                        </div>
                      </div>

                      <div className="text-end flex-shrink-0">
                        <div className="font-semibold text-foreground">
                          {format(itemConvertedRate, projectCurrency)}
                          <span className="text-xs text-muted-foreground font-normal">
                            {" "}/ {item.unit || "unit"}
                          </span>
                        </div>
                        {dbCurrency !== projectCurrency && (
                          <div className="text-xs text-muted-foreground">
                            {format(item.unit_price, dbCurrency)}
                          </div>
                        )}
                      </div>

                      <div className="w-5 flex items-center justify-center">
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="py-1 border-t">
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}

          {/* Selected Item Insertion Settings */}
          {selectedItem && (
            <div className="p-3 bg-muted/40 rounded-md border space-y-3 mt-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>{t("project_detail:cost_database_picker.itemConfig")}</span>
                <span className="font-normal normal-case text-foreground">
                  {selectedItem.description}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <Label htmlFor="picker-quantity" className="text-xs mb-1 block">
                    {t("common:quantity")} ({selectedItem.unit || "unit"})
                  </Label>
                  <Input
                    id="picker-quantity"
                    type="number"
                    step="any"
                    min="0.0001"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                    className="h-9 text-sm"
                  />
                </div>

                {groups.length > 0 && (
                  <div>
                    <Label htmlFor="picker-group" className="text-xs mb-1 block">
                      {t("project_detail:groups.assignGroup")}
                    </Label>
                    <Select
                      value={targetGroupId}
                      onValueChange={setTargetGroupId}
                    >
                      <SelectTrigger id="picker-group" className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ungrouped" className="text-sm">
                          {t("project_detail:groups.ungrouped")}
                        </SelectItem>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id} className="text-sm">
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="text-end sm:col-start-3">
                  <div className="text-xs text-muted-foreground">
                    {t("project_detail:cost_database_picker.estimatedTotal")}
                  </div>
                  <div className="text-base font-bold text-primary">
                    {format(estimatedTotal, projectCurrency)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t mt-2">
            <div className="flex items-center space-x-2 rtl:space-x-reverse self-start sm:self-center">
              <Checkbox
                id="keep-picker-open"
                checked={keepOpen}
                onCheckedChange={(c) => setKeepOpen(!!c)}
              />
              <Label
                htmlFor="keep-picker-open"
                className="text-xs font-normal cursor-pointer text-muted-foreground"
              >
                {t("project_detail:cost_database_picker.keepOpen")}
              </Label>
            </div>

            <div className="flex items-center gap-2 self-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-sm"
              >
                {t("common:cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleImport}
                disabled={!selectedItem || quantity <= 0 || isImporting}
                className="text-sm"
              >
                {isImporting ? (
                  <>
                    <Loader2
                      className={cn("w-4 h-4 animate-spin", getIconMarginClass())}
                    />
                    {t("common:importing")}
                  </>
                ) : (
                  <>
                    <Database
                      className={cn("w-4 h-4", getIconMarginClass())}
                    />
                    {t("project_detail:cost_database_picker.importItem")}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
