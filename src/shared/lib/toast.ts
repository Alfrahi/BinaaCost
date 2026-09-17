import { toast } from "sonner";
import { getFriendlyErrorMessage } from "./error-handling";

export const handleError = (error: unknown) => {
  const message = getFriendlyErrorMessage(error);
  toast.error(message);

  if (process.env.NODE_ENV === "development") {
    console.error("Development Error Details:", error);
  } else {
    console.error("Production Error:", message);
  }
};
