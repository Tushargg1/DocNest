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
  const [reviews, setReviews] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [bookingSlot, setBookingSlot] = useState(null);
  const [isFav, setIsFav] = useState(false);

  const fetchDoctor = async () => {
    try {
      const { data } = await api.get(`/clinics/doctor/${doctorUserId}`);
      setDoctor(data);
    } catch {
      setMessage("Unable to load doctor details");
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    setSlotsLoading(true);
    try {
      const { data } = await api.get(`/appointments/doctor/${doctorUserId}/slots`, { params: { date } });
      setSlots(data.availableSlots || []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const checkFavorite = async () => {
    if (!session) return;
    try {
      const { data } = await api.get(`/favorites/check/${doctorUserId}`);
      setIsFav(data.isFavorite);
    } catch { /* not critical */ }
  };

  const fetchReviews = async () => {
    try {
      const { data } = await api.get(`/doctors/${doctorUserId}/ratings`);
      setReviews(data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchDoctor(); checkFavorite(); fetchReviews(); }, [doctorUserId]);
  useEffect(() => { fetchSlots(); }, [doctorUserId, date]);

  const toggleFavorite = async () => {
    if (!session) { navigate("/login"); return; }
    try {
      if (isFav) {
        await api.delete(`/favorites/${doctorUserId}`);
        setIsFav(false);
      } else {
        await api.post(`/favorites/${doctorUserId}`);
        setIsFav(true);
      }
    } catch { /* ignore */ }
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
      setMessage(err?.response?.data?.message || "Slot unavailable. Try another.");
    } finally {
      setBookingSlot(null);
    }
  };

  const formatTime = (iso) => {
    try { return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }); }
    catch { return iso; }
  };

  // Date navigation helpers
  const nextDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    nextDates.push(d.toISOString().slice(0, 10));
  }

  if (loading) return (
    <div className="shell py-10">
      <div className="skeleton h-80 w-full rounded-3xl mb-6" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 skeleton h-60 rounded-2xl" />
        <div className="skeleton h-60 rounded-2xl" />
      </div>
    </div>
  );

  if (!doctor) return (
    <div className="shell py-20 text-center fade-up">
      <div className="text-5xl mb-4">🩺</div>
      <h1 className="text-2xl font-black text-slate-900">Doctor Not Found</h1>
      <p className="text-slate-500 mt-2">{message || "This doctor may not be active."}</p>
      <Link to="/nearby" className="brand-btn inline-block mt-6 px-8 py-3">Find Doctors →</Link>
    </div>
  );

  return (
    <div className="shell py-10 fade-up">
      {/* Back Button */}
      <Link to="/nearby" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-teal-600 transition-colors">
        ← Back to Clinics
      </Link>

      {/* Hero Banner */}
      <div className="frost-card overflow-hidden rounded-xl mb-8">
        <div className="relative h-44 bg-teal-600 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-teal-500/20 blur-2xl" />
          <div className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-emerald-400/10 blur-xl" />
          {/* Clinic info overlay */}
          <div className="absolute bottom-4 right-6 text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Clinic</p>
            <p className="text-sm font-bold text-white/80">{doctor.clinicName}</p>
            <p className="text-xs text-white/50">{doctor.clinicAddress}</p>
          </div>
        </div>

        <div className="relative px-8 pb-8">
          {/* Avatar */}
          <div className="absolute -top-14 left-8">
            <div className="h-28 w-28 rounded-3xl bg-white p-1.5 ">
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-teal-600 text-4xl font-black text-white">
                {doctor.doctorName.charAt(0)}
              </div>
            </div>
          </div>

          {/* Name & Actions */}
          <div className="pt-18 mt-16 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dr. {doctor.doctorName}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="spec-tag-light text-sm px-3 py-1">{doctor.specialization}</span>
                {doctor.occupation && doctor.occupation !== doctor.specialization && (
                  <span className="text-sm text-slate-500 font-medium">{doctor.occupation}</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                {doctor.age && <span>🎂 {doctor.age} years</span>}
                {doctor.gender && <span>• {doctor.gender}</span>}
                {doctor.roomId && <span>• 🚪 Room {doctor.roomId}</span>}
              </div>
            </div>

            {/* Rating + Favorite */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleFavorite}
                className={`p-3 rounded-xl transition-all ${isFav ? "bg-rose-50 text-rose-500 border border-rose-200" : "bg-slate-50 text-slate-400 border border-slate-200 hover:border-rose-300 hover:text-rose-400"}`}
                title={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                {isFav ? "❤️" : "🤍"}
              </button>
              {doctor.averageRating > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                  <span className="text-xl">⭐</span>
                  <span className="text-xl font-black text-amber-700">{doctor.averageRating}</span>
                  <span className="text-xs text-amber-600 font-bold">/5</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* About / Bio */}
          <div className="frost-card rounded-2xl p-7">
            <h3 className="text-xs font-black uppercase tracking-widest text-teal-600 mb-3">About</h3>
            <p className="text-slate-600 leading-relaxed">
              {doctor.bio || "Dr. " + doctor.doctorName + " is a qualified " + doctor.specialization + " specialist available for consultations."}
            </p>
          </div>

          {/* Qualifications */}
          {doctor.degrees && doctor.degrees.length > 0 && (
            <div className="frost-card rounded-2xl p-7">
              <h3 className="text-xs font-black uppercase tracking-widest text-teal-600 mb-4">Qualifications & Degrees</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {doctor.degrees.map((deg, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-lg">🎓</span>
                    <p className="text-sm font-semibold text-slate-700">{deg}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinic Info Card */}
          <div className="frost-card rounded-2xl p-7">
            <h3 className="text-xs font-black uppercase tracking-widest text-teal-600 mb-4">Clinic Information</h3>
            <div className="flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-2xl">
                🏥
              </div>
              <div className="flex-1">
                <p className="text-lg font-black text-slate-900">{doctor.clinicName}</p>
                <p className="text-sm text-slate-500 mt-0.5">{doctor.clinicAddress}</p>
                {doctor.distanceKm != null && (
                  <p className="text-sm font-bold text-teal-600 mt-2">📍 {doctor.distanceKm} km from your location</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Booking Sidebar */}
        <aside className="space-y-6">
          {/* Date Selection */}
          <div className="frost-card rounded-2xl p-6 shadow-xl ring-1 ring-slate-200/50">
            <h2 className="text-lg font-black text-slate-900 mb-4">📅 Book Appointment</h2>

            {/* Quick Date Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
              {nextDates.map((d) => {
                const dayObj = new Date(d);
                const isSelected = d === date;
                const dayName = dayObj.toLocaleDateString("en-IN", { weekday: "short" });
                const dayNum = dayObj.getDate();
                return (
                  <button
                    key={d}
                    onClick={() => setDate(d)}
                    className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                      isSelected
                        ? "bg-teal-600 text-white shadow-lg shadow-teal-200"
                        : "bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-700 border border-slate-200"
                    }`}
                  >
                    <span className="text-[10px]">{dayName}</span>
                    <span className="text-base">{dayNum}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom date picker */}
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="field text-sm"
            />

            {/* Slots */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700">
                  {slots.length > 0 ? `${slots.length} slots available` : "Available Slots"}
                </h3>
                {slotsLoading && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => bookSlot(slot)}
                    disabled={bookingSlot === slot}
                    className="relative group rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3 text-center transition-all hover:border-emerald-400 hover:bg-emerald-100 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                  >
                    <p className="text-sm font-bold text-emerald-800">{formatTime(slot)}</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5 group-hover:hidden">Available</p>
                    <p className="text-[10px] text-emerald-700 mt-0.5 hidden group-hover:block font-bold">Tap to book →</p>
                    {bookingSlot === slot && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {!slotsLoading && slots.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <div className="text-3xl mb-2">📅</div>
                  <p className="text-sm font-medium text-slate-500">No slots available</p>
                  <p className="text-xs text-slate-400 mt-1">Try selecting a different date</p>
                </div>
              )}
            </div>

            {message && (
              <div className="alert-error mt-4">
                <p className="text-sm font-bold">{message}</p>
              </div>
            )}

            {!session && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <p className="text-xs text-amber-700 font-semibold">
                  <Link to="/login" className="underline">Login</Link> to book an appointment
                </p>
              </div>
            )}
          </div>

          {/* Reviews Summary in sidebar */}
          {reviews.length > 0 && (
            <div className="frost-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800">Patient Reviews</h3>
                <span className="text-xs text-slate-400">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
              </div>
              {/* Average rating */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(star => {
                    const avg = reviews.reduce((s, r) => s + r.score, 0) / reviews.length;
                    return <svg key={star} className={`h-4 w-4 ${star <= Math.round(avg) ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
                  })}
                </div>
                <span className="text-sm font-bold text-slate-700">{(reviews.reduce((s, r) => s + r.score, 0) / reviews.length).toFixed(1)}</span>
              </div>
              {/* Latest reviews */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {reviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="border-t border-slate-100 pt-2">
                    <div className="flex items-center gap-0.5 mb-1">
                      {[1,2,3,4,5].map(star => (
                        <svg key={star} className={`h-3 w-3 ${star <= r.score ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                      ))}
                    </div>
                    {r.review && <p className="text-xs text-slate-600 line-clamp-2">{r.review}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default DoctorDetails;
