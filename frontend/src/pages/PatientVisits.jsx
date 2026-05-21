import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import AppointmentQR from "../components/AppointmentQR";
import RescheduleModal from "../components/RescheduleModal";

function PatientVisits() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ show: false, apptId: null, doctorName: "", attended: null, rating: 5, comment: "" });
  const [reviewMsg, setReviewMsg] = useState("");
  const [qrAppointment, setQrAppointment] = useState(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [favorites, setFavorites] = useState([]);
  const [detailModal, setDetailModal] = useState(null);
  const [doctorCache, setDoctorCache] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [paymentStatuses, setPaymentStatuses] = useState({});

  useEffect(() => {
    const load = async () => {
      if (!session) return;
      try {
        const [visitsRes, apptRes, favRes] = await Promise.allSettled([
          api.get(`/visits/patient/${session.userId}`),
          api.get(`/appointments/patient/${session.userId}`),
          api.get(`/favorites`),
        ]);
        if (visitsRes.status === "fulfilled") setVisits(visitsRes.value.data || []);
        if (apptRes.status === "fulfilled") setAppointments(apptRes.value.data || []);
        if (favRes.status === "fulfilled") {
          const favs = favRes.value.data || [];
          const enriched = await Promise.all(favs.map(async (f) => {
            try {
              const { data: doc } = await api.get(`/clinics/doctor/${f.doctorUserId}`);
              return { ...f, ...doc };
            } catch {
              return f;
            }
          }));
          setFavorites(enriched);
        }
      } catch {
        setError("Unable to load records.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session]);

  // Fetch payment statuses for all appointments
  useEffect(() => {
    const fetchPayments = async () => {
      if (appointments.length === 0) return;
      const statuses = {};
      await Promise.allSettled(
        appointments.map(async (appt) => {
          try {
            const { data } = await api.get(`/payments/appointment/${appt.appointmentId || appt.id}`);
            if (data) statuses[appt.appointmentId || appt.id] = data;
          } catch { /* no payment record */ }
        })
      );
      setPaymentStatuses(statuses);
    };
    fetchPayments();
  }, [appointments]);

  const fetchDoctorDetails = async (doctorUserId) => {
    if (!doctorUserId) return null;
    if (doctorCache[doctorUserId]) return doctorCache[doctorUserId];
    try {
      const { data } = await api.get(`/clinics/doctor/${doctorUserId}`);
      setDoctorCache((prev) => ({ ...prev, [doctorUserId]: data }));
      return data;
    } catch {
      return null;
    }
  };

  const openAppointmentDetail = async (appt) => {
    const doctor = await fetchDoctorDetails(appt.doctorUserId);
    setDetailModal({ ...appt, doctor });
  };

  const isFavorite = (doctorUserId) => favorites.some((f) => f.doctorUserId === doctorUserId);

  const toggleFavorite = async (doctorUserId, doctorInfo = null) => {
    try {
      if (isFavorite(doctorUserId)) {
        await api.delete(`/favorites/${doctorUserId}`);
        setFavorites((prev) => prev.filter((f) => f.doctorUserId !== doctorUserId));
      } else {
        await api.post(`/favorites/${doctorUserId}`);
        const docDetails = doctorInfo || (await fetchDoctorDetails(doctorUserId));
        setFavorites((prev) => [...prev, { doctorUserId, ...(docDetails || {}) }]);
      }
    } catch {
      alert("Unable to update favorites.");
    }
  };

  const rebookAppointment = (doctorUserId, clinicId) => {
    navigate(`/book?doctorUserId=${doctorUserId}&clinicId=${clinicId || ""}`);
  };

  // Computed data
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const revisitReminders = visits.filter(
    (v) => v.revisitDate && String(v.revisitDate).slice(0, 10) === tomorrowStr
  );

  const activeTokens = appointments.filter((a) => {
    if (a.status !== "BOOKED" || !a.startTime) return false;
    const apptDate = a.startTime.slice(0, 10);
    if (apptDate !== today) return false;
    return new Date(a.startTime).getTime() > now.getTime() - 4 * 60 * 60 * 1000;
  });

  const completedWithoutReview = appointments.filter(
    (a) => (a.status === "COMPLETED" || a.status === "ATTENDED") && !a.reviewed
  );

  const upcomingAppointments = appointments.filter(
    (a) => a.status === "BOOKED" && a.startTime && a.startTime.slice(0, 10) > today
  );

  const attendedAppointments = appointments.filter(
    (a) => a.status === "ATTENDED" || a.status === "COMPLETED"
  );

  const missedAppointments = appointments.filter((a) => a.status === "MISSED");
  const cancelledAppointments = appointments.filter((a) => a.status === "CANCELLED");

  const submitReview = async (e) => {
    e.preventDefault();
    setReviewMsg("");
    try {
      await api.post(`/appointments/${reviewForm.apptId}/review`, {
        attended: reviewForm.attended,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      setReviewMsg("Thank you for your feedback!");
      setReviewForm({ show: false, apptId: null, doctorName: "", attended: null, rating: 5, comment: "" });
      const { data } = await api.get(`/appointments/patient/${session.userId}`);
      setAppointments(data || []);
    } catch (err) {
      setReviewMsg(err?.response?.data?.message || "Unable to submit review. Please try again.");
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      await api.patch(`/appointments/${appointmentId}/cancel`);
      const { data } = await api.get(`/appointments/patient/${session.userId}`);
      setAppointments(data || []);
      setError("");
    } catch (err) {
      const errData = err?.response?.data;
      const msg = typeof errData === "string" ? errData : errData?.message || "Unable to cancel appointment.";
      setError(msg);
    }
  };

  const formatDateTime = (iso) => {
    try {
      return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return iso;
    }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", { dateStyle: "long" });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="shell max-w-5xl py-10">
        <div className="space-y-4">
          <div className="skeleton h-28 w-full rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 w-full rounded-2xl" />)}
          </div>
          <div className="skeleton h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="shell max-w-5xl py-10 fade-up">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p className="section-label">{t("patient.dashboard")}</p>
          <h1 className="page-title text-4xl mt-1">{t("patient.myHealthRecords")}</h1>
          <p className="mt-2 text-slate-500">
            {t("patient.trackDescription")}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {visits.length > 0 && (
            <button
              onClick={() => {
                const token = JSON.parse(localStorage.getItem("clinic-session"))?.token;
                fetch(`http://localhost:8085/api/pdf/patient-history/${session.userId}`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then((r) => r.blob())
                  .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "medical-history.pdf";
                    a.click();
                    URL.revokeObjectURL(url);
                  });
              }}
              className="brand-btn-outline px-4 py-2.5 text-xs"
            >
              {t("patient.exportPdf")}
            </button>
          )}
          <Link to="/nearby" className="brand-btn px-5 py-2.5 text-xs">
            + {t("patient.bookNewAppointment")}
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert-error mb-6" role="alert">
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
        <div className="frost-card rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-teal-600">{activeTokens.length + upcomingAppointments.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{t("patient.upcoming")}</p>
        </div>
        <div className="frost-card rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-emerald-600">{attendedAppointments.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{t("patient.attended")}</p>
        </div>
        <div className="frost-card rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-slate-700">{visits.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{t("patient.visitRecords")}</p>
        </div>
        <div className="frost-card rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-rose-500">{favorites.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{t("patient.favorites")}</p>
        </div>
      </div>

      {/* Revisit Reminders */}
      {revisitReminders.length > 0 && (
        <div className="revisit-banner p-5 mb-6 fade-up">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⏰</span>
            <div className="flex-1">
              <p className="font-black text-amber-800 text-lg">{t("patient.followUpReminder")}</p>
              <p className="text-sm text-amber-700 mt-1">
                {t("patient.followUpTomorrow")}
              </p>
              <ul className="mt-2 space-y-1">
                {revisitReminders.map((v) => (
                  <li key={v.id} className="text-sm text-amber-800 font-semibold">
                    • {v.diagnosis || "Previous visit"} — {formatDate(v.revisitDate)}
                  </li>
                ))}
              </ul>
              <Link to="/nearby" className="brand-btn inline-block mt-3 px-5 py-2 text-xs">
                {t("patient.bookRevisit")} →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Active Token — Today's Appointment */}
      {activeTokens.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            {t("patient.todaysAppointment")}
          </h2>
          <div className="space-y-4">
            {activeTokens.map((appt) => (
              <div key={appt.appointmentId} className="token-card active-token-glow fade-up">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest text-teal-300">{t("patient.activeArriveEarly")}</span>
                  </div>
                  <div className="flex items-end justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wide mb-1">{t("patient.yourToken")}</p>
                      <div className="token-number">{appt.tokenNumber || "—"}</div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/50 uppercase tracking-wide">Time</p>
                      <p className="text-2xl font-black text-white mt-1">{formatTime(appt.startTime)}</p>
                      <p className="text-xs text-white/60 mt-0.5">{formatDate(appt.startTime)}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3 flex-wrap">
                    <button
                      onClick={() => setQrAppointment(appt)}
                      className="bg-teal-400 hover:bg-teal-300 text-slate-900 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                    >
                      {t("patient.showCheckinQR")}
                    </button>
                    <button
                      onClick={() => openAppointmentDetail(appt)}
                      className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/10"
                    >
                      {t("patient.viewDetails")}
                    </button>
                    <button
                      onClick={() => setRescheduleAppointment(appt)}
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/10"
                    >
                      {t("patient.reschedule")}
                    </button>
                    <button
                      onClick={() => cancelAppointment(appt.appointmentId || appt.id)}
                      className="bg-white/5 hover:bg-rose-500/20 text-rose-200 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/10 hover:border-rose-400 ml-auto"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Post-visit Reviews — only show when visit record exists AND prescription uploaded */}
      {(() => {
        const reviewableAppts = completedWithoutReview.filter(appt => {
          // Find matching visit record for this appointment
          const visitForAppt = visits.find(v => v.appointmentId === (appt.appointmentId || appt.id));
          // Require: visit exists AND prescription photo uploaded
          return visitForAppt && visitForAppt.prescriptionPhotoUrl;
        });
        if (reviewableAppts.length === 0) return null;
        return (
          <section className="mb-8">
            <div className="frost-card rounded-xl p-6 border-l-4 border-teal-400">
              <div className="mb-3">
                <p className="font-bold text-slate-900">{t("patient.rateVisit")}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t("patient.rateVisitDesc")}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {reviewableAppts.slice(0, 3).map((appt) => {
                  const visitForAppt = visits.find(v => v.appointmentId === (appt.appointmentId || appt.id));
                  return (
                    <button
                      key={appt.appointmentId}
                      onClick={() =>
                        setReviewForm({
                          show: true,
                          apptId: appt.appointmentId,
                          doctorName: "your doctor",
                          attended: null,
                          rating: 5,
                          comment: "",
                        })
                      }
                      className="brand-btn-outline px-4 py-2 text-xs"
                    >
                      Review visit on {formatDate(appt.startTime)} {visitForAppt?.diagnosis ? `(${visitForAppt.diagnosis})` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Favorite Doctors */}
      {favorites.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
            {t("patient.favoriteDoctors")}
            <span className="text-xs font-medium text-slate-400 ml-1">({favorites.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav) => (
              <article
                key={fav.doctorUserId}
                className="frost-card rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-transform"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 font-black">
                  {(fav.doctorName || "D").charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">Dr. {fav.doctorName || `#${fav.doctorUserId}`}</p>
                  {fav.specialization && (
                    <p className="text-xs text-teal-600 font-medium truncate">{fav.specialization}</p>
                  )}
                  {fav.clinicName && (
                    <p className="text-[10px] text-slate-400 truncate">{fav.clinicName}</p>
                  )}
                </div>
                <button
                  onClick={() => rebookAppointment(fav.doctorUserId, fav.clinicId)}
                  className="brand-btn px-3 py-1.5 text-[10px] shrink-0"
                >
                  {t("patient.book")}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Appointments Tabs */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-black text-slate-900">{t("patient.appointmentsTitle")}</h2>
        </div>
        {/* Pill Tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl mb-5 overflow-x-auto">
          {[
            { id: "upcoming", label: t("patient.upcoming"), count: upcomingAppointments.length + activeTokens.length },
            { id: "attended", label: t("patient.attended"), count: attendedAppointments.length },
            { id: "missed", label: t("patient.missed"), count: missedAppointments.length },
            { id: "cancelled", label: t("patient.cancelled"), count: cancelledAppointments.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-black ${
                  activeTab === tab.id ? "bg-teal-100 text-teal-700" : "bg-slate-200 text-slate-500"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-3">
          {(() => {
            const list = {
              upcoming: [...activeTokens, ...upcomingAppointments],
              attended: attendedAppointments,
              missed: missedAppointments,
              cancelled: cancelledAppointments,
            }[activeTab] || [];

            if (list.length === 0) {
              const emptyStates = {
                upcoming: { icon: "📅", text: t("patient.noUpcoming"), sub: t("patient.noUpcomingSub") },
                attended: { icon: "✅", text: t("patient.noAttended"), sub: t("patient.noAttendedSub") },
                missed: { icon: "🎉", text: t("patient.noMissed"), sub: t("patient.noMissedSub") },
                cancelled: { icon: "📋", text: t("patient.noCancelled"), sub: t("patient.noCancelledSub") },
              };
              const empty = emptyStates[activeTab];
              return (
                <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200">
                  <span className="text-4xl">{empty.icon}</span>
                  <p className="mt-3 font-bold text-slate-600">{empty.text}</p>
                  <p className="text-xs text-slate-400 mt-1">{empty.sub}</p>
                  {activeTab === "upcoming" && (
                    <Link to="/nearby" className="brand-btn inline-block mt-4 px-5 py-2 text-xs">
                      {t("patient.findDoctors")} →
                    </Link>
                  )}
                </div>
              );
            }

            return list.map((appt) => {
              const statusStyles = {
                BOOKED: "bg-teal-50 text-teal-700 border-teal-200",
                ATTENDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
                MISSED: "bg-rose-50 text-rose-700 border-rose-200",
                CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
              };
              const statusLabel = {
                BOOKED: "Booked",
                ATTENDED: "Attended",
                COMPLETED: "Completed",
                MISSED: "Missed",
                CANCELLED: "Cancelled",
              };

              return (
                <div
                  key={appt.appointmentId}
                  className="frost-card rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-lg hover:border-teal-200 transition-all group"
                  onClick={() => openAppointmentDetail(appt)}
                >
                  {/* Token badge */}
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
                    
                  >
                    {appt.tokenNumber || "#"}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 text-sm">
                        Appointment #{appt.appointmentId}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyles[appt.status] || "bg-slate-50 text-slate-500"}`}>
                        {statusLabel[appt.status] || appt.status}
                      </span>
                      {/* Payment Status Badge */}
                      {(() => {
                        const payment = paymentStatuses[appt.appointmentId || appt.id];
                        if (!payment) return null;
                        const payBadgeStyles = {
                          COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                          PENDING: "bg-amber-50 text-amber-700 border-amber-200",
                          REFUNDED: "bg-slate-100 text-slate-600 border-slate-200",
                          FAILED: "bg-rose-50 text-rose-700 border-rose-200",
                        };
                        const payBadgeLabels = {
                          COMPLETED: "Paid",
                          PENDING: "Payment Pending",
                          REFUNDED: "Refunded",
                          FAILED: "Payment Failed",
                        };
                        return (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${payBadgeStyles[payment.status] || ""}`}>
                            {payBadgeLabels[payment.status] || payment.status}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDateTime(appt.startTime)}
                    </p>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {appt.status === "BOOKED" && (
                      <>
                        <button
                          onClick={() => setQrAppointment(appt)}
                          className="btn-ghost px-3 py-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          🎫 QR
                        </button>
                        <button
                          onClick={() => setRescheduleAppointment(appt)}
                          className="text-xs text-teal-600 hover:text-teal-800 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => cancelAppointment(appt.appointmentId || appt.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    <svg className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </section>

      {/* Visit Records */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            {t("patient.visitHistory")}
            <span className="text-xs font-medium text-slate-400">({visits.length})</span>
          </h2>
        </div>

        <div className="space-y-4">
          {visits.map((visit) => (
            <article key={visit.id} className="frost-card rounded-2xl overflow-hidden">
              <div className="border-l-4 border-teal-400 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-teal-600 mb-1">
                      {formatDate(visit.visitDate)}
                    </p>
                    {visit.diagnosis && (
                      <p className="font-bold text-slate-800">{visit.diagnosis}</p>
                    )}
                  </div>
                  {visit.revisitDate && (
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">{t("patient.followUp")}</p>
                      <p className="text-sm font-bold text-amber-700">{formatDate(visit.revisitDate)}</p>
                    </div>
                  )}
                </div>

                {(visit.medications || visit.diseaseHistory) && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {visit.medications && (
                      <div className="rx-card">
                        <p className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-1">{t("patient.medications")}</p>
                        <p className="text-sm text-slate-700">{visit.medications}</p>
                      </div>
                    )}
                    {visit.diseaseHistory && (
                      <div className="rx-card">
                        <p className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-1">{t("patient.notes")}</p>
                        <p className="text-sm text-slate-700">{visit.diseaseHistory}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Prescription Actions */}
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const token = JSON.parse(localStorage.getItem("clinic-session"))?.token;
                      fetch(`http://localhost:8085/api/pdf/prescription/${visit.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      })
                        .then((r) => r.blob())
                        .then((blob) => {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `prescription-${visit.id}.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);
                        })
                        .catch(() => alert("Unable to download prescription"));
                    }}
                    className="btn-ghost px-3 py-1.5 text-xs"
                  >
                    {t("patient.downloadRxPdf")}
                  </button>
                  {visit.prescriptionPhotoUrl && (
                    <a
                      href={`http://localhost:8085${visit.prescriptionPhotoUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost px-3 py-1.5 text-xs"
                    >
                      {t("patient.viewPhoto")}
                    </a>
                  )}
                  <label
                    htmlFor={`rx-upload-${visit.id}`}
                    className="btn-ghost px-3 py-1.5 text-xs cursor-pointer"
                  >
                    {visit.prescriptionPhotoUrl ? t("common.replace") : t("common.upload")}
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    className="hidden"
                    id={`rx-upload-${visit.id}`}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        alert("File size exceeds 5MB limit.");
                        return;
                      }
                      try {
                        setUploadProgress((prev) => ({ ...prev, [visit.id]: 0 }));
                        const formData = new FormData();
                        formData.append("file", file);
                        const uploadRes = await api.post("/uploads/prescription", formData, {
                          headers: { "Content-Type": "multipart/form-data" },
                          onUploadProgress: (progressEvent) => {
                            const percent = Math.round(
                              (progressEvent.loaded * 100) / progressEvent.total
                            );
                            setUploadProgress((prev) => ({ ...prev, [visit.id]: percent }));
                          },
                        });
                        const fileUrl = uploadRes.data.url;
                        await api.patch(`/visits/${visit.id}/prescription`, {
                          prescriptionPhotoUrl: fileUrl,
                        });
                        const { data } = await api.get(`/visits/patient/${session.userId}`);
                        setVisits(data || []);
                      } catch {
                        alert("Upload failed. Please try again.");
                      } finally {
                        setUploadProgress((prev) => {
                          const copy = { ...prev };
                          delete copy[visit.id];
                          return copy;
                        });
                      }
                    }}
                  />
                  {uploadProgress[visit.id] !== undefined && (
                    <div className="flex items-center gap-2 ml-2">
                      <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-200"
                          style={{ width: `${uploadProgress[visit.id]}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        {uploadProgress[visit.id]}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}

          {visits.length === 0 && (
            <div className="text-center py-16 rounded-2xl border-2 border-dashed border-slate-200">
              <span className="text-5xl">🏥</span>
              <p className="mt-4 text-lg font-bold text-slate-600">No visit records yet</p>
              <p className="mt-1 text-sm text-slate-400">
                After your first appointment, your doctor will create a visit record with diagnosis and prescriptions.
              </p>
              <Link to="/nearby" className="brand-btn inline-block mt-5 px-6 py-2.5 text-sm">
                Find Clinics →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* QR Code Modal */}
      {qrAppointment && (
        <AppointmentQR appointment={qrAppointment} onClose={() => setQrAppointment(null)} />
      )}

      {/* Reschedule Modal */}
      {rescheduleAppointment && (
        <RescheduleModal
          appointment={rescheduleAppointment}
          onClose={() => setRescheduleAppointment(null)}
          onSuccess={async () => {
            setRescheduleAppointment(null);
            try {
              const { data } = await api.get(`/appointments/patient/${session.userId}`);
              setAppointments(data || []);
            } catch {}
          }}
        />
      )}

      {/* Review Modal */}
      {reviewForm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <form onSubmit={submitReview} className="frost-card rounded-xl p-8 w-full max-w-md fade-up ">
            <h3 className="text-xl font-black text-slate-900 mb-6">Rate Your Visit</h3>

            <div className="space-y-5">
              <div>
                <p className="text-sm font-bold text-slate-600 mb-3">Did you attend this appointment?</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, attended: true })}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                      reviewForm.attended === true
                        ? "bg-emerald-500 text-white shadow-lg"
                        : "btn-ghost"
                    }`}
                  >
                    ✓ Yes, I attended
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, attended: false })}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                      reviewForm.attended === false
                        ? "bg-rose-500 text-white shadow-lg"
                        : "btn-ghost"
                    }`}
                  >
                    ✗ I didn't go
                  </button>
                </div>
              </div>

              {reviewForm.attended && (
                <>
                  <div>
                    <p className="text-sm font-bold text-slate-600 mb-2">How was your experience?</p>
                    <div className="flex gap-2 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                          className={`text-3xl transition-transform hover:scale-125 ${
                            reviewForm.rating >= star ? "text-amber-400" : "text-slate-200"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">
                      Comments (optional)
                    </label>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      placeholder="How was your experience?"
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

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setReviewForm({ show: false, apptId: null, doctorName: "", attended: null, rating: 5, comment: "" })
                  }
                  className="flex-1 btn-ghost py-3"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={reviewForm.attended === null}
                  className="flex-1 brand-btn py-3 disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {detailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDetailModal(null)}
        >
          <div
            className="frost-card rounded-xl p-8 w-full max-w-md fade-up "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-teal-600 mb-1">
                  Appointment Details
                </p>
                <h3 className="text-xl font-black text-slate-900">
                  Token {detailModal.tokenNumber || "—"}
                </h3>
              </div>
              <button onClick={() => setDetailModal(null)} className="btn-ghost px-3 py-1 text-xs">
                ✕
              </button>
            </div>

            {/* Doctor Info */}
            {detailModal.doctor ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 font-black text-xl">
                    {(detailModal.doctor.doctorName || "D").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900">Dr. {detailModal.doctor.doctorName}</p>
                    {detailModal.doctor.specialization && (
                      <span className="spec-tag-light mt-1 inline-flex">{detailModal.doctor.specialization}</span>
                    )}
                    {detailModal.doctor.clinicName && (
                      <p className="text-xs text-slate-500 mt-1">🏥 {detailModal.doctor.clinicName}</p>
                    )}
                    {detailModal.doctor.clinicAddress && (
                      <p className="text-[10px] text-slate-400">{detailModal.doctor.clinicAddress}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 mb-5">
                <div className="skeleton h-12 w-full rounded-xl" />
              </div>
            )}

            {/* Appointment Info */}
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Scheduled</span>
                <strong>{formatDateTime(detailModal.startTime)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span
                  className={`font-bold ${
                    detailModal.status === "ATTENDED" || detailModal.status === "COMPLETED"
                      ? "text-emerald-600"
                      : detailModal.status === "MISSED" || detailModal.status === "CANCELLED"
                      ? "text-rose-600"
                      : "text-teal-600"
                  }`}
                >
                  {detailModal.status}
                </span>
              </div>
              {detailModal.checkInCode && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Check-in Code</span>
                  <span className="font-mono font-bold text-slate-800">{detailModal.checkInCode}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid gap-2">
              <button
                onClick={() => {
                  rebookAppointment(detailModal.doctorUserId, detailModal.clinicId);
                  setDetailModal(null);
                }}
                className="brand-btn w-full py-3 text-sm font-bold"
              >
                📅 Book Again
              </button>
              <button
                onClick={() => toggleFavorite(detailModal.doctorUserId, detailModal.doctor)}
                className={`w-full py-3 text-sm font-bold rounded-xl transition-all ${
                  isFavorite(detailModal.doctorUserId)
                    ? "bg-rose-50 text-rose-600 border-2 border-rose-200 hover:bg-rose-100"
                    : "btn-ghost"
                }`}
              >
                {isFavorite(detailModal.doctorUserId) ? "💔 Remove from Favorites" : "❤️ Add to Favorites"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientVisits;


