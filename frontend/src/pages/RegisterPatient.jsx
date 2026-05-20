import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function RegisterPatient() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", phoneNumber: "", email: "", password: "", role: "PATIENT" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      setMessage("success");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.response?.data || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 fade-up">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-400 shadow-xl shadow-teal-200">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="page-title text-4xl">Create Account</h1>
          <p className="mt-2 text-slate-500">Join DocNest — no email required to start</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="frost-card rounded-[2rem] p-8 space-y-5 fade-up stagger-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Full Name *</label>
            <input
              placeholder="Your full name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="field"
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Phone Number *</label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              className="field"
              required
              autoComplete="tel"
            />
            <p className="mt-1.5 text-xs text-slate-400">Used for login and appointment notifications</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email Address</label>
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-500 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                Optional
              </span>
            </div>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="field"
              autoComplete="email"
            />
            <p className="mt-1.5 text-xs text-slate-400">You can add this later from your Profile</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="field pr-12"
                required
                autoComplete="new-password"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* Message */}
          {message === "success" ? (
            <div className="alert-success flex items-center gap-3">
              <svg className="h-5 w-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-bold text-emerald-800">Registration successful!</p>
                <p className="text-xs text-emerald-700">Redirecting to login...</p>
              </div>
            </div>
          ) : message ? (
            <div className="alert-error">
              <p className="font-bold text-sm">{message}</p>
            </div>
          ) : null}

          <button
            disabled={loading}
            className="brand-btn w-full py-4 text-sm font-bold tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Creating your account...
              </span>
            ) : "Create Account →"}
          </button>

          {/* Info */}
          <div className="alert-info text-xs">
            <p className="font-semibold">🔒 Your privacy is our priority</p>
            <p className="mt-1 text-teal-600">Medical history is never shared without your active appointment booking. Clinics only see your name and phone number.</p>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-teal-600 hover:text-teal-700">
            Sign in with phone →
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-slate-400">
          Are you a clinic?{" "}
          <Link to="/apply/clinic" className="font-semibold text-slate-600 hover:text-slate-800">
            Apply for clinic partnership
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPatient;
