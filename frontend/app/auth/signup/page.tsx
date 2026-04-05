"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { t } from "@/lib/i18n";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { locale } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("auth.pw_mismatch", locale));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.pw_min", locale));
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">&#x2713; {t("auth.registered", locale)}</h1>
        <p className="text-gray-600 mb-6">{t("auth.check_email", locale)} ({email})</p>
        <a href="/auth/login" className="text-brand underline">{t("auth.go_login", locale)}</a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20">
      <h1 className="text-3xl font-bold text-brand mb-2">{t("auth.signup", locale)}</h1>
      <p className="text-gray-500 mb-6">{t("auth.signup_desc", locale)}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.email", locale)}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.password", locale)}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none" required minLength={6} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.confirm_pw", locale)}</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none" required />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-brand text-white rounded-lg font-semibold hover:bg-brand-light disabled:opacity-50 transition-colors">
          {loading ? t("auth.registering", locale) : t("auth.signup", locale)}
        </button>
      </form>

      <p className="text-sm text-gray-500 mt-4 text-center">
        {t("auth.have_account", locale)}{" "}
        <a href="/auth/login" className="text-brand underline">{t("auth.login", locale)}</a>
      </p>
    </div>
  );
}
