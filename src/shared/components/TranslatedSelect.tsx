import React from "react";
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
}

export function TranslatedSelect({
  options,
  placeholder,
  className,
  isLoading = false,
  ...props
}: TranslatedSelectProps) {
  const { t } = useTranslation();

  return (
    <Select {...props}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder || t("common:selectOption")} />
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
