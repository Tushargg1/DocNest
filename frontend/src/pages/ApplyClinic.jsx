import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function ApplyClinic() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phoneNumber: "", role: "CLINIC" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      setMessage("Account created! Now login to complete your clinic profile and apply for approval.");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.response?.data || "Application submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center fade-up">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Clinic Partnership</h1>
          <p className="mt-3 text-slate-600">Apply to join the DocNest healthcare network.</p>
        </div>

        <form onSubmit={handleSubmit} className="frost-card mt-10 space-y-5 rounded-xl p-10 fade-up ">
          <input
            placeholder="Clinic Owner Full Name / Admin Name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="field"
            required
          />
          <input
            placeholder="Official Contact Number"
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            className="field"
            required
          />
          <input
            type="email"
            placeholder="Clinical Email Address (Optional)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="field"
          />
          <input
            type="password"
            placeholder="Create Secure Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="field"
            required
          />

          {message && (
            <div className={`rounded-xl p-3 text-sm font-bold ${message.includes("success") || message.includes("created") ? "bg-cyan-50 text-cyan-700" : "bg-rose-50 text-rose-700"}`}>
              {message}
            </div>
          )}

          <button disabled={loading} className="brand-btn w-full py-4 text-sm font-black uppercase tracking-widest transition-all">
            {loading ? "Registering..." : "Start Application"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          Already have an application in progress? <Link to="/login" className="font-bold text-teal-600">Sign In to Workspace</Link>
        </p>
      </div>
    </div>
  );
}

export default ApplyClinic;

