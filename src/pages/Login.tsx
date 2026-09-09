import { pb } from "@/integrations/pocketbase/client";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ClientResponseError } from "pocketbase";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginValues = z.infer<typeof loginSchema>;

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

type SignupValues = z.infer<typeof signupSchema>;

export default function Login() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  const [signupEnabled, setSignupEnabled] = useState(false);
  const [checkingSettings, setCheckingSettings] = useState(true);
  const [settingsError, setSettingsError] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    let mounted = true;

    const fetchAppSettings = async () => {
      if (!mounted) return;
      setCheckingSettings(true);
      setSettingsError(false);

      try {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 5000),
        );

        const result = (await Promise.race([
          pb.collection("app_settings").getFirstListItem('key="user_signup"'),
          timeout,
        ])) as any;

        if (!mounted) return;

        if (result?.value?.enabled === true) {
          setSignupEnabled(true);
        } else {
          setSignupEnabled(false);
        }
      } catch {
        if (!mounted) return;
        setSignupEnabled(false);
        setSettingsError(true);
      } finally {
        if (mounted) setCheckingSettings(false);
      }
    };

    fetchAppSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onLogin = useCallback(
    async (values: LoginValues) => {
      setSubmitError(null);
      setSubmitting(true);
      try {
        await pb
          .collection("users")
          .authWithPassword(values.email, values.password);
      } catch (err: unknown) {
        if (err instanceof ClientResponseError) {
          setSubmitError(t("invalidCredentials"));
        } else {
          setSubmitError((err as Error).message);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [t],
  );

  const onSignup = useCallback(
    async (values: SignupValues) => {
      if (values.password !== values.confirmPassword) {
        signupForm.setError("confirmPassword", {
          message: "Passwords do not match",
        });
        return;
      }
      setSubmitError(null);
      setSubmitting(true);
      try {
        await pb.collection("users").create({
          email: values.email,
          password: values.password,
          passwordConfirm: values.confirmPassword,
          role: "user",
        });
        await pb
          .collection("users")
          .authWithPassword(values.email, values.password);
      } catch (err: unknown) {
        if (err instanceof ClientResponseError) {
          setSubmitError(err.response?.message || t("invalidCredentials"));
        } else {
          setSubmitError((err as Error).message);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [signupForm, t],
  );

  if (loading || checkingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {mode === "signup"
            ? t("signUp")
            : signupEnabled
              ? t("signInRegister")
              : t("signIn")}
        </h1>

        {settingsError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-base">{t("error")}</AlertTitle>
            <AlertDescription className="text-sm">
              {t("couldNotLoadSettings")}
            </AlertDescription>
          </Alert>
        )}

        {submitError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {submitError}
            </AlertDescription>
          </Alert>
        )}

        {mode === "signin" ? (
          <form
            onSubmit={loginForm.handleSubmit(onLogin)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                {...loginForm.register("email")}
              />
              {loginForm.formState.errors.email && (
                <p className="text-red-500 text-xs">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                {...loginForm.register("password")}
              />
              {loginForm.formState.errors.password && (
                <p className="text-red-500 text-xs">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t("signingIn") : t("signInButton")}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={signupForm.handleSubmit(onSignup)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="signup-email">{t("emailLabel")}</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder={t("emailPlaceholder")}
                {...signupForm.register("email")}
              />
              {signupForm.formState.errors.email && (
                <p className="text-red-500 text-xs">
                  {signupForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">{t("passwordLabel")}</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                {...signupForm.register("password")}
              />
              {signupForm.formState.errors.password && (
                <p className="text-red-500 text-xs">
                  {signupForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm">{t("passwordLabel")}</Label>
              <Input
                id="signup-confirm"
                type="password"
                placeholder={t("passwordPlaceholder")}
                {...signupForm.register("confirmPassword")}
              />
              {signupForm.formState.errors.confirmPassword && (
                <p className="text-red-500 text-xs">
                  {signupForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t("signingUp") : t("signUpButton")}
            </Button>
          </form>
        )}

        {signupEnabled && (
          <div className="mt-4 text-center text-sm">
            {mode === "signin" ? (
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => {
                  setMode("signup");
                  setSubmitError(null);
                }}
              >
                {t("signUpLink")}
              </button>
            ) : (
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => {
                  setMode("signin");
                  setSubmitError(null);
                }}
              >
                {t("alreadyHaveAccountLink")}
              </button>
            )}
          </div>
        )}

        {!signupEnabled && !settingsError && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            {t("signupDisabled")}
          </p>
        )}
      </div>
    </div>
  );
}
