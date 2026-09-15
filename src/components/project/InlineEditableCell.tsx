import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface InlineEditableCellProps {
  value: number;
  /** Formatted display value (e.g. currency or plain number). */
  display: string;
  /** Called with the new numeric value on commit. */
  onCommit: (value: number) => void;
  /** Optional async save; shows a spinner while pending. */
  onSave?: (value: number) => Promise<void> | void;
  isSaving?: boolean;
  disabled?: boolean;
  min?: number;
  step?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Inline-editable numeric cell for estimating grids. Click to edit, Enter/blur
 * to commit, Esc to cancel. Keeps the full form for advanced fields.
 */
export function InlineEditableCell({
  value,
  display,
  onCommit,
  onSave,
  isSaving = false,
  disabled = false,
  min = 0,
  step = 0.01,
  className,
  ariaLabel,
}: InlineEditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = useCallback(() => {
    if (disabled || isSaving) return;
    setDraft(String(value));
    setEditing(true);
  }, [disabled, isSaving, value]);

  const commit = useCallback(async () => {
    const parsed = Number(draft);
    if (Number.isNaN(parsed) || parsed < min) {
      setEditing(false);
      return;
    }
    setEditing(false);
    if (parsed !== value) {
      onCommit(parsed);
      if (onSave) await onSave(parsed);
    }
  }, [draft, min, value, onCommit, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditing(false);
      }
    },
    [commit],
  );

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={min}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        className="w-24 rounded-sm border border-input bg-background px-2 py-1 text-end text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      disabled={disabled || isSaving}
      title={disabled ? undefined : "Click to edit"}
      aria-label={ariaLabel}
      className={cn(
        "rounded-sm px-1 py-0.5 text-end tabular-nums text-sm transition-colors",
        !disabled &&
          !isSaving &&
          "hover:bg-muted hover:ring-1 hover:ring-ring cursor-text",
        disabled && "cursor-default",
        className,
      )}
    >
      {isSaving ? "…" : display}
    </button>
  );
}