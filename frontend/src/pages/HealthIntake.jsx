import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function HealthIntake() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [progress, setProgress] = useState(null);
  const [started, setStarted] = useState(false);
  const [summary, setSummary] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]); // chat history

  // For multi-select
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [otherText, setOtherText] = useState("");
  // For text/number input
  const [textAnswer, setTextAnswer] = useState("");

  const startIntake = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/intake/start");
      handleResponse(data);
      setStarted(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to start. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = (data) => {
    if (data.status === "review") {
      setSummary(data.summary);
      setAiSummary(data.aiSummary || null);
      setCurrentQuestion(null);
    } else {
      setCurrentQuestion(data);
      setProgress(data.progress);
      setSelectedOptions([]);
      setOtherText("");
      setTextAnswer("");
    }
  };

  const submitAnswer = async (value) => {
    // Add to history
    setHistory(prev => [...prev, {
      question: currentQuestion.question,
      answer: Array.isArray(value) ? value.join(", ") : String(value),
      phase: currentQuestion.phase,
    }]);

    setLoading(true);
    try {
      const { data } = await api.post("/intake/answer", {
        questionId: currentQuestion.id,
        value: value,
      });
      handleResponse(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit answer.");
    } finally {
      setLoading(false);
    }
  };

  const handleMcqSelect = (option) => {
    submitAnswer(option);
  };

  const handleMultiSelectSubmit = () => {
    let final_val = [...selectedOptions];
    if (otherText.trim()) {
      final_val.push(otherText.trim());
    }
    if (final_val.length === 0) final_val = ["None"];
    submitAnswer(final_val);
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textAnswer.trim()) return;
    submitAnswer(textAnswer.trim());
  };

  const handleNumberSubmit = (e) => {
    e.preventDefault();
    if (!textAnswer.trim()) return;
    submitAnswer(textAnswer.trim());
  };

  const completeIntake = async () => {
    setSaving(true);
    try {
      await api.post("/intake/complete");
      navigate("/profile");
    } catch (err) {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!session || session.role !== "PATIENT") {
    return (
      <div className="shell max-w-2xl py-20 text-center fade-up">
        <div className="text-5xl mb-4">🏥</div>
        <h1 className="page-title text-3xl">Medical Profile Builder</h1>
        <p className="mt-2 text-slate-500">Please log in as a patient to use this feature.</p>
      </div>
    );
  }

  // ==================== NOT STARTED ====================
  if (!started) {
    return (
      <div className="shell max-w-2xl py-12 fade-up">
        <div className="frost-card rounded-xl p-10 text-center">
          <div className="text-6xl mb-6">🩺</div>
          <h1 className="page-title text-3xl">Build Your Medical Profile</h1>
          <p className="mt-4 text-slate-500 leading-relaxed max-w-md mx-auto">
            Answer a few simple questions about your health. This helps doctors treat you better
            and saves time during appointments.
          </p>

          <div className="mt-8 grid gap-3 text-left max-w-sm mx-auto">
            {[
              { icon: "⏱️", text: "Takes about 2-3 minutes" },
              { icon: "🔒", text: "Your data is private & secure" },
              { icon: "🩺", text: "Shared with doctors only during appointments" },
              { icon: "📱", text: "Simple questions with examples" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <span className="text-xl">{item.icon}</span>
                <p className="text-sm font-medium text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>

          <button
            onClick={startIntake}
            disabled={loading}
            className="brand-btn mt-8 px-10 py-4 text-sm font-bold"
          >
            {loading ? "Starting..." : "Let's Begin →"}
          </button>
        </div>
      </div>
    );
  }

  // ==================== REVIEW SUMMARY ====================
  if (summary) {
    return (
      <div className="shell max-w-2xl py-10 fade-up">
        <div className="frost-card rounded-xl p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-2xl font-black text-slate-900">Review Your Medical Profile</h2>
            <p className="text-sm text-slate-500 mt-1">Please check if everything looks correct before saving.</p>
          </div>

          {/* AI Summary */}
          {aiSummary && (
            <div className="mb-6 p-5 rounded-2xl bg-teal-50 border border-teal-200">
              <p className="text-xs font-black uppercase tracking-widest text-teal-600 mb-2">🤖 AI Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
            </div>
          )}

          {/* Structured Summary */}
          <div className="space-y-3">
            {Object.entries(summary).map(([key, value]) => {
              if (value === null || value === "Not provided" || value === "Not answered") return null;
              if (key === "medicalHistory" || key === "detailedAnswers") return null; // handled separately

              const labels = {
                age: "Age", gender: "Gender", height: "Height", weight: "Weight",
                bloodGroup: "Blood Group", conditions: "Conditions",
                allergies: "Allergies", medications: "Current Medications",
                smoking: "Tobacco Use", alcohol: "Alcohol",
                emergencyContact: "Emergency Contact", lifestyle: "Lifestyle"
              };
              return (
                <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest min-w-[120px] pt-0.5">
                    {labels[key] || key}
                  </span>
                  <span className="text-sm font-medium text-slate-800 flex-1">
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Medical History Table */}
          {summary.medicalHistory && summary.medicalHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 mb-3">
                📋 Medical History Records
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-teal-600 text-white">
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Disease</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Started</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Medicine</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Duration</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Recovered</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Hospital</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Doctor</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Last Visit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.medicalHistory.map((record, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-bold text-teal-700">{record.diseaseName || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{record.startedWhen || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{record.medicineName || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{record.medicationDuration || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{record.recoveredWhen || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{record.hospital || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{record.doctorName || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{record.visitDate || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && <div className="alert-error mt-4"><p className="text-sm font-bold">{error}</p></div>}

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => { setSummary(null); setStarted(false); setHistory([]); }}
              className="btn-ghost flex-1 py-3 text-sm"
            >
              Start Over
            </button>
            <button
              onClick={completeIntake}
              disabled={saving}
              className="brand-btn flex-1 py-3 text-sm font-bold"
            >
              {saving ? "Saving..." : "✓ Confirm & Save Profile"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== ACTIVE QUESTION ====================
  return (
    <div className="shell max-w-2xl py-10 fade-up">
      {/* Progress Bar */}
      {progress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-teal-600">{currentQuestion?.phase}</span>
            <span className="text-xs font-bold text-slate-400">
              Question {progress.current} of {progress.total}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Chat History (last 3) */}
      {history.length > 0 && (
        <div className="mb-4 space-y-2">
          {history.slice(-3).map((h, i) => (
            <div key={i} className="flex gap-3 items-start opacity-60">
              <span className="text-xs bg-slate-100 rounded-lg px-2 py-1 font-bold text-slate-400 shrink-0">Q</span>
              <div className="text-xs text-slate-500">
                <span className="font-medium">{h.question}</span>
                <span className="ml-2 font-bold text-teal-600">→ {h.answer}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current Question Card */}
      {currentQuestion && (
        <div className="frost-card rounded-xl p-8 fade-up">
          <h2 className="text-xl font-black text-slate-900 mb-2">
            {currentQuestion.question}
          </h2>
          {currentQuestion.hint && (
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              💡 {currentQuestion.hint}
            </p>
          )}

          {/* MCQ Type */}
          {currentQuestion.type === "mcq" && (
            <div className="grid gap-2">
              {(currentQuestion.options || []).map((option) => (
                <button
                  key={option}
                  onClick={() => handleMcqSelect(option)}
                  disabled={loading}
                  className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-teal-400 hover:bg-teal-50 transition-all font-medium text-slate-700 disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
              {/* NA option if not already in options */}
              {!(currentQuestion.options || []).some(o => o.includes("don't know") || o.includes("NA") || o.includes("None") || o.includes("Never")) && (
                <button
                  onClick={() => handleMcqSelect("I don't know / NA")}
                  disabled={loading}
                  className="w-full text-left p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all font-medium text-slate-400 disabled:opacity-50"
                >
                  I don't know / Not applicable
                </button>
              )}
            </div>
          )}

          {/* Multi-Select Type */}
          {currentQuestion.type === "multi-select" && (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {(currentQuestion.options || []).map((option) => {
                  const isSelected = selectedOptions.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedOptions(prev => prev.filter(o => o !== option));
                        } else {
                          // If selecting "None", clear others
                          if (option.includes("None")) {
                            setSelectedOptions([option]);
                          } else {
                            setSelectedOptions(prev => prev.filter(o => !o.includes("None")).concat(option));
                          }
                        }
                      }}
                      className={`text-left p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        isSelected
                          ? "border-teal-500 bg-teal-50 text-teal-800"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="mr-2">{isSelected ? "✓" : "○"}</span>
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Other option text input */}
              {currentQuestion.allowOther && (
                <div>
                  <input
                    type="text"
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    placeholder={currentQuestion.otherPlaceholder || "Type other..."}
                    className="field"
                  />
                </div>
              )}

              <button
                onClick={handleMultiSelectSubmit}
                disabled={loading || (selectedOptions.length === 0 && !otherText.trim())}
                className="brand-btn w-full py-3 text-sm font-bold disabled:opacity-50"
              >
                {loading ? "Saving..." : "Continue →"}
              </button>
              <button
                type="button"
                onClick={() => submitAnswer(["I don't know / NA"])}
                disabled={loading}
                className="btn-ghost w-full py-2 text-sm disabled:opacity-50"
              >
                Skip (don't know / not applicable)
              </button>
            </div>
          )}

          {/* Text Type */}
          {currentQuestion.type === "text" && (
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder={currentQuestion.placeholder || "Type your answer..."}
                className="field h-28"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => submitAnswer("I don't know / NA")}
                  disabled={loading}
                  className="btn-ghost flex-1 py-3 text-sm disabled:opacity-50"
                >
                  Skip (don't know)
                </button>
                <button
                  type="submit"
                  disabled={loading || !textAnswer.trim()}
                  className="brand-btn flex-1 py-3 text-sm font-bold disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Continue →"}
                </button>
              </div>
            </form>
          )}

          {/* Number Type */}
          {currentQuestion.type === "number" && (
            <form onSubmit={handleNumberSubmit} className="space-y-4">
              <input
                type="number"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder={currentQuestion.placeholder || "Enter a number"}
                className="field text-2xl font-bold text-center"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => submitAnswer("I don't know / NA")}
                  disabled={loading}
                  className="btn-ghost flex-1 py-3 text-sm disabled:opacity-50"
                >
                  Skip (don't know)
                </button>
                <button
                  type="submit"
                  disabled={loading || !textAnswer.trim()}
                  className="brand-btn flex-1 py-3 text-sm font-bold disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Continue →"}
                </button>
              </div>
            </form>
          )}

          {error && <div className="alert-error mt-4"><p className="text-sm font-bold">{error}</p></div>}
        </div>
      )}
    </div>
  );
}

export default HealthIntake;


