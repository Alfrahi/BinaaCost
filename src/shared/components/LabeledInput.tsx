"use client";

import { cn } from "@/shared/lib/utils";
import { type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";

interface LabeledInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "email" | "password";
  step?: string;
  min?: string | number;
  className?: string;
  inputClassName?: string;
}

export function LabeledInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = "text",
  step,
  min,
  className,
  inputClassName,
}: LabeledInputProps<T>) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem className={className}>
        <FormLabel className="text-sm">{label}</FormLabel>
        <FormControl>
          <Input
            {...field}
            type={type}
            step={step}
            min={min}
            placeholder={placeholder}
            className={cn("text-sm", inputClassName)}
          />
        </FormControl>
        <FormMessage className="text-sm" />
      </FormItem>
    )} />
  );
}