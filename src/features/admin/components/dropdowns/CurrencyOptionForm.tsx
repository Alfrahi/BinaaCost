import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Option } from "@/features/admin/hooks/useDropdownOptions";
import { WORLD_CURRENCIES } from "@/shared/lib/world-currencies";
import { toast } from "sonner";

interface CurrencyOptionFormProps {
  category: string;
  editingItem: Option | null;
  setEditingItem: (item: Option | null) => void;
  onAdd: (
    category: string,
    value: string,
    translation: string,
    rate?: number,
  ) => Promise<boolean>;
  setPendingEdit: (edit: any) => void;
  isLoading: boolean;
  allOptions: Option[];
}

export function CurrencyOptionForm({
  category,
  editingItem,
  setEditingItem,
  onAdd,
  setPendingEdit,
  isLoading,
  allOptions,
}: CurrencyOptionFormProps) {
  const { t } = useTranslation(["common", "admin"]);
  const [input, setInput] = useState("");
  const [translationInput, setTranslationInput] = useState("");
  const [rateInput, setRateInput] = useState("");
  const [currencySearch, setCurrencySearch] = useState("");

  const [editValue, setEditValue] = useState("");
  const [editTranslationValue, setEditTranslationValue] = useState("");
  const [editRateValue, setEditRateValue] = useState("");

  useEffect(() => {
    if (editingItem) {
      setEditValue(editingItem.value);
      setEditTranslationValue(editingItem.translations?.ar || "");
      setEditRateValue(editingItem.rate?.toString() || "");
    } else {
      setEditValue("");
      setEditTranslationValue("");
      setEditRateValue("");
    }
  }, [editingItem]);

  const filteredCurrencies = useMemo(() => {
    const s = currencySearch.trim().toLowerCase();
    return WORLD_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(s) || c.name.toLowerCase().includes(s),
    );
  }, [currencySearch]);

  const handleAddSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      let val = input.trim();
      if (!val) {
        toast.error(t("common:cannotSetEmptyValue"));
        return;
      }
      if (allOptions.some((o) => o.value.toLowerCase() === val.toLowerCase())) {
        toast.error(t("common:duplicateEntry"));
        return;
      }

      const found = WORLD_CURRENCIES.find(
        (c) =>
          c.code.toLowerCase() === val.toLowerCase() ||
          (c.code + " - " + c.name).toLowerCase() === val.toLowerCase(),
      );
      if (found) val = found.code;

      const rate = parseFloat(rateInput);
      if (isNaN(rate)) {
        toast.error(t("admin:dropdowns.invalidRate"));
        return;
      }
      const success = await onAdd(category, val, translationInput.trim(), rate);
      if (success) {
        setInput("");
        setTranslationInput("");
        setRateInput("");
        setCurrencySearch("");
      }
    },
    [input, translationInput, rateInput, allOptions, category, onAdd, t],
  );

  const handleEditClick = useCallback(
    async (o: Option) => {
      let newValue = editValue.trim();
      const newTranslation = editTranslationValue.trim();

      const found = WORLD_CURRENCIES.find(
        (c) =>
          c.code.toLowerCase() === newValue.toLowerCase() ||
          (c.code + " - " + c.name).toLowerCase() === newValue.toLowerCase(),
      );
      if (found) newValue = found.code;

      const rate = parseFloat(editRateValue);
      if (isNaN(rate)) {
        toast.error(t("admin:dropdowns.invalidRate"));
        return;
      }

      if (
        newValue === o.value &&
        newTranslation === (o.translations?.ar || "") &&
        rate === o.rate
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
        rate,
      });
    },
    [
      editValue,
      editTranslationValue,
      editRateValue,
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
        <div className="relative flex-grow min-w-[140px]">
          <Input
            placeholder={t("common:searchOrSelectCurrency")}
            value={currencySearch}
            onChange={(e) => {
              setCurrencySearch(e.target.value);
              setInput(e.target.value);
            }}
            list="currency-list"
            autoComplete="off"
            className="text-sm"
            aria-label={t("common:searchOrSelectCurrency")}
            disabled={isLoading}
          />
          <datalist id="currency-list">
            {filteredCurrencies.map((c) => (
              <option key={c.code} value={`${c.code} - ${c.name}`} />
            ))}
          </datalist>
        </div>
        <Input
          placeholder={t("common:translationAr")}
          value={translationInput}
          onChange={(e) => setTranslationInput(e.target.value)}
          className="min-w-[140px] text-sm"
          aria-label={t("common:translationAr")}
          disabled={isLoading}
        />
        <Input
          type="number"
          step="0.0001"
          placeholder={t("common:rateToUSD")}
          value={rateInput}
          onChange={(e) => setRateInput(e.target.value)}
          className="min-w-[100px] text-sm"
          aria-label={t("common:exchangeRate")}
          disabled={isLoading}
        />
        <Button
          type="submit"
          variant="default"
          disabled={isLoading || !input.trim() || isNaN(parseFloat(rateInput))}
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
            step="0.0001"
            value={editRateValue}
            onChange={(e) => setEditRateValue(e.target.value)}
            className="w-full text-sm"
            aria-label={t("common:exchangeRate")}
            disabled={isLoading}
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleEditClick(editingItem)}
              className="text-sm"
              disabled={isLoading || isNaN(parseFloat(editRateValue))}
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
