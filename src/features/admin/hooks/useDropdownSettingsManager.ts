import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useDropdownOptions, Option } from "./useDropdownOptions";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

export function useDropdownSettingsUI(category: string) {
  const { t } = useTranslation(["common", "admin"]);

  const {
    options: allOptions,
    isLoading: isLoadingOptions,
    error: optionsError,
    isCurrency,
    isRiskProbability,
    addOption,
    updateOption,
    deleteOption,
    isAddingOption,
    isUpdatingOption,
    isDeletingOption,
    getDisplayValue,
  } = useDropdownOptions(category);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [editingItem, setEditingItem] = useState<Option | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Option | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{
    id: string;
    oldValue: string;
    newValue: string;
    oldTranslation: string;
    newTranslation: string;
    rate?: number;
    numericValue?: number;
  } | null>(null);

  const filteredOptions = useMemo(() => {
    const s = search.trim().toLowerCase();
    return allOptions
      .filter(
        (o) =>
          o.value.toLowerCase().includes(s) ||
          o.translations?.ar?.toLowerCase().includes(s),
      )
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [allOptions, search]);

  const paginatedOptions = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredOptions.slice(start, start + pageSize);
  }, [filteredOptions, currentPage, pageSize]);

  const totalPages = useMemo(
    () => Math.ceil(filteredOptions.length / pageSize),
    [filteredOptions, pageSize],
  );

  const handleAddOption = useCallback(
    async (
      category: string,
      value: string,
      translation: string,
      rate?: number,
      numericValue?: number,
    ) => {
      if (!value.trim()) {
        toast.error(t("common:cannotSetEmptyValue"));
        return false;
      }
      if (
        allOptions.some((o) => o.value.toLowerCase() === value.toLowerCase())
      ) {
        toast.error(t("common:duplicateEntry"));
        return false;
      }
      try {
        await addOption({ category, value, translation, rate, numericValue });
        return true;
      } catch {
        return false;
      }
    },
    [addOption, allOptions, t],
  );

  const handleEditOption = useCallback(
    async (
      id: string,
      category: string,
      oldValue: string,
      newValue: string,
      newTranslation: string,
      rate?: number,
      numericValue?: number,
    ) => {
      if (!newValue.trim()) {
        toast.error(t("common:cannotSetEmptyValue"));
        return false;
      }
      if (
        allOptions.some(
          (o) =>
            o.value.toLowerCase() === newValue.toLowerCase() && o.id !== id,
        )
      ) {
        toast.error(t("common:duplicateEntry"));
        return false;
      }
      try {
        await updateOption({
          id,
          category,
          oldValue,
          newValue,
          newTranslation,
          rate,
          numericValue,
        });
        return true;
      } catch {
        return false;
      }
    },
    [updateOption, allOptions, t],
  );

  const handleDeleteOption = useCallback(
    async (id: string) => {
      const option = allOptions.find((o) => o.id === id);
      if (!option) return false;
      try {
        await deleteOption({
          id,
          category: option.category,
          value: option.value,
        });
        return true;
      } catch {
        return false;
      }
    },
    [deleteOption, allOptions],
  );

  const handleConfirmEdit = useCallback(async () => {
    if (!pendingEdit) return;

    const success = await handleEditOption(
      pendingEdit.id,
      category,
      pendingEdit.oldValue,
      pendingEdit.newValue,
      pendingEdit.newTranslation,
      pendingEdit.rate,
      pendingEdit.numericValue,
    );

    if (success) {
      setEditingItem(null);
      setPendingEdit(null);
    }
  }, [pendingEdit, handleEditOption, category]);

  return {
    options: allOptions,
    isLoading:
      isLoadingOptions ||
      isAddingOption ||
      isUpdatingOption ||
      isDeletingOption,
    error: optionsError,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
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
    handleEditOption,
    handleDeleteOption,
    handleConfirmEdit,
    getDisplayValue,
    PAGE_SIZE_OPTIONS,
  };
}
