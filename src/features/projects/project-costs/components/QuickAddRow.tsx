import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { cn, getIconMarginClass } from "@/shared/lib/utils";

export interface QuickAddField {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  placeholder?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  className?: string;
  conditional?: (values: Record<string, string>) => boolean;
  formatLabel?: (values: Record<string, string>) => string;
}

interface QuickAddRowProps {
  fields: QuickAddField[];
  schema: z.ZodType;
  buildValues: (raw: Record<string, string>) => unknown;
  onSubmit: (values: unknown) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel: string;
  ariaLabel: string;
  className?: string;
}

/**
 * Persistent rapid line-item entry row. Enter submits, Esc clears and
 * refocuses the first field. Validation runs through the provided Zod schema
 * so totals stay decimal-exact and consistent with the full forms.
 */
export function QuickAddRow({
  fields,
  schema,
  buildValues,
  onSubmit,
  isSubmitting = false,
  submitLabel,
  ariaLabel,
  className,
}: QuickAddRowProps) {
  const { t } = useTranslation([
    "common",
    "project_materials",
    "project_labor",
    "project_equipment",
    "project_additional",
  ]);

  const getInitialValue = useCallback((f: QuickAddField) => {
    return f.defaultValue ?? (f.type === "select" && f.options?.length ? f.options[0].value : "");
  }, []);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, getInitialValue(f)])),
  );
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // When options load asynchronously, ensure select fields have an initial value
  useEffect(() => {
    fields.forEach((f) => {
      if (f.type === "select" && f.options && f.options.length > 0) {
        setValues((prev) => {
          if (!prev[f.key]) {
            return { ...prev, [f.key]: f.defaultValue || f.options![0].value };
          }
          return prev;
        });
      }
    });
  }, [fields]);

  const setField = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setValues(
      Object.fromEntries(fields.map((f) => [f.key, getInitialValue(f)])),
    );
    setError(null);
    firstInputRef.current?.focus();
  }, [fields, getInitialValue]);

  const handleSubmit = useCallback(async () => {
    const parsed = schema.safeParse(buildValues(values));
    if (!parsed.success) {
      const rawMessage = parsed.error.issues[0]?.message;
      const translated = rawMessage ? t(rawMessage) : t("common:error");
      setError(translated);
      return;
    }
    try {
      await onSubmit(parsed.data);
      reset();
    } catch {
      // Errors are surfaced by the caller (toast); keep the row intact.
    }
  }, [schema, buildValues, values, onSubmit, reset, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        reset();
      }
    },
    [handleSubmit, reset],
  );

  return (
    <div className={cn("border rounded-lg p-3 bg-muted/50", className)}>
      <div className="flex flex-wrap items-end gap-2">
        {fields
          .filter((field) => !field.conditional || field.conditional(values))
          .map((field, idx) => {
            const label = field.formatLabel ? field.formatLabel(values) : field.label;
            return (
              <div key={field.key} className="flex-1 min-w-[120px] space-y-1">
                <label
                  htmlFor={field.key}
                  className="text-xs font-medium text-muted-foreground"
                >
                  {label}
                </label>
            {field.type === "select" ? (
              <select
                id={field.key}
                name={field.key}
                value={values[field.key] ?? ""}
                onChange={(e) => setField(field.key, e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label={field.label}
                className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                ref={idx === 0 ? firstInputRef : undefined}
                id={field.key}
                name={field.key}
                type={field.type === "number" ? "number" : "text"}
                value={values[field.key] ?? ""}
                onChange={(e) => setField(field.key, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={field.placeholder}
                aria-label={label}
                className="h-11 text-sm"
                min={field.type === "number" ? "0" : undefined}
                step={field.type === "number" ? "0.01" : undefined}
              />
            )}
          </div>
            );
          })}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="h-11 px-4 text-sm"
          aria-label={ariaLabel}
        >
          <Plus className={cn("w-4 h-4", getIconMarginClass())} aria-hidden="true" />
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={reset}
          className="h-11 w-11"
          aria-label={t("common:cancel")}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}