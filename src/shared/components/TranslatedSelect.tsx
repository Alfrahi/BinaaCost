import React, { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/utils";

interface TranslatedSelectProps extends React.ComponentPropsWithoutRef<
  typeof Select
> {
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  autoSelectFirst?: boolean;
}

export function TranslatedSelect({
  options,
  placeholder,
  className,
  isLoading = false,
  autoSelectFirst = false,
  value,
  onValueChange,
  ...props
}: TranslatedSelectProps) {
  const { t } = useTranslation();
  const effectiveValue = value ?? (props.defaultValue as string | undefined);

  useEffect(() => {
    if (
      autoSelectFirst &&
      (!effectiveValue || effectiveValue === "") &&
      options.length > 0 &&
      onValueChange
    ) {
      onValueChange(options[0].value);
    }
  }, [autoSelectFirst, effectiveValue, options, onValueChange]);

  const selectedOption = options.find((opt) => opt.value === effectiveValue);

  return (
    <Select value={value} onValueChange={onValueChange} {...props}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder || t("common:selectOption")}>
          {selectedOption ? selectedOption.label : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <SelectItem value="loading" disabled>
            {t("common:loading")}
          </SelectItem>
        ) : (
          options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
