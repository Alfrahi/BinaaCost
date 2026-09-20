import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useTranslation } from "react-i18next";
import { useCompanyFinancialDefaults } from "@/features/settings/hooks/useCompanyFinancialDefaults";
import { useSettingsOptions } from "@/shared/hooks/useSettingsOptions";

const POPULAR_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "SAR",
  "AED",
  "QAR",
  "KWD",
  "CAD",
  "AUD",
  "JPY",
];

export default function CompanyFinancialDefaultsSection() {
  const { t } = useTranslation(["admin", "common", "project_detail"]);
  const { defaults, updateDefaults, isLoading } = useCompanyFinancialDefaults();
  const { options: currencyOptions } = useSettingsOptions("currency");

  const [overhead, setOverhead] = useState<number>(defaults.overhead_percent);
  const [markup, setMarkup] = useState<number>(defaults.markup_percent);
  const [contingency, setContingency] = useState<number>(defaults.contingency_percent);
  const [tax, setTax] = useState<number>(defaults.tax_percent);
  const [currency, setCurrency] = useState<string>(defaults.default_currency);

  useEffect(() => {
    if (defaults) {
      setOverhead(defaults.overhead_percent ?? 10);
      setMarkup(defaults.markup_percent ?? 20);
      setContingency(defaults.contingency_percent ?? 5);
      setTax(defaults.tax_percent ?? 0);
      setCurrency(defaults.default_currency || "USD");
    }
  }, [defaults]);

  const availableCurrencies =
    currencyOptions.length > 0
      ? Array.from(new Set([...currencyOptions.map((o) => o.value), ...POPULAR_CURRENCIES]))
      : POPULAR_CURRENCIES;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    updateDefaults.mutate({
      overhead_percent: Number(overhead) || 0,
      markup_percent: Number(markup) || 0,
      contingency_percent: Number(contingency) || 0,
      tax_percent: Number(tax) || 0,
      default_currency: currency || "USD",
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="default_currency" className="text-sm">
            {t("admin:appSettings.defaultCurrency")}
          </Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="default_currency" className="text-sm">
              <SelectValue placeholder={t("admin:appSettings.selectCurrency")}>
                {currency}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableCurrencies.map((c) => (
                <SelectItem key={c} value={c} className="text-sm font-mono">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("admin:appSettings.defaultCurrencyHelp")}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="default_overhead" className="text-sm">
            {t("admin:appSettings.defaultOverhead")} (%)
          </Label>
          <Input
            id="default_overhead"
            type="number"
            min={0}
            max={100}
            step="any"
            value={overhead}
            onChange={(e) => setOverhead(parseFloat(e.target.value) || 0)}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t("admin:appSettings.defaultOverheadHelp")}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="default_markup" className="text-sm">
            {t("admin:appSettings.defaultMarkup")} (%)
          </Label>
          <Input
            id="default_markup"
            type="number"
            min={0}
            max={100}
            step="any"
            value={markup}
            onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t("admin:appSettings.defaultMarkupHelp")}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="default_contingency" className="text-sm">
            {t("admin:appSettings.defaultContingency")} (%)
          </Label>
          <Input
            id="default_contingency"
            type="number"
            min={0}
            max={100}
            step="any"
            value={contingency}
            onChange={(e) => setContingency(parseFloat(e.target.value) || 0)}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t("admin:appSettings.defaultContingencyHelp")}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="default_tax" className="text-sm">
            {t("admin:appSettings.defaultTax")} (%)
          </Label>
          <Input
            id="default_tax"
            type="number"
            min={0}
            max={100}
            step="any"
            value={tax}
            onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t("admin:appSettings.defaultTaxHelp")}
          </p>
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={updateDefaults.isPending || isLoading}
          className="text-sm"
        >
          {updateDefaults.isPending ? t("common:saving") : t("common:save")}
        </Button>
      </div>
    </form>
  );
}
