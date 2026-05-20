import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function BookAppointment() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const doctorUserId = params.get("doctorUserId");
  const initialClinicId = params.get("clinicId") || "";

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [clinicId, setClinicId] = useState(initialClinicId);
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [message, setMessage] = useState("");
  const [bookedToken, setBookedToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingSlot, setBookingSlot] = useState(null);

  const loadMyAppointments = async () => {
    if (!session?.userId) return;
    try {
      const { data } = await api.get(`/appointments/patient/${session.userId}`);
      setAppointments(data || []);
    } catch (_err) { /* non-blocking */ }
  };

  const fetchSlots = async () => {
    if (!doctorUserId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/appointments/doctor/${doctorUserId}/slots`, {
        params: { date },
      });
      setSlots(data.availableSlots || []);
    } catch (err) {
      setMessage(err?.response?.data || "Unable to fetch available slots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorUserId, date]);

  useEffect(() => {
    loadMyAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.userId]);

  const bookSlot = async (startTime) => {
    if (!session) {
      setMessage("Please login as a patient first.");
      return;
    }
    setBookingSlot(startTime);
    setMessage("");
    try {
      const { data } = await api.post("/appointments/book", {
        doctorUserId: Number(doctorUserId),
        patientUserId: session.userId,
        clinicId: clinicId ? Number(clinicId) : null,
        startTime,
      });
      // Redirect to the new dedicated Patient Dashboard
      navigate("/patient/visits");
    } catch (err) {
      setMessage(err?.response?.data || "Booking failed. Slot may be taken.");
    } finally {
      setBookingSlot(null);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      await api.patch(`/appointments/${appointmentId}/cancel`);
      setMessage("Appointment cancelled successfully.");
      loadMyAppointments();
      fetchSlots();
    } catch (err) {
      setMessage(err?.response?.data || "Unable to cancel appointment");
    }
  };

  const getStatusClass = (status) => {
    if (status === "BOOKED") return "status-badge status-booked";
    if (status === "CANCELLED") return "status-badge status-cancelled";
    if (status === "COMPLETED") return "status-badge status-completed";
    return "status-badge status-pending";
  };

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch { return iso; }
  };

  const formatDateTime = (iso) => {
    try {
      return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    } catch { return iso; }
  };

  if (!doctorUserId) {
    return (
      <div className="shell max-w-2xl py-20 text-center fade-up">
        <div className="text-5xl mb-4">🏥</div>
        <h1 className="section-title">Select a Doctor First</h1>
        <p className="mt-2 text-slate-500">Go back to nearby clinics and choose a doctor to book an appointment.</p>
        <Link to="/nearby" className="brand-btn inline-block mt-6 px-8 py-3">Browse Clinics →</Link>
      </div>
    );
  }

  return (
    <div className="shell max-w-4xl py-10 fade-up">
      {/* Page Header */}
      <div className="mb-8">
        <p className="section-label">Appointment System</p>
        <h1 className="page-title text-4xl">Book Your Slot</h1>
        <p className="mt-2 text-slate-500">
          Select a date and available time slot. Your slot is locked for you once booked.
        </p>
      </div>

      {message && (
        <div className={`mb-4 ${message.toLowerCase().includes("failed") || message.toLowerCase().includes("taken") ? "alert-error" : "alert-success"}`}>
          <p className="font-semibold text-sm">{message}</p>
        </div>
      )}

      {/* Date Selector */}
      <div className="frost-card rounded-2xl p-6 mb-6 fade-up stagger-1">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>📅</span> Choose Date
        </h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Appointment Date</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="field max-w-xs"
            />
          </div>
          {!initialClinicId && (
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Clinic ID</label>
              <input
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
                placeholder="Enter Clinic ID"
                className="field max-w-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* Available Slots */}
      <div className="frost-card rounded-2xl p-6 mb-6 fade-up stagger-2">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>🕐</span> Available Time Slots
          {slots.length > 0 && (
            <span className="ml-auto text-sm font-semibold text-teal-600 bg-teal-50 px-3 py-0.5 rounded-full">
              {slots.length} available
            </span>
          )}
        </h2>

        {loading && (
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}
          </div>
        )}

        {!loading && slots.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => bookSlot(slot)}
                disabled={bookingSlot === slot}
                className="relative group rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3 text-center transition-all hover:border-emerald-400 hover:bg-emerald-100 hover:-translate-y-0.5 disabled:opacity-60"
              >
                <p className="text-base font-bold text-emerald-800">{formatTime(slot)}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Tap to book</p>
                {bookingSlot === slot && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                    <svg className="h-5 w-5 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {!loading && slots.length === 0 && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-slate-500 font-medium">No slots available for selected date.</p>
            <p className="text-sm text-slate-400 mt-1">Try a different date or check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookAppointment;
