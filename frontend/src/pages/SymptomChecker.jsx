import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// Known section headers from the backend (AI + rule-based fallback).
// Keep them in sync with SymptomCheckerService on the server.
const SECTION_KEYS = [
  "POSSIBLE CONDITIONS",
  "WHY (BASED ON YOUR HISTORY)",
  "WHY",
  "SEVERITY",
  "RECOMMENDATION",
  "HOME CARE",
  "WARNINGS",
];

const SEVERITY_TONE = {
  high: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", label: "🚨" },
  medium: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "⚠️" },
  low: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "✅" },
};

function severityTone(value) {
  const v = (value || "").toLowerCase();
  if (v.includes("high")) return SEVERITY_TONE.high;
  if (v.includes("medium")) return SEVERITY_TONE.medium;
  if (v.includes("low")) return SEVERITY_TONE.low;
  return null;
}

/**
 * Split the analysis string into [{ key, value }] sections based on the
 * known headers. Anything that doesn't match a header is appended to the
 * previous section so we never lose content.
 */
function parseAnalysis(text) {
  if (!text || typeof text !== "string") return [];
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (current) current.value += "\n";
      continue;
    }
    const match = line.match(/^([A-Z][A-Z \\(\\)\\/-]{2,40}):\s*(.*)$/);
    const headerCandidate = match ? match[1].trim() : null;
    if (headerCandidate && SECTION_KEYS.includes(headerCandidate)) {
      current = { key: headerCandidate, value: match[2] || "" };
      sections.push(current);
    } else if (current) {
      current.value += (current.value ? "\n" : "") + line;
    } else {
      current = { key: "SUMMARY", value: line };
      sections.push(current);
    }
  }
  return sections.map((s) => ({ ...s, value: s.value.trim() })).filter((s) => s.value);
}

