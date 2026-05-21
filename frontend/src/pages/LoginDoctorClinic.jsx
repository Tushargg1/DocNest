import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function LoginDoctorClinic() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/login", form);
      if (!["DOCTOR", "CLINIC", "ADMIN"].includes(data.role)) {
        setError("Use patient login for patient accounts.");
        return;
      }
      login(data);
      if (data.role === "ADMIN") {
        navigate("/admin");
      } else if (data.role === "DOCTOR") {
        navigate("/doctor/workspace");
      } else if (data.role === "CLINIC") {
        navigate("/clinic/workspace");
      } else {
        navigate("/nearby");
      }
    } catch (err) {
      setError(err?.response?.data || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12 px-4 shadow-sm">
      <div className="w-full max-w-md">
        <div className="text-center fade-up stagger-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Partner Access</h1>
          <p className="mt-3 text-slate-600 font-medium">Manage your clinic or professional practice.</p>
        </div>

        <form onSubmit={handleSubmit} className="frost-card mt-10 space-y-5 rounded-xl p-10 fade-up stagger-2 ">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Email or Phone</label>
            <input
              type="text"
              placeholder="e.g. clinic@careplus.in or 9100000003"
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
            Login Workspace
          </button>
        </form>

        {/* ── DEV ONLY: quick-login buttons ── */}
        <div className="mt-8 fade-up stagger-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5">
          <p className="mb-3 text-center text-[11px] font-black uppercase tracking-widest text-amber-600">
            🛠 Dev Quick Login
          </p>
          <div className="space-y-2">
            {[
              { label: "Doctor",       email: "doctor@test.com"  },
              { label: "Clinic Admin", email: "clinic@test.com"  },
              { label: "Admin",        email: "admin@test.com"   },
            ].map(({ label, email }) => (
              <button
                key={email}
                type="button"
                onClick={() => setForm({ identifier: email, password: "password123" })}
                className="w-full rounded-xl border border-amber-200 bg-white py-2.5 text-sm font-bold text-slate-700 hover:bg-amber-100 transition"
              >
                {label} — {email}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500 fade-up stagger-3">
          Need to join the network? <Link to="/register" className="font-bold text-teal-600">Register your clinic</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginDoctorClinic;

