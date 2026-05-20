import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "PATIENT",
    latitude: "",
    longitude: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/register", {
        ...form,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      });
      if (form.role === "PATIENT") {
        navigate("/login/patient");
      } else {
        navigate("/login/doctor-clinic");
      }
    } catch (err) {
      setMessage(err?.response?.data || "Registration failed");
    }
  };

  return (
    <div className="flex min-h-[90vh] items-center justify-center py-16 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center fade-up stagger-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Join the Network</h1>
          <p className="mt-3 text-slate-600 font-medium">Create your credentials to get started.</p>
        </div>

        <form onSubmit={handleRegister} className="frost-card mt-10 space-y-5 rounded-[2.5rem] p-10 fade-up stagger-2 shadow-2xl">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Full Name</label>
            <input
              placeholder="e.g. Dr. Alex Smith or Alex Smith"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="field mt-2"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Email Address</label>
            <input
              type="email"
              placeholder="alex@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="field mt-2"
              required
            />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Account Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="field mt-2 bg-white/50"
              >
                <option value="PATIENT">Patient</option>
                <option value="DOCTOR">Doctor</option>
                <option value="CLINIC">Clinic Owner</option>
              </select>
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
          </div>
          
          {message && (
            <div className={`rounded-xl p-3 text-sm ring-1 ${message.includes("success") ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-red-50 text-red-600 ring-red-100"}`}>
              {message}
            </div>
          )}
          
          <button className="brand-btn w-full py-4 text-sm uppercase tracking-widest font-black">
            Create Account
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 fade-up stagger-3">
          Already a member? <Link to="/login/patient" className="font-bold text-teal-600">Head to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
