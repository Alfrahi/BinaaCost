import i18n from "@/i18n";

interface AppError {
  message?: string;
  code?: string;
  error?: string | { message?: string };
  name?: string;
}

function isAppError(error: unknown): error is AppError {
  return typeof error === "object" && error !== null;
}

export function getFriendlyErrorMessage(error: unknown): string {
  if (!error) return i18n.t("errors:unknown");

  if (typeof error === "string") return error;

  if (isAppError(error)) {
    if (error.error) {
      if (typeof error.error === "string") return error.error;
      if (isAppError(error.error) && error.error.message)
        return error.error.message;
    }

    if (error.code) {
      switch (error.code) {
        case "23505":
          return i18n.t("errors:uniqueViolation");
        case "23503":
          return i18n.t("errors:foreignKeyViolation");
        case "42501":
          return i18n.t("errors:permissionDenied");
        case "PGRST116":
          return i18n.t("errors:resourceNotFound");
        case "23502":
          return i18n.t("errors:missingRequiredField");
      }
    }

    if (
      error.message === "Failed to fetch" ||
      error.message?.includes("NetworkError") ||
      (error.name === "TypeError" && error.message?.includes("fetch"))
    ) {
      return i18n.t("errors:networkError");
    }

    if (error.message?.toLowerCase().includes("timeout")) {
      return i18n.t("errors:timeout");
    }

    return error.message ?? i18n.t("errors:unknown");
  }

  return i18n.t("errors:unknown");
}
