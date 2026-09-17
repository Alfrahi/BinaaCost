import { useState, useMemo } from "react";

export function useBulkSelection(allItemIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === allItemIds.length && allItemIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allItemIds));
    }
  };

  const clear = () => setSelectedIds(new Set());

  const allSelected = useMemo(
    () => allItemIds.length > 0 && selectedIds.size === allItemIds.length,
    [allItemIds.length, selectedIds.size],
  );

  return {
    selectedIds,
    toggle,
    toggleAll,
    clear,
    isSelected: (id: string) => selectedIds.has(id),
    allSelected,
    hasSelection: selectedIds.size > 0,
    count: selectedIds.size,
  };
}
