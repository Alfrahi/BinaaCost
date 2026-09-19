import i18n from "@/i18n";

interface AppError {
  message?: string;
  code?: string | number;
  status?: number;
  error?: string | { message?: string };
  name?: string;
  response?: {
    code?: number;
    message?: string;
    data?: Record<string, any>;
  };
}

function isAppError(error: unknown): error is AppError {
  return typeof error === "object" && error !== null;
}

export function getFriendlyErrorMessage(error: unknown): string {
  if (!error) return i18n.t("errors:unknown");

  if (typeof error === "string") return error;

  if (isAppError(error)) {
    // 1. Check for PocketBase field-level validation errors in error.response.data
    if (error.response?.data && typeof error.response.data === "object") {
      const fieldErrors = Object.entries(error.response.data)
        .map(([field, err]: [string, any]) => {
          const detail =
            typeof err === "object" && err ? err.message || err.code : String(err);
          return detail ? `${field}: ${detail}` : field;
        })
        .filter(Boolean);
      if (fieldErrors.length > 0) {
        return fieldErrors.join("; ");
      }
    }

    // 2. Check PocketBase HTTP status codes
    if (typeof error.status === "number") {
      switch (error.status) {
        case 0:
          return i18n.t("errors:networkError");
        case 401:
        case 403:
          return i18n.t("errors:permissionDenied");
        case 404:
          return i18n.t("errors:resourceNotFound");
        case 409:
          return i18n.t("errors:uniqueViolation");
        case 400:
          if (error.response?.message) return error.response.message;
          break;
      }
    }

    if (error.error) {
      if (typeof error.error === "string") return error.error;
      if (isAppError(error.error) && error.error.message)
        return error.error.message;
    }

    if (error.code) {
      const codeStr = String(error.code);
      switch (codeStr) {
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
