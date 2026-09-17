import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Option } from "@/features/admin/hooks/useDropdownOptions";

interface GenericOptionFormProps {
  category: string;
  editingItem: Option | null;
  setEditingItem: (item: Option | null) => void;
  onAdd: (
    category: string,
    value: string,
    translation: string,
  ) => Promise<boolean>;
  setPendingEdit: (edit: any) => void;
  isLoading: boolean;
}

export function GenericOptionForm({
  category,
  editingItem,
  setEditingItem,
  onAdd,
  setPendingEdit,
  isLoading,
}: GenericOptionFormProps) {
  const { t } = useTranslation(["common", "admin"]);
  const [input, setInput] = useState("");
  const [translationInput, setTranslationInput] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editTranslationValue, setEditTranslationValue] = useState("");

  useEffect(() => {
    if (editingItem) {
      setEditValue(editingItem.value);
      setEditTranslationValue(editingItem.translations?.ar || "");
    } else {
      setEditValue("");
      setEditTranslationValue("");
    }
  }, [editingItem]);

  const handleAddSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const success = await onAdd(
        category,
        input.trim(),
        translationInput.trim(),
      );
      if (success) {
        setInput("");
        setTranslationInput("");
      }
    },
    [input, translationInput, category, onAdd],
  );

  const handleEditClick = useCallback(
    async (o: Option) => {
      const newValue = editValue.trim();
      const newTranslation = editTranslationValue.trim();

      if (
        newValue === o.value &&
        newTranslation === (o.translations?.ar || "")
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
      });
    },
    [editValue, editTranslationValue, setEditingItem, setPendingEdit],
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
        <Button
          type="submit"
          variant="default"
          disabled={isLoading || !input.trim()}
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
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleEditClick(editingItem)}
              className="text-sm"
              disabled={isLoading}
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