function SymptomChecker() {
  const { session } = useAuth();
  const [symptoms, setSymptoms] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Auto-load patient profile for context display
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setProfileLoading(true);
    api
      .get(`/patients/profile/${session.userId}`)
      .then((res) => {
        if (!cancelled) setProfile(res.data);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleCheck = async (e) => {
    e.preventDefault();
    const trimmed = symptoms.trim();
    if (!trimmed) {
      setError("Please describe your symptoms before submitting.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.post("/symptoms/check", { symptoms: trimmed });
      setResult(data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to analyze symptoms. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Parse structured medical history (stored as JSON array string)
  const parsedHistory = useMemo(() => {
    const raw = profile?.medicalHistory;
    if (typeof raw !== "string") return [];
    const trimmed = raw.trim();
    if (!trimmed.startsWith("[")) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [profile]);

  const sections = useMemo(() => parseAnalysis(result?.analysis), [result]);

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

  const hasProfileData =
    !!profile &&
    (profile.age ||
      profile.gender ||
      profile.bloodGroup ||
      profile.height ||
      profile.weight ||
      profile.allergies ||
      profile.currentMedications ||
      parsedHistory.length > 0);

  return (
    <div className="shell max-w-3xl py-10 fade-up">
      <div className="mb-8">
        <p className="section-label">AI Health Assistant</p>
        <h1 className="page-title text-4xl">Symptom Checker</h1>
        <p className="mt-2 text-slate-500">
          Describe your symptoms. The AI considers your full medical history for personalized analysis.
        </p>
      </div>

      {/* Patient Context Card */}
      {profileLoading ? (
        <div className="frost-card rounded-2xl p-5 mb-6 text-sm text-slate-400">
          Loading your medical context…
        </div>
      ) : hasProfileData ? (
        <div className="frost-card rounded-2xl p-5 mb-6 fade-up stagger-1">
          <p className="text-xs font-black uppercase tracking-widest text-teal-600 mb-3">📋 Your Medical Context (auto-loaded)</p>
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            {profile.age && <div><span className="text-slate-400 text-xs">Age:</span> <strong>{profile.age}</strong></div>}
            {profile.gender && <div><span className="text-slate-400 text-xs">Gender:</span> <strong>{profile.gender}</strong></div>}
            {profile.bloodGroup && <div><span className="text-slate-400 text-xs">Blood:</span> <strong>{profile.bloodGroup}</strong></div>}
            {profile.height && <div><span className="text-slate-400 text-xs">Height:</span> <strong>{profile.height} cm</strong></div>}
            {profile.weight && <div><span className="text-slate-400 text-xs">Weight:</span> <strong>{profile.weight} kg</strong></div>}
          </div>
          {profile.allergies && (
            <p className="mt-3 text-sm"><span className="text-slate-400 text-xs">⚠️ Allergies:</span> <strong className="text-rose-600">{profile.allergies}</strong></p>
          )}
          {profile.currentMedications && (
            <p className="mt-1 text-sm"><span className="text-slate-400 text-xs">💊 Currently taking:</span> <strong>{profile.currentMedications}</strong></p>
          )}
          {parsedHistory.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-slate-400 mb-1">Known conditions:</p>
              <div className="flex flex-wrap gap-1.5">
                {parsedHistory.map((rec, idx) => (
                  <span
                    key={`${rec.diseaseName || "cond"}-${idx}`}
                    className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full"
                  >
                    {rec.diseaseName || "Condition"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="alert-info mb-6">
          <p className="text-sm font-semibold">💡 Tip: Complete your <Link to="/intake" className="font-black underline">medical profile</Link> first for personalized analysis.</p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="alert-warning mb-6 flex items-start gap-3">
        <span className="text-xl" aria-hidden="true">⚠️</span>
        <div>
          <p className="font-bold text-amber-800">Not a Medical Diagnosis</p>
          <p className="text-sm text-amber-700 mt-0.5">
            General guidance only. Always consult a qualified healthcare professional.
          </p>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleCheck} className="frost-card rounded-2xl p-8 space-y-5" noValidate>
        <div>
          <label
            htmlFor="symptom-input"
            className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block"
          >
            What are you feeling? Describe your symptoms *
          </label>
          <textarea
            id="symptom-input"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g. headache and tingling in feet since 2 days, also feeling tired..."
            className="field h-32"
            aria-describedby="symptom-help"
            aria-invalid={!!error}
          />
          <p id="symptom-help" className="mt-1 text-xs text-slate-400">
            Be specific — when it started, how it feels, what makes it worse/better.
          </p>
        </div>

        {error && (
          <div className="alert-error" role="alert">
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
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing with your medical context...
            </span>
          ) : "🔍 Analyze My Symptoms"}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div
          className="mt-8 frost-card rounded-2xl overflow-hidden fade-up"
          role="region"
          aria-live="polite"
          aria-label="Symptom analysis result"
        >
          <div className="glass-navy px-8 py-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-300">Personalized Analysis</p>
            <h2 className="text-xl font-black text-white mt-1">Health Assessment</h2>
            <p className="text-xs text-white/60 mt-1">
              {result.source === "ai" ? "🤖 AI-powered with your medical history" : "📋 Rule-based assessment"}
            </p>
          </div>
          <div className="p-8 space-y-4">
            {sections.length > 0 ? (
              sections.map((section, idx) => {
                const tone = section.key === "SEVERITY" ? severityTone(section.value) : null;
                if (tone) {
                  return (
                    <div
                      key={`${section.key}-${idx}`}
                      className={`rounded-xl border ${tone.bg} ${tone.border} px-4 py-3`}
                    >
                      <p className={`text-[10px] font-black uppercase tracking-widest ${tone.text}`}>
                        {section.key}
                      </p>
                      <p className={`text-sm font-bold mt-1 ${tone.text}`}>
                        <span aria-hidden="true">{tone.label} </span>
                        {section.value}
                      </p>
                    </div>
                  );
                }
                return (
                  <div key={`${section.key}-${idx}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {section.key}
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed mt-1 whitespace-pre-wrap">
                      {section.value}
                    </p>
                  </div>
                );
              })
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">
                {result.analysis}
              </pre>
            )}

            <div className="mt-6 p-4 rounded-xl bg-teal-50 border border-teal-100">
              <p className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-2">Recommended Action</p>
              <p className="text-sm text-teal-800 mb-3">
                Based on this assessment, book an appointment with the recommended specialist.
              </p>
              <Link to="/nearby" className="brand-btn inline-block px-5 py-2 text-xs">
                Find Nearby Doctors →
              </Link>
            </div>

            <p className="mt-4 text-xs text-slate-400 italic">
              ⚠️ Not a substitute for professional medical advice. Seek immediate care for severe symptoms.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SymptomChecker;
