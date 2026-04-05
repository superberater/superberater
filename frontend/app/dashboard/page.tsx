"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { t } from "@/lib/i18n";
import {
  listDebates, listPublicDebates, publishDebate, unpublishDebate, deleteDebate,
} from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { locale } = useLocale();
  const [tab, setTab] = useState<string>("mine");
  const [myDebates, setMyDebates] = useState<any[]>([]);
  const [publicDebates, setPublicDebates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [mine, pub] = await Promise.all([
      listDebates().catch(() => ({ debates: [] })),
      listPublicDebates().catch(() => ({ debates: [] })),
    ]);
    setMyDebates(mine.debates || []);
    setPublicDebates(pub.debates || []);
  };

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [authLoading]);

  const handlePublish = async (id: string, isPublic: boolean) => {
    try {
      if (isPublic) await unpublishDebate(id); else await publishDebate(id);
      await refresh();
    } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async (id: string, topic: string) => {
    if (!confirm(`${t("dash.delete_confirm", locale)} "${topic}"?\n\n${t("dash.delete_warn", locale)}`)) return;
    try { await deleteDebate(id); await refresh(); } catch (e: any) { alert(e.message); }
  };

  const sc: Record<string, string> = {
    created: "bg-gray-100 text-gray-600", running: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700", failed: "bg-red-100 text-red-700",
  };
  const sl: Record<string, string> = {
    created: t("dash.created", locale), running: t("dash.running", locale),
    completed: t("dash.completed", locale), failed: t("dash.failed", locale),
  };
  const debates = tab === "mine" ? myDebates : publicDebates;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand">{t("dash.title", locale)}</h1>
          {user && <p className="text-gray-500 text-sm mt-1">{user.email}</p>}
        </div>
        <div className="flex gap-3">
          <a href="/debate/new" className="px-5 py-2 bg-brand text-white rounded-lg font-semibold hover:bg-brand-light">{t("nav.new_run", locale)}</a>
          {user && <button onClick={() => { signOut(); router.push("/"); }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100">{t("nav.sign_out", locale)}</button>}
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab("mine")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "mine" ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          {t("dash.my_runs", locale)} ({myDebates.length})
        </button>
        <button onClick={() => setTab("community")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "community" ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          {t("dash.community", locale)} ({publicDebates.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">{t("dash.loading", locale)}</div>
      ) : debates.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-gray-400 mb-4">{tab === "mine" ? t("dash.no_runs", locale) : t("dash.no_community", locale)}</p>
          <a href="/debate/new" className="inline-block px-8 py-3 bg-brand text-white rounded-lg font-semibold hover:bg-brand-light">{t("dash.first_run", locale)}</a>
        </div>
      ) : (
        <div className="space-y-3">
          {debates.map((d: any) => (
            <div key={d.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-brand-light hover:shadow-sm transition-all">
              <div className="flex items-start justify-between">
                <a href={`/debate/${d.id}`} className="flex-1 min-w-0">
                  <h3 className="font-semibold text-brand truncate">{d.topic}</h3>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc[d.status] || ""}`}>{sl[d.status] || d.status}</span>
                    <span>{d.num_rounds || 2} {t("dash.rounds", locale)}</span>
                    {d.total_tokens > 0 && <span>{d.total_tokens} Tokens</span>}
                    <span>{new Date(d.created_at).toLocaleDateString(locale === "de" ? "de-DE" : "en-US")}</span>
                    {d.is_public && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Community</span>}
                  </div>
                </a>
                {tab === "mine" && (
                  <div className="flex items-center gap-2 ml-4">
                    {d.status === "completed" && (
                      <button onClick={() => handlePublish(d.id, d.is_public)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${d.is_public ? "border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100" : "border-gray-300 text-gray-500 hover:bg-gray-100"}`}>
                        {d.is_public ? t("dash.published", locale) : t("dash.publish", locale)}
                      </button>
                    )}
                    {d.status !== "running" && (
                      <button onClick={() => handleDelete(d.id, d.topic)}
                        className="px-2 py-1 rounded-lg text-xs font-medium border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete">&#x1F5D1;</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
