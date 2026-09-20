import { pb } from "@/integrations/pocketbase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { AlertCircle, Globe } from "lucide-react";
import LoadingState from "@/shared/components/ui/LoadingState";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Heading } from "@/shared/components/ui/heading";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientResponseError } from "pocketbase";
import { loginSchema, signupSchema, type LoginValues, type SignupValues } from "@/features/auth/types/auth";

export default function Login() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["auth", "common"]);

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
          message: "auth:confirmPasswordMismatch",
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

  const toggleLanguage = () => {
    const isEn = i18n.language?.toLowerCase().startsWith("en");
    i18n.changeLanguage(isEn ? "ar" : "en");
  };

  if (loading || checkingSettings) {
    return <LoadingState className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow p-8">
        <div className="flex justify-end mb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="text-xs font-medium"
            aria-label={t("common:switchLanguage")}
          >
            <Globe className="h-3.5 w-3.5 me-1.5" />
            {i18n.language?.toLowerCase().startsWith("en")
              ? t("common:languageNameAr")
              : t("common:languageNameEn")}
          </Button>
        </div>

        <Heading level={1} className="mb-4 text-center">
          {mode === "signup"
            ? t("signUp")
            : signupEnabled
              ? t("signInRegister")
              : t("signIn")}
        </Heading>

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
          <Form {...loginForm}>
            <form
              onSubmit={loginForm.handleSubmit(onLogin)}
              className="space-y-4"
            >
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t("emailLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t("emailPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t("passwordLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        id="password"
                        type="password"
                        placeholder={t("passwordPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t("signingIn") : t("signInButton")}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...signupForm}>
            <form
              onSubmit={signupForm.handleSubmit(onSignup)}
              className="space-y-4"
            >
              <FormField
                control={signupForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t("emailLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder={t("emailPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={signupForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t("passwordLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder={t("passwordPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={signupForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t("confirmPasswordLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder={t("confirmPasswordPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t("signingUp") : t("signUpButton")}
              </Button>
            </form>
          </Form>
        )}

        {signupEnabled && (
          <div className="mt-4 text-center text-sm">
            {mode === "signin" ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => {
                  setMode("signup");
                  setSubmitError(null);
                }}
              >
                {t("signUpLink")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => {
                  setMode("signin");
                  setSubmitError(null);
                }}
              >
                {t("alreadyHaveAccountLink")}
              </Button>
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
