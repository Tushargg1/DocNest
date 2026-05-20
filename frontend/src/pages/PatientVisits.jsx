import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function PatientVisits() {
  const { session } = useAuth();
  const [visits, setVisits] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ show: false, apptId: null, doctorName: "", attended: null, rating: 5, comment: "" });
  const [reviewMsg, setReviewMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!session) return;
      try {
        const [visitsRes, apptRes] = await Promise.allSettled([
          api.get(`/visits/patient/${session.userId}`),
          api.get(`/appointments/patient/${session.userId}`),
        ]);
        if (visitsRes.status === "fulfilled") setVisits(visitsRes.value.data || []);
        if (apptRes.status === "fulfilled") setAppointments(apptRes.value.data || []);
      } catch (err) {
        setError("Unable to load records.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session]);

  // Check for revisit reminders (visits where doctor set a revisitDate = tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const revisitReminders = visits.filter(
    (v) => v.revisitDate && String(v.revisitDate).slice(0, 10) === tomorrowStr
  );

  // Active token (booked appointments today)
  const today = new Date().toISOString().slice(0, 10);
  const activeTokens = appointments.filter(
    (a) => a.status === "BOOKED" && a.startTime?.slice(0, 10) === today
  );

  // Completed appointments where patient hasn't submitted review yet
  const completedWithoutReview = appointments.filter(
    (a) => a.status === "COMPLETED" && !a.reviewed
  );

  // Upcoming appointments (future ones, including today but beyond activeTokens if needed, actually let's just group BOOKED ones)
  const upcomingAppointments = appointments.filter(
    (a) => a.status === "BOOKED" && a.startTime?.slice(0, 10) !== today
  );

  const submitReview = async (e) => {
    e.preventDefault();
    setReviewMsg("");
    try {
      // Submit attendance + review
      await api.post(`/appointments/${reviewForm.apptId}/review`, {
        attended: reviewForm.attended,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      setReviewMsg("Thank you for your feedback!");
      setReviewForm({ show: false, apptId: null, doctorName: "", attended: null, rating: 5, comment: "" });
      // Refresh appointments
      const { data } = await api.get(`/appointments/patient/${session.userId}`);
      setAppointments(data || []);
    } catch (err) {
      setReviewMsg(err?.response?.data?.message || "Unable to submit review. Please try again.");
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      await api.patch(`/appointments/${appointmentId}/cancel`);
      // Refresh appointments
      const { data } = await api.get(`/appointments/patient/${session.userId}`);
      setAppointments(data || []);
      setError(""); // Clear error on success
    } catch (err) {
      setError(err?.response?.data || "Unable to cancel appointment.");
    }
  };

  const formatDateTime = (iso) => {
    try {
      return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    } catch { return iso; }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", { dateStyle: "long" });
    } catch { return dateStr; }
  };

  if (loading) {
    return (
      <div className="shell max-w-4xl py-10">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="shell max-w-4xl py-10 fade-up">
      {/* Page Header */}
      <div className="mb-8">
        <p className="section-label">Patient Dashboard</p>
        <h1 className="page-title text-4xl">My Health Records</h1>
        <p className="mt-2 text-slate-500">Appointments, visit history, prescriptions, and reminders — all in one place.</p>
        {visits.length > 0 && (
          <a
            href={`http://localhost:8085/api/pdf/patient-history/${session.userId}`}
            target="_blank"
            rel="noreferrer"
            className="brand-btn-outline inline-block mt-3 px-5 py-2 text-xs"
            onClick={(e) => {
              e.preventDefault();
              const token = JSON.parse(localStorage.getItem("clinic-session"))?.token;
              fetch(`http://localhost:8085/api/pdf/patient-history/${session.userId}`, {
                headers: { Authorization: `Bearer ${token}` }
              }).then(r => r.blob()).then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "medical-history.pdf"; a.click();
                URL.revokeObjectURL(url);
              });
            }}
          >
            📄 Export History as PDF
          </a>
        )}
      </div>

      {error && <div className="alert-error mb-6"><p className="font-semibold">{error}</p></div>}

      {/* Revisit Reminders */}
      {revisitReminders.length > 0 && (
        <div className="revisit-banner p-5 mb-6 fade-up">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⏰</span>
            <div className="flex-1">
              <p className="font-black text-amber-800 text-lg">Revisit Reminder!</p>
              <p className="text-sm text-amber-700 mt-1">
                You have a doctor follow-up scheduled for <strong>tomorrow</strong>. Book your appointment now before slots fill up!
              </p>
              <ul className="mt-2 space-y-1">
                {revisitReminders.map((v) => (
                  <li key={v.id} className="text-sm text-amber-800 font-semibold">
                    • Follow-up for: {v.diagnosis || "previous visit"} — {formatDate(v.revisitDate)}
                  </li>
                ))}
              </ul>
              <a href="/nearby" className="brand-btn inline-block mt-3 px-5 py-2 text-xs">
                Book Revisit Appointment →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Active Tokens Today */}
      {activeTokens.length > 0 && (
        <section className="mb-8">
          <h2 className="section-title text-2xl mb-4 flex items-center gap-2">
            🎫 <span>Active Token Today</span>
          </h2>
          <div className="space-y-4">
            {activeTokens.map((appt) => (
              <div key={appt.appointmentId} className="token-card active-token-glow fade-up">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest text-teal-300">Active Appointment</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-white/60 mb-1">Your Token</p>
                      <div className="token-number">{appt.tokenNumber || "—"}</div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white/60">Scheduled at</p>
                      <p className="text-lg font-bold text-white">{formatDateTime(appt.startTime)}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                        <span>⏰</span>
                        <p className="text-sm text-white/80">Arrive <strong className="text-white">15 minutes before</strong> appointment</p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end">
                      <button
                        onClick={() => cancelAppointment(appt.appointmentId || appt.id)}
                        className="bg-white/10 hover:bg-rose-500/20 text-rose-100 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/10 hover:border-rose-400"
                      >
                        Cancel Token
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <section className="mb-8">
          <h2 className="section-title text-2xl mb-4 flex items-center gap-2">
            📅 <span>Upcoming Appointments</span>
          </h2>
          <div className="space-y-3">
            {upcomingAppointments.map((appt) => (
              <div key={appt.appointmentId} className="frost-card rounded-2xl p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 px-2 py-0.5 rounded">Booked</span>
                      <p className="font-bold text-slate-800">Token {appt.tokenNumber || "—"}</p>
                    </div>
                    <p className="text-sm text-slate-600">Scheduled: <strong className="text-slate-900">{formatDateTime(appt.startTime)}</strong></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-2">Clinic ID: {appt.clinicId}</p>
                    <button
                      onClick={() => cancelAppointment(appt.appointmentId || appt.id)}
                      className="btn-ghost text-rose-500 hover:bg-rose-50 hover:text-rose-600 px-3 py-1.5 text-xs inline-block"
                    >
                      Cancel Appointment
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Post-visit Review Prompts */}
      {completedWithoutReview.length > 0 && (
        <section className="mb-8">
          <h2 className="section-title text-2xl mb-4">⭐ Share Your Experience</h2>
          <div className="space-y-3">
            {completedWithoutReview.slice(0, 3).map((appt) => (
              <div key={appt.appointmentId} className="frost-card rounded-2xl p-5 border-l-4 border-amber-400">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-slate-800">Appointment #{appt.appointmentId}</p>
                    <p className="text-sm text-slate-500">{formatDateTime(appt.startTime)} • Token {appt.tokenNumber || "—"}</p>
                  </div>
                  <button
                    onClick={() => setReviewForm({ show: true, apptId: appt.appointmentId, doctorName: "your doctor", attended: null, rating: 5, comment: "" })}
                    className="brand-btn px-5 py-2 text-xs"
                  >
                    Did you attend? Rate Visit →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Review Modal */}
      {reviewForm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <form onSubmit={submitReview} className="frost-card rounded-[2rem] p-8 w-full max-w-md fade-up shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-6">Rate Your Visit</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-600 mb-3">Did you attend this appointment?</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setReviewForm({ ...reviewForm, attended: true })}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${reviewForm.attended === true ? "bg-emerald-500 text-white shadow-lg" : "btn-ghost"}`}>
                    ✓ Yes, I attended
                  </button>
                  <button type="button" onClick={() => setReviewForm({ ...reviewForm, attended: false })}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${reviewForm.attended === false ? "bg-rose-500 text-white shadow-lg" : "btn-ghost"}`}>
                    ✗ I didn't go
                  </button>
                </div>
              </div>

              {reviewForm.attended && (
                <>
                  <div>
                    <p className="text-sm font-bold text-slate-600 mb-2">Rate your doctor experience</p>
                    <div className="flex gap-2 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                          className={`text-2xl transition-transform hover:scale-110 ${reviewForm.rating >= star ? "text-amber-400" : "text-slate-200"}`}>
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Your Comments (optional)</label>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      placeholder="How was your experience with the doctor?"
                      className="field h-24"
                    />
                  </div>
                </>
              )}

              {reviewMsg && (
                <div className={reviewMsg.includes("Thank") ? "alert-success" : "alert-error"}>
                  <p className="text-sm font-semibold">{reviewMsg}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setReviewForm({ show: false, apptId: null, doctorName: "", attended: null, rating: 5, comment: "" })}
                  className="flex-1 btn-ghost py-3"
                >
                  Skip for now
                </button>
                <button type="submit" disabled={reviewForm.attended === null} className="flex-1 brand-btn py-3 disabled:opacity-50">
                  Submit
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Visit History */}
      <section>
        <h2 className="section-title text-2xl mb-4 flex items-center gap-2">
          📋 <span>Visit History</span>
          <span className="text-base font-medium text-slate-400 ml-1">({visits.length} records)</span>
        </h2>
        <div className="space-y-4">
          {visits.map((visit) => (
            <article key={visit.id} className="frost-card rounded-2xl overflow-hidden">
              <div className="border-l-4 border-teal-400 p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-teal-600 mb-1">Visit Record</p>
                    <p className="font-bold text-slate-800">{formatDate(visit.visitDate)}</p>
                  </div>
                  {visit.revisitDate && (
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Follow-up Date</p>
                      <p className="text-sm font-bold text-amber-700">{formatDate(visit.revisitDate)}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {visit.diagnosis && (
                    <div className="rx-card">
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-1">Diagnosis</p>
                      <p className="text-sm text-slate-700">{visit.diagnosis}</p>
                    </div>
                  )}
                  {visit.medications && (
                    <div className="rx-card">
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-1">Medications</p>
                      <p className="text-sm text-slate-700">{visit.medications}</p>
                    </div>
                  )}
                  {visit.diseaseHistory && (
                    <div className="rx-card sm:col-span-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-1">History Notes</p>
                      <p className="text-sm text-slate-700">{visit.diseaseHistory}</p>
                    </div>
                  )}
                </div>

                {/* Prescription Upload / View */}
                <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xl">📄</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-600">
                      {visit.prescriptionPhotoUrl ? "✓ Prescription Uploaded" : "Download or Upload Prescription"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {visit.prescriptionPhotoUrl ? "Tap to view or replace" : "Get PDF or upload a photo"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const token = JSON.parse(localStorage.getItem("clinic-session"))?.token;
                      fetch(`http://localhost:8085/api/pdf/prescription/${visit.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      }).then(r => r.blob()).then(blob => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url; a.download = `prescription-${visit.id}.pdf`; a.click();
                        URL.revokeObjectURL(url);
                      }).catch(() => alert("Unable to download prescription"));
                    }}
                    className="btn-ghost px-3 py-1.5 text-xs"
                  >
                    ⬇ PDF
                  </button>
                  {visit.prescriptionPhotoUrl && (
                    <a href={visit.prescriptionPhotoUrl} target="_blank" rel="noreferrer"
                      className="btn-ghost px-3 py-1.5 text-xs">View</a>
                  )}
                  <input type="file" accept="image/*,.pdf" className="hidden" id={`rx-upload-${visit.id}`}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        try {
                          await api.patch(`/visits/${visit.id}/prescription`, {
                            prescriptionPhotoUrl: reader.result,
                          });
                          const { data } = await api.get(`/visits/patient/${session.userId}`);
                          setVisits(data || []);
                        } catch {
                          alert("Upload failed. Please try again.");
                        }
                      };
                      reader.readAsDataURL(file);
                    }} />
                  <label htmlFor={`rx-upload-${visit.id}`} className="btn-ghost px-3 py-1.5 text-xs cursor-pointer">
                    {visit.prescriptionPhotoUrl ? "Replace" : "Upload"}
                  </label>
                </div>
              </div>
            </article>
          ))}

          {visits.length === 0 && (
            <div className="text-center py-16 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="text-5xl mb-4">🏥</div>
              <p className="text-lg font-semibold text-slate-500">No visit records yet.</p>
              <p className="mt-2 text-sm text-slate-400">Book your first appointment to start building your health record.</p>
              <a href="/nearby" className="brand-btn inline-block mt-5 px-6 py-2.5 text-sm">Find Clinics →</a>
            </div>
          )}
        </div>
      </section>

      {/* All Appointments */}
      <section className="mt-10">
        <h2 className="section-title text-2xl mb-4 flex items-center gap-2">
          📅 <span>All Appointments</span>
        </h2>
        <div className="space-y-3">
          {appointments.map((appt) => {
            const statusClass = appt.status === "BOOKED" ? "status-badge status-booked"
              : appt.status === "CANCELLED" ? "status-badge status-cancelled"
              : appt.status === "COMPLETED" ? "status-badge status-completed"
              : "status-badge status-pending";
            return (
              <div key={appt.appointmentId} className="frost-card rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {appt.tokenNumber && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black text-teal-300"
                      style={{ background: "linear-gradient(135deg, #0b1437, #0ea5a5)" }}>
                      {appt.tokenNumber}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Token {appt.tokenNumber || "—"} · Appt #{appt.appointmentId}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(appt.startTime)}</p>
                  </div>
                </div>
                <span className={statusClass}>{appt.status}</span>
              </div>
            );
          })}
          {appointments.length === 0 && (
            <p className="text-center py-6 text-slate-400">No scheduled appointments.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default PatientVisits;
