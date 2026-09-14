import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Edit2, ArrowRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import DataTable, {
  DataTableColumn,
} from "@/components/ui/data-table";
import { useDropdownSettingsUI } from "@/hooks/useDropdownSettingsManager";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { GenericOptionForm } from "./admin/dropdowns/GenericOptionForm";
import { CurrencyOptionForm } from "./admin/dropdowns/CurrencyOptionForm";
import { RiskProbabilityOptionForm } from "./admin/dropdowns/RiskProbabilityOptionForm";

export default function SettingsSection({
  category,
  label,
  description,
  isAdmin,
}: {
  category: string;
  label: string;
  description: string;
  isAdmin: boolean;
}) {
  const { t } = useTranslation(["common", "admin"]);

  const {
    options,
    isLoading,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedOptions,
    editingItem,
    setEditingItem,
    deleteTarget,
    setDeleteTarget,
    pendingEdit,
    setPendingEdit,
    isCurrency,
    isRiskProbability,
    handleAddOption,
    handleDeleteOption,
    handleConfirmEdit,
    getDisplayValue,
  } = useDropdownSettingsUI(category);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setCurrentPage(0);
    },
    [setSearch, setCurrentPage],
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setCurrentPage(0);
  }, [setSearch, setCurrentPage]);

  const columns = useMemo<DataTableColumn<any>[]>(() => {
    const cols: DataTableColumn<any>[] = [
      { key: "value", label: t("admin:dropdowns.option") },
      { key: "translations", label: t("common:translationAr") },
    ];
    if (isCurrency) {
      cols.push({ key: "rate", label: t("common:exchangeRateUSD") });
    }
    if (isRiskProbability) {
      cols.push({
        key: "numeric_value",
        label: t("admin:dropdowns.numericValue"),
      });
    }
    if (isAdmin) {
      cols.push({ key: "actions", label: t("common:actions"), align: "end" });
    }
    return cols;
  }, [t, isCurrency, isRiskProbability, isAdmin]);

  return (
    <Card className="p-4 mb-6 text-sm">
      <div className="mb-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="font-semibold text-lg">{label}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <div className="flex items-center w-full">
            <Input
              placeholder={t("common:searchPlaceholder")}
              value={search}
              onChange={handleSearchChange}
              className="w-full text-sm"
              aria-label={t("common:searchPlaceholder")}
            />
            {(search || currentPage > 0) && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="px-3 -ml-8 text-sm"
                aria-label={t("common:clearFilters")}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
          </div>
          {isAdmin && (
            <div className="w-full">
              {isCurrency ? (
                <CurrencyOptionForm
                  category={category}
                  editingItem={null}
                  setEditingItem={setEditingItem}
                  onAdd={handleAddOption}
                  setPendingEdit={setPendingEdit}
                  isLoading={isLoading}
                  allOptions={options}
                />
              ) : isRiskProbability ? (
                <RiskProbabilityOptionForm
                  category={category}
                  editingItem={null}
                  setEditingItem={setEditingItem}
                  onAdd={handleAddOption}
                  setPendingEdit={setPendingEdit}
                  isLoading={isLoading}
                  allOptions={options}
                />
              ) : (
                <GenericOptionForm
                  category={category}
                  editingItem={null}
                  setEditingItem={setEditingItem}
                  onAdd={handleAddOption}
                  setPendingEdit={setPendingEdit}
                  isLoading={isLoading}
                />
              )}
            </div>
          )}
        </div>
      </div>
      <DataTable
        columns={columns}
        data={paginatedOptions}
        getRowKey={(o) => o.id}
        renderRow={(o) => (
          <TableRow key={o.id}>
            {editingItem?.id === o.id ? (
              <>
                <TableCell className="px-3 py-2 text-start text-sm">
                  {isCurrency ? (
                    <CurrencyOptionForm
                      category={category}
                      editingItem={o}
                      setEditingItem={setEditingItem}
                      onAdd={handleAddOption}
                      setPendingEdit={setPendingEdit}
                      isLoading={isLoading}
                      allOptions={options}
                    />
                  ) : isRiskProbability ? (
                    <RiskProbabilityOptionForm
                      category={category}
                      editingItem={o}
                      setEditingItem={setEditingItem}
                      onAdd={handleAddOption}
                      setPendingEdit={setPendingEdit}
                      isLoading={isLoading}
                      allOptions={options}
                    />
                  ) : (
                    <GenericOptionForm
                      category={category}
                      editingItem={o}
                      setEditingItem={setEditingItem}
                      onAdd={handleAddOption}
                      setPendingEdit={setPendingEdit}
                      isLoading={isLoading}
                    />
                  )}
                </TableCell>
                <TableCell className="px-3 py-2 text-start text-sm"></TableCell>
                {(isCurrency || isRiskProbability) && (
                  <TableCell className="px-3 py-2 text-start text-sm"></TableCell>
                )}
                {isAdmin && (
                  <TableCell className="px-3 py-2 text-end flex gap-2 justify-end"></TableCell>
                )}
              </>
            ) : (
              <>
                <TableCell className="px-3 py-2 text-start text-sm text-foreground">
                  {getDisplayValue(o)}
                </TableCell>
                <TableCell className="px-3 py-2 text-start text-sm text-muted-foreground">
                  {o.translations?.ar || ""}
                </TableCell>
                {isCurrency && (
                  <TableCell className="px-3 py-2 text-start text-sm text-muted-foreground">
                    {o.rate ? o.rate.toFixed(4) : "-"}
                  </TableCell>
                )}
                {isRiskProbability && (
                  <TableCell className="px-3 py-2 text-start text-sm text-muted-foreground">
                    {o.numeric_value !== undefined
                      ? o.numeric_value.toFixed(2)
                      : "-"}
                  </TableCell>
                )}
                {isAdmin && (
                  <TableCell className="px-3 py-2 text-end flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingItem(o)}
                      aria-label={`${t("common:edit")} ${o.value}`}
                      className="h-7 w-7"
                    >
                      <Edit2 className="w-3 h-3" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(o)}
                      aria-label={`${t("common:delete")} ${o.value}`}
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                    </Button>
                  </TableCell>
                )}
              </>
            )}
          </TableRow>
        )}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
        isLoading={isLoading}
        emptyMessage={t("admin:dropdowns.noOptionsFound")}
        ariaLabel={label}
      />

      <Dialog open={!!pendingEdit} onOpenChange={() => setPendingEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {t("admin:dropdowns.confirmChange")}
            </DialogTitle>
            <p className="text-base text-muted-foreground pt-2">
              {t("admin:dropdowns.confirmChangeMessage")}
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-destructive/10 p-3 rounded border border-destructive/20">
                <div className="font-semibold text-destructive mb-1">
                  {t("admin:dropdowns.oldValue")}
                </div>
                <div>{pendingEdit?.oldValue}</div>
                {pendingEdit?.oldTranslation && (
                  <div className="text-muted-foreground text-xs mt-1">
                    {pendingEdit.oldTranslation}
                  </div>
                )}
                {isCurrency && pendingEdit?.rate !== undefined && (
                  <div className="text-muted-foreground text-xs mt-1">
                    {t("common:exchangeRate")}: {pendingEdit.rate.toFixed(4)}
                  </div>
                )}
                {isRiskProbability &&
                  pendingEdit?.numericValue !== undefined && (
                    <div className="text-muted-foreground text-xs mt-1">
                      {t("admin:dropdowns.numericValue")}:{" "}
                      {pendingEdit.numericValue.toFixed(2)}
                    </div>
                  )}
              </div>

              <div className="flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <ArrowRight
                  className="w-4 h-4 text-muted-foreground rtl:rotate-180"
                  aria-hidden="true"
                />
              </div>

              <div className="bg-muted p-3 rounded border border-border">
                <div className="font-semibold text-foreground mb-1">
                  {t("admin:dropdowns.newValue")}
                </div>
                <div>{pendingEdit?.newValue}</div>
                {pendingEdit?.newTranslation && (
                  <div className="text-muted-foreground text-xs mt-1">
                    {pendingEdit.newTranslation}
                  </div>
                )}
                {isCurrency && pendingEdit?.rate !== undefined && (
                  <div className="text-muted-foreground text-xs mt-1">
                    {t("common:exchangeRate")}: {pendingEdit.rate.toFixed(4)}
                  </div>
                )}
                {isRiskProbability &&
                  pendingEdit?.numericValue !== undefined && (
                    <div className="text-muted-foreground text-xs mt-1">
                      {t("admin:dropdowns.numericValue")}:{" "}
                      {pendingEdit.numericValue.toFixed(2)}
                    </div>
                  )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingEdit(null)}
              className="text-sm"
            >
              {t("common:cancel")}
            </Button>
            <Button onClick={handleConfirmEdit} className="text-sm">
              {t("admin:dropdowns.confirmChange")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDeleteOption(deleteTarget.id)}
        itemName={deleteTarget?.value}
        loading={isLoading}
      />
    </Card>
  );
}
