import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "auth:emailRequired").email("auth:emailInvalid"),
  password: z.string().min(1, "auth:passwordRequired"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  email: z.string().min(1, "auth:emailRequired").email("auth:emailInvalid"),
  password: z.string().min(8, "auth:passwordMin"),
  confirmPassword: z.string().min(8, "auth:passwordMin"),
});

export type SignupValues = z.infer<typeof signupSchema>;

export interface UserRole {
  role: string;
}
