import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Heading } from "@/shared/components/ui/heading";
import { useTranslation } from "react-i18next";
import { getFriendlyErrorMessage } from "@/shared/lib/error-handling";

interface ErrorDisplayProps {
  message?: string;
  error?: any;
  onRetry?: () => void;
  fullPage?: boolean;
}

const ErrorContent = ({
  displayMessage,
  onRetry,
  t,
}: {
  displayMessage: string;
  onRetry?: () => void;
  t: any;
}) => (
  <div className="flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
    <div className="bg-destructive/10 p-4 rounded-full mb-4">
      <AlertCircle className="w-8 h-8 text-destructive" />
    </div>
    <Heading level={2} className="text-foreground mb-2">
      {t("boundaryTitle")}
    </Heading>
    <p className="text-base text-muted-foreground mb-6">{displayMessage}</p>

    <div className="flex gap-3 justify-center">
      {onRetry && (
        <Button onClick={onRetry} variant="default" className="gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          {t("tryAgain")}
        </Button>
      )}
      <Button
        variant="outline"
        onClick={() => (window.location.href = "/")}
        className="gap-2 text-sm"
      >
        <Home className="w-4 h-4" />
        {t("goToHomepage")}
      </Button>
    </div>
  </div>
);

export default function ErrorDisplay({
  message,
  error,
  onRetry,
  fullPage = false,
}: ErrorDisplayProps) {
  const { t } = useTranslation("errors");

  const displayMessage =
    message || (error ? getFriendlyErrorMessage(error) : t("unknown"));

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm">
        <ErrorContent displayMessage={displayMessage} onRetry={onRetry} t={t} />
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/50 text-sm">
      <ErrorContent displayMessage={displayMessage} onRetry={onRetry} t={t} />
    </div>
  );
}
