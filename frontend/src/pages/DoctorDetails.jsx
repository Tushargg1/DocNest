import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function DoctorDetails() {
  const { doctorUserId } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [bookingSlot, setBookingSlot] = useState(null);
  const [isFav, setIsFav] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/clinics/doctor/${doctorUserId}`);
        setDoctor(data);
      } catch { setMessage("Unable to load doctor"); }
      finally { setLoading(false); }
    };
    load();
    if (session) api.get(`/favorites/check/${doctorUserId}`).then(r => setIsFav(r.data.isFavorite)).catch(() => {});
  }, [doctorUserId]);

  useEffect(() => {
    setSlotsLoading(true);
    api.get(`/appointments/doctor/${doctorUserId}/slots`, { params: { date } })
      .then(r => setSlots(r.data.availableSlots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [doctorUserId, date]);

  const toggleFavorite = async () => {
    if (!session) { navigate("/login"); return; }
    try {
      if (isFav) { await api.delete(`/favorites/${doctorUserId}`); setIsFav(false); }
      else { await api.post(`/favorites/${doctorUserId}`); setIsFav(true); }
    } catch {}
  };

  const bookSlot = async (slot) => {
    if (!session) { navigate("/login"); return; }
    setBookingSlot(slot);
    setMessage("");
    try {
      await api.post("/appointments/book", {
        doctorUserId: Number(doctorUserId),
        patientUserId: session.userId,
        clinicId: doctor.clinicId,
        startTime: slot,
      });
      navigate("/patient/visits");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Slot unavailable.");
    } finally { setBookingSlot(null); }
  };

  const formatTime = (iso) => {
    try { return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }); }
    catch { return iso; }
  };

  const nextDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    nextDates.push(d.toISOString().slice(0, 10));
  }

  if (loading) return <div className="shell py-10"><div className="skeleton h-60 w-full rounded-2xl" /></div>;
  if (!doctor) return (
    <div className="shell py-20 text-center">
      <p className="text-slate-500">{message || "Doctor not found"}</p>
      <Link to="/nearby" className="brand-btn inline-block mt-4 px-6 py-2 text-sm">Find Doctors</Link>
    </div>
  );

  const doctorName = doctor.doctorName.startsWith("Dr.") ? doctor.doctorName : "Dr. " + doctor.doctorName;

  return (
    <div className="shell max-w-2xl py-8 fade-up">
      {/* Back */}
      <Link to="/nearby" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        ← Back
      </Link>

      {/* Clinic Name */}
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-widest text-teal-600">{doctor.clinicName}</p>
        <p className="text-xs text-slate-400">{doctor.clinicAddress}</p>
      </div>

      {/* Doctor Card — collapsible */}
      <div className="frost-card rounded-2xl mb-6 overflow-hidden">
        {/* Doctor Header — always visible */}
        <div className="p-5 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white text-xl font-black">
            {doctor.doctorName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-slate-900 truncate">{doctorName}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">{doctor.specialization}</span>
              {doctor.age && <span className="text-xs text-slate-400">{doctor.age}y</span>}
              {doctor.gender && <span className="text-xs text-slate-400">• {doctor.gender}</span>}
              {doctor.roomId && <span className="text-xs text-slate-400">• {doctor.roomId}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {doctor.averageRating > 0 && (
              <span className="text-sm font-bold text-amber-600">⭐ {doctor.averageRating}</span>
            )}
          </div>
        </div>

        {/* Favorite + Expand row — always visible */}
        <div className="px-5 pb-4 flex items-center justify-between gap-3">
          {session && session.role === "PATIENT" && (
            <button
              onClick={toggleFavorite}
              className={`text-sm font-bold px-4 py-2 rounded-xl transition-all ${isFav ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-slate-50 text-slate-500 border border-slate-200 hover:border-rose-300"}`}
            >
              {isFav ? "❤️ Saved" : "🤍 Save"}
            </button>
          )}
          {!session && <div />}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-semibold text-teal-600 flex items-center gap-1 hover:underline"
          >
            {showDetails ? "Hide details" : "View details"}
            <svg className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
            {doctor.bio && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">About</p>
                <p className="text-sm text-slate-600 leading-relaxed">{doctor.bio}</p>
              </div>
            )}
            {doctor.degrees && doctor.degrees.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Qualifications</p>
                <div className="flex flex-wrap gap-2">
                  {doctor.degrees.map((deg, i) => (
                    <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium">{deg}</span>
                  ))}
                </div>
              </div>
            )}
            {doctor.distanceKm != null && (
              <p className="text-sm text-teal-600 font-semibold">{doctor.distanceKm} km from you</p>
            )}
          </div>
        )}
      </div>

      {/* BOOKING SECTION — main focus */}
      <div className="frost-card rounded-2xl p-5">
        <h2 className="text-base font-black text-slate-900 mb-4">Select Date & Time</h2>

        {/* Date Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3">
          {nextDates.map((d) => {
            const dayObj = new Date(d);
            const isSelected = d === date;
            return (
              <button
                key={d}
                onClick={() => setDate(d)}
                className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  isSelected
                    ? "bg-teal-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-teal-50"
                }`}
              >
                <span className="text-[10px]">{dayObj.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                <span className="text-base">{dayObj.getDate()}</span>
              </button>
            );
          })}
        </div>

        {/* Date picker fallback */}
        <input
          type="date"
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className="field text-sm mb-4"
        />

        {/* Slots Grid */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-700">
            {slotsLoading ? "Loading..." : `${slots.length} slots available`}
          </p>
          {slotsLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto">
          {slots.map((slot) => (
            <button
              key={slot}
              onClick={() => bookSlot(slot)}
              disabled={bookingSlot === slot}
              className="relative rounded-xl border-2 border-emerald-300 bg-emerald-50 p-2.5 text-center transition-all hover:bg-emerald-100 hover:border-emerald-500 active:scale-95 disabled:opacity-50"
            >
              <p className="text-sm font-bold text-emerald-800">{formatTime(slot)}</p>
              <p className="text-[9px] text-emerald-600 mt-0.5">Available</p>
              {bookingSlot === slot && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                </div>
              )}
            </button>
          ))}
        </div>

        {!slotsLoading && slots.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-sm text-slate-500">No slots for this date</p>
            <p className="text-xs text-slate-400 mt-1">Try another date</p>
          </div>
        )}

        {message && <div className="alert-error mt-4"><p className="text-sm font-bold">{message}</p></div>}

        {!session && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <p className="text-xs text-amber-700 font-semibold">
              <Link to="/login" className="underline">Sign in</Link> to book an appointment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorDetails;
