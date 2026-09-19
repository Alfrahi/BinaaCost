

import { type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";
import { Textarea } from "@/shared/components/ui/textarea";

interface FormFieldRowProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "email" | "password";
  step?: string;
  min?: string | number;
  className?: string;
  selectOptions?: { value: string; label: string }[];
  isLoadingSelect?: boolean;
  selectPlaceholder?: string;
  textarea?: boolean;
  textareaRows?: number;
}

export function FormFieldRow<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = "text",
  step,
  min,
  className,
  selectOptions,
  isLoadingSelect,
  selectPlaceholder,
  textarea = false,
  textareaRows = 3,
}: FormFieldRowProps<T>) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem className={className}>
        <FormLabel className="text-sm">{label}</FormLabel>
        <FormControl>
          {selectOptions ? (
            <TranslatedSelect
              value={field.value}
              onValueChange={field.onChange}
              options={selectOptions}
              isLoading={isLoadingSelect}
              placeholder={selectPlaceholder}
              className="text-sm"
            />
          ) : textarea ? (
            <Textarea
              {...field}
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder={placeholder}
              rows={textareaRows}
              className="text-sm"
            />
          ) : (
            <Input
              {...field}
              type={type}
              step={step}
              min={min}
              placeholder={placeholder}
              className="text-sm"
            />
          )}
        </FormControl>
        <FormMessage className="text-sm" />
      </FormItem>
    )} />
  );
}