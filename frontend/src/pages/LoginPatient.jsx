import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function LoginPatient() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      if (data.role !== "PATIENT") {
        setError("Use doctor/clinic login for this account type.");
        return;
      }
      login(data);
      navigate("/nearby");
    } catch (err) {
      setError(err?.response?.data || "Login failed");
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12 px-4 shadow-sm">
      <div className="w-full max-w-md">
        <div className="text-center fade-up stagger-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Welcome Back</h1>
          <p className="mt-3 text-slate-600 font-medium">Access your personal healthcare dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="frost-card mt-10 space-y-5 rounded-xl p-10 fade-up stagger-2 ">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Email or Phone</label>
            <input
              type="text"
              placeholder="e.g. patient@test.com or 9100000001"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              className="field mt-2"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="field mt-2"
              required
            />
          </div>
          
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-100">
              {error}
            </div>
          )}
          
          <button className="brand-btn w-full py-4 text-sm uppercase tracking-widest font-black">
            Sign In
          </button>
        </form>

        {/* ── DEV ONLY: quick-login buttons ── */}
        <div className="mt-8 fade-up stagger-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5">
          <p className="mb-3 text-center text-[11px] font-black uppercase tracking-widest text-amber-600">
            🛠 Dev Quick Login
          </p>
          <button
            type="button"
            onClick={() => setForm({ identifier: "patient@test.com", password: "password123" })}
            className="w-full rounded-xl border border-amber-200 bg-white py-2.5 text-sm font-bold text-slate-700 hover:bg-amber-100 transition"
          >
            Patient — patient@test.com
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500 fade-up stagger-3">
          New to DocNest? <Link to="/register" className="font-bold text-teal-600 hover:text-teal-700 transition">Create your account</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPatient;

