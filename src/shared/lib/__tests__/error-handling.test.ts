import { describe, it, expect } from "vitest";
import { getFriendlyErrorMessage } from "../error-handling";

describe("getFriendlyErrorMessage (ERR-001)", () => {
  it("formats PocketBase field-level validation errors from error.response.data", () => {
    const pbError = {
      status: 400,
      response: {
        code: 400,
        message: "Failed to create record.",
        data: {
          email: { code: "validation_invalid_email", message: "Must be a valid email" },
          daily_rate: { code: "validation_min_value", message: "Must be greater than 0" },
        },
      },
    };

    const msg = getFriendlyErrorMessage(pbError);
    expect(msg).toBe("email: Must be a valid email; daily_rate: Must be greater than 0");
  });

  it("handles PocketBase HTTP 409 unique conflict", () => {
    const err = { status: 409 };
    expect(getFriendlyErrorMessage(err)).toBe("uniqueViolation");
  });

  it("handles PocketBase HTTP 404 resource not found", () => {
    const err = { status: 404 };
    expect(getFriendlyErrorMessage(err)).toBe("resourceNotFound");
  });

  it("handles PocketBase HTTP 401/403 permission denied", () => {
    expect(getFriendlyErrorMessage({ status: 401 })).toBe("permissionDenied");
    expect(getFriendlyErrorMessage({ status: 403 })).toBe("permissionDenied");
  });

  it("handles PocketBase status 0 network error", () => {
    expect(getFriendlyErrorMessage({ status: 0 })).toBe("networkError");
  });

  it("handles response.message when data has no field errors", () => {
    const err = {
      status: 400,
      response: {
        code: 400,
        message: "Custom validation failure from PB rule",
        data: {},
      },
    };
    expect(getFriendlyErrorMessage(err)).toBe("Custom validation failure from PB rule");
  });
});
