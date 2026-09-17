import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Option } from "@/features/admin/hooks/useDropdownOptions";
import { toast } from "sonner";

interface RiskProbabilityOptionFormProps {
  category: string;
  editingItem: Option | null;
  setEditingItem: (item: Option | null) => void;
  onAdd: (
    category: string,
    value: string,
    translation: string,
    rate?: number,
    numericValue?: number,
  ) => Promise<boolean>;
  setPendingEdit: (edit: any) => void;
  isLoading: boolean;
  allOptions: Option[];
}

export function RiskProbabilityOptionForm({
  category,
  editingItem,
  setEditingItem,
  onAdd,
  setPendingEdit,
  isLoading,
  allOptions,
}: RiskProbabilityOptionFormProps) {
  const { t } = useTranslation(["common", "admin"]);
  const [input, setInput] = useState("");
  const [translationInput, setTranslationInput] = useState("");
  const [numericInput, setNumericInput] = useState("");

  const [editValue, setEditValue] = useState("");
  const [editTranslationValue, setEditTranslationValue] = useState("");
  const [editNumericValue, setEditNumericValue] = useState("");

  useEffect(() => {
    if (editingItem) {
      setEditValue(editingItem.value);
      setEditTranslationValue(editingItem.translations?.ar || "");
      setEditNumericValue(editingItem.numeric_value?.toString() || "");
    } else {
      setEditValue("");
      setEditTranslationValue("");
      setEditNumericValue("");
    }
  }, [editingItem]);

  const handleAddSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const val = input.trim();
      if (!val) {
        toast.error(t("common:cannotSetEmptyValue"));
        return;
      }
      if (allOptions.some((o) => o.value.toLowerCase() === val.toLowerCase())) {
        toast.error(t("common:duplicateEntry"));
        return;
      }

      const numericVal = parseFloat(numericInput);
      if (isNaN(numericVal)) {
        toast.error(t("admin:dropdowns.invalidNumericValue"));
        return;
      }
      const success = await onAdd(
        category,
        val,
        translationInput.trim(),
        undefined,
        numericVal,
      );
      if (success) {
        setInput("");
        setTranslationInput("");
        setNumericInput("");
      }
    },
    [input, translationInput, numericInput, allOptions, category, onAdd, t],
  );

  const handleEditClick = useCallback(
    async (o: Option) => {
      const newValue = editValue.trim();
      const newTranslation = editTranslationValue.trim();

      const numericVal = parseFloat(editNumericValue);
      if (isNaN(numericVal)) {
        toast.error(t("admin:dropdowns.invalidNumericValue"));
        return;
      }

      if (
        newValue === o.value &&
        newTranslation === (o.translations?.ar || "") &&
        numericVal === o.numeric_value
      ) {
        setEditingItem(null);
        return;
      }

      setPendingEdit({
        id: o.id,
        oldValue: o.value,
        newValue: newValue,
        oldTranslation: o.translations?.ar || "",
        newTranslation: newTranslation,
        numericValue: numericVal,
      });
    },
    [
      editValue,
      editTranslationValue,
      editNumericValue,
      setEditingItem,
      setPendingEdit,
      t,
    ],
  );

  return (
    <>
      <form
        onSubmit={handleAddSubmit}
        className="flex flex-col sm:flex-row gap-2"
      >
        <Input
          placeholder={t("common:addNewPlaceholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow text-sm"
          aria-label={t("common:addNewPlaceholder")}
          disabled={isLoading}
        />
        <Input
          placeholder={t("common:translationAr")}
          value={translationInput}
          onChange={(e) => setTranslationInput(e.target.value)}
          className="flex-grow text-sm"
          aria-label={t("common:translationAr")}
          disabled={isLoading}
        />
        <Input
          type="number"
          step="0.01"
          placeholder={t("admin:dropdowns.numericValue")}
          value={numericInput}
          onChange={(e) => setNumericInput(e.target.value)}
          className="min-w-[100px] text-sm"
          aria-label={t("admin:dropdowns.numericValue")}
          disabled={isLoading}
        />
        <Button
          type="submit"
          variant="default"
          disabled={
            isLoading || !input.trim() || isNaN(parseFloat(numericInput))
          }
          className="text-sm"
          aria-label={t("common:add")}
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </Button>
      </form>

      {editingItem && (
        <>
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-sm"
            autoFocus
            aria-label={t("admin:dropdowns.option")}
            disabled={isLoading}
          />
          <Input
            value={editTranslationValue}
            onChange={(e) => setEditTranslationValue(e.target.value)}
            className="w-full text-sm"
            aria-label={t("common:translationAr")}
            disabled={isLoading}
          />
          <Input
            type="number"
            step="0.01"
            value={editNumericValue}
            onChange={(e) => setEditNumericValue(e.target.value)}
            className="w-full text-sm"
            aria-label={t("admin:dropdowns.numericValue")}
            disabled={isLoading}
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleEditClick(editingItem)}
              className="text-sm"
              disabled={isLoading || isNaN(parseFloat(editNumericValue))}
            >
              {t("common:save")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingItem(null)}
              className="text-sm"
              disabled={isLoading}
            >
              {t("common:cancel")}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
