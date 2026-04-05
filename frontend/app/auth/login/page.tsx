"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { locale } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <h1 className="text-3xl font-bold text-brand mb-2">{t("auth.login", locale)}</h1>
      <p className="text-gray-500 mb-6">{t("auth.login_desc", locale)}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.email", locale)}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.password", locale)}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none" required />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-brand text-white rounded-lg font-semibold hover:bg-brand-light disabled:opacity-50 transition-colors">
          {loading ? t("auth.signing_in", locale) : t("auth.sign_in", locale)}
        </button>
      </form>

      <p className="text-sm text-gray-500 mt-4 text-center">
        {t("auth.no_account", locale)}{" "}
        <a href="/auth/signup" className="text-brand underline">{t("auth.register", locale)}</a>
      </p>
    </div>
  );
}
