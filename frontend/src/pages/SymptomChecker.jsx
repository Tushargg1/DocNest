import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function SymptomChecker() {
  const { session } = useAuth();
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!symptoms.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.post("/symptoms/check", { symptoms, age, gender });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to analyze symptoms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="shell max-w-2xl py-20 text-center fade-up">
        <div className="text-5xl mb-4">🤖</div>
        <h1 className="page-title text-3xl">Symptom Checker</h1>
        <p className="mt-2 text-slate-500">Please log in to use the AI symptom checker.</p>
        <Link to="/login" className="brand-btn inline-block mt-6 px-8 py-3">Sign In →</Link>
      </div>
    );
  }

  return (
    <div className="shell max-w-3xl py-10 fade-up">
      <div className="mb-8">
        <p className="section-label">AI Health Assistant</p>
        <h1 className="page-title text-4xl">Symptom Checker</h1>
        <p className="mt-2 text-slate-500">
          Describe your symptoms and get instant guidance on what specialist to visit.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="alert-warning mb-6 flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div>
          <p className="font-bold text-amber-800">Not a Medical Diagnosis</p>
          <p className="text-sm text-amber-700 mt-0.5">
            This tool provides general guidance only. Always consult a qualified healthcare professional for proper diagnosis and treatment.
          </p>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleCheck} className="frost-card rounded-2xl p-8 space-y-5">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">
            Describe your symptoms *
          </label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g. I have a headache and fever since 2 days, with body aches and mild cough..."
            className="field h-32"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 30"
              className="field"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="field">
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="alert-error">
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !symptoms.trim()}
          className="brand-btn w-full py-4 text-sm font-bold disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing symptoms...
            </span>
          ) : "🔍 Check Symptoms"}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="mt-8 frost-card rounded-2xl overflow-hidden fade-up">
          <div className="glass-navy px-8 py-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-300">Analysis Result</p>
            <h2 className="text-xl font-black text-white mt-1">Health Assessment</h2>
          </div>
          <div className="p-8">
            <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">
              {result.analysis}
            </pre>

            <div className="mt-6 p-4 rounded-xl bg-teal-50 border border-teal-100">
              <p className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-2">Next Steps</p>
              <p className="text-sm text-teal-800">
                Based on this assessment, we recommend booking an appointment with a specialist.
              </p>
              <Link to="/nearby" className="brand-btn inline-block mt-3 px-5 py-2 text-xs">
                Find Nearby Doctors →
              </Link>
            </div>

            <p className="mt-4 text-xs text-slate-400 italic">
              Source: {result.source === "ai" ? "AI-powered analysis" : "Rule-based assessment"} • Not a substitute for professional medical advice
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SymptomChecker;
