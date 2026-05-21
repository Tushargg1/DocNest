import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      login(data);

      if (data.role === "ADMIN") navigate("/admin");
      else if (data.role === "CLINIC") navigate("/clinic/workspace");
      else if (data.role === "DOCTOR") navigate("/doctor/workspace");
      else navigate("/nearby"); // PATIENT goes to find clinics
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data || t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 fade-up">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-teal-600">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="page-title text-4xl">{t("auth.welcomeBack")}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t("auth.signInSubtitle")}</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="frost-card rounded-xl p-8 space-y-5 fade-up stagger-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
              {t("auth.phoneNumber")}
            </label>
            <input
              type="text"
              placeholder={t("auth.phonePlaceholder")}
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              className="field"
              required
              autoComplete="username"
            />
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
              {t("auth.phoneHint")}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
              {t("auth.password")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="field pr-12"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert-error">
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <button
            disabled={loading}
            className="brand-btn w-full py-4 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                {t("auth.signingIn")}
              </span>
            ) : t("auth.signInBtn")}
          </button>

          <div className="flex flex-col gap-2 pt-1">
            <Link to="/register" className="text-center text-sm text-teal-600 dark:text-teal-400 font-semibold hover:text-teal-700 dark:hover:text-teal-300 transition-colors">
              {t("auth.noAccount")} →
            </Link>
            <Link to="/apply/clinic" className="text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              {t("auth.applyClinic")}
            </Link>
          </div>

          {/* DEV ONLY: quick-login */}
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-4">
            <p className="mb-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {t("auth.devLogin")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t("roles.patient"),  id: "9100000001" },
                { label: "Dr. Priya",         id: "9100000010" },
                { label: "Dr. Arjun",         id: "9100000011" },
                { label: t("roles.clinic"),   id: "9100000003" },
                { label: t("roles.admin"),    id: "9100000000" },
              ].map(({ label, id }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setForm({ identifier: id, password: "password123" })}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition"
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">{t("auth.fillsForm")}</p>
          </div>
        </form>

        {/* Role info */}
        <div className="mt-6 frost-card rounded-2xl p-5 fade-up stagger-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">{t("auth.whoCanLogin")}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { role: t("roles.patient"), desc: t("roles.patientDesc") },
              { role: t("roles.clinic"), desc: t("roles.clinicDesc") },
              { role: t("roles.doctor"), desc: t("roles.doctorDesc") },
              { role: t("roles.admin"), desc: t("roles.adminDesc") },
            ].map((r) => (
              <div key={r.role} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{r.role}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
