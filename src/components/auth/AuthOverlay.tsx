"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

type AuthMode = "login" | "signup" | "forgot" | null;

const AuthOverlayContext = createContext<{
  openLogin: () => void;
  openSignup: () => void;
  openForgot: () => void;
} | null>(null);

// Thrown by design: every trigger button lives inside HomeContent, which is
// always rendered as AuthOverlay's child (see page.tsx, login/page.tsx,
// signup/page.tsx), so a missing provider means a trigger moved outside
// that tree by mistake.
export function useAuthOverlay() {
  const ctx = useContext(AuthOverlayContext);
  if (!ctx) throw new Error("useAuthOverlay must be used within AuthOverlay");
  return ctx;
}

export function AuthOverlay({
  children,
  initialMode = null,
  error,
  checkEmail,
  resetSent,
  confirmInfo,
  next,
}: {
  children: ReactNode;
  initialMode?: AuthMode;
  error?: string;
  checkEmail?: boolean;
  resetSent?: boolean;
  confirmInfo?: boolean;
  next?: string;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  // error/checkEmail/resetSent/confirmInfo only describe the redirect that
  // produced initialMode; once the user switches modes by hand those no
  // longer apply.
  const [serverError, setServerError] = useState(error);
  const [serverCheckEmail, setServerCheckEmail] = useState(checkEmail);
  const [serverResetSent, setServerResetSent] = useState(resetSent);
  const [serverConfirmInfo, setServerConfirmInfo] = useState(confirmInfo);

  function switchMode(next: AuthMode) {
    setMode(next);
    setServerError(undefined);
    setServerCheckEmail(false);
    setServerResetSent(false);
    setServerConfirmInfo(false);
  }

  useEffect(() => {
    document.body.style.overflow = mode ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mode]);

  useEffect(() => {
    if (!mode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode]);

  return (
    <AuthOverlayContext.Provider
      value={{
        openLogin: () => switchMode("login"),
        openSignup: () => switchMode("signup"),
        openForgot: () => switchMode("forgot"),
      }}
    >
      {children}
      {mode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6 backdrop-blur-sm"
          onClick={() => setMode(null)}
        >
          <div
            className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 bg-zinc-50 p-6 shadow-xl dark:border-zinc-800 dark:bg-black"
            role="dialog"
            aria-modal="true"
            aria-label={mode === "signup" ? "Sign up" : mode === "forgot" ? "Reset password" : "Log in"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <Logo />
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setMode(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-foreground">
              {mode === "signup" ? "Sign up" : mode === "forgot" ? "Reset password" : "Log in"}
            </h2>

            {mode === "signup" ? (
              <SignupForm error={serverError} checkEmail={serverCheckEmail} />
            ) : mode === "forgot" ? (
              <ForgotPasswordForm error={serverError} />
            ) : (
              <LoginForm
                error={serverError}
                resetSent={serverResetSent}
                confirmInfo={serverConfirmInfo}
                next={next}
              />
            )}

            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-medium underline"
                  >
                    Log in
                  </button>
                </>
              ) : mode === "forgot" ? (
                <>
                  Remembered it?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-medium underline"
                  >
                    Log in
                  </button>
                </>
              ) : (
                <>
                  No account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="font-medium underline"
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </AuthOverlayContext.Provider>
  );
}
