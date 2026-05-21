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
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingSlot, setBookingSlot] = useState(null);

  // Payment state
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [consultationFee, setConsultationFee] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Fetch payment status and doctor fee
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      try {
        const { data } = await api.get("/payments/status");
        setPaymentEnabled(data.enabled);
      } catch {
        setPaymentEnabled(false);
      }

      if (doctorUserId) {
        try {
          const { data: profile } = await api.get(`/doctors/${doctorUserId}/profile`);
          setConsultationFee(profile.consultationFee || 500.0);
        } catch {
          setConsultationFee(500.0);
        }
      }
    };
    fetchPaymentInfo();
  }, [doctorUserId]);

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

  const handleSlotClick = (startTime) => {
    if (!session) {
      setMessage("Please login as a patient first.");
      return;
    }

    if (paymentEnabled && consultationFee > 0) {
      // Show payment confirmation step
      setSelectedSlot(startTime);
      setMessage("");
    } else {
      // Direct booking (payment disabled)
      bookSlot(startTime);
    }
  };

  const bookSlot = async (startTime) => {
    setBookingSlot(startTime);
    setMessage("");
    try {
      await api.post("/appointments/book", {
        doctorUserId: Number(doctorUserId),
        patientUserId: session.userId,
        clinicId: clinicId ? Number(clinicId) : null,
        startTime,
      });
      navigate("/patient/visits");
    } catch (err) {
      setMessage(err?.response?.data || "Booking failed. Slot may be taken.");
    } finally {
      setBookingSlot(null);
    }
  };

  const handlePayAndBook = async () => {
    if (!selectedSlot || !session) return;
    setPaymentProcessing(true);
    setMessage("");

    try {
      // Step 1: Book the appointment first to get an ID
      const { data: appointment } = await api.post("/appointments/book", {
        doctorUserId: Number(doctorUserId),
        patientUserId: session.userId,
        clinicId: clinicId ? Number(clinicId) : null,
        startTime: selectedSlot,
      });

      const appointmentId = appointment.appointmentId || appointment.id;

      // Step 2: Create payment order
      const { data: order } = await api.post("/payments/create-order", {
        appointmentId,
        amount: consultationFee,
      });

      // Step 3: Simulate Razorpay checkout (dev mode auto-complete)
      // In production, this would open the Razorpay checkout modal
      const stubPaymentId = "pay_" + Math.random().toString(36).substring(2, 16);
      const stubSignature = "sig_" + Math.random().toString(36).substring(2, 32);

      // Step 4: Verify payment
      await api.post("/payments/verify", {
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: stubPaymentId,
        razorpaySignature: stubSignature,
      });

      navigate("/patient/visits");
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.message || "Payment failed. Please try again.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch { return iso; }
  };

  if (!doctorUserId) {
    return (
      <div className="shell max-w-2xl py-20 text-center fade-up">
        <h1 className="section-title">Select a Doctor First</h1>
        <p className="mt-2 text-slate-500">Go back to nearby clinics and choose a doctor to book an appointment.</p>
        <Link to="/nearby" className="brand-btn inline-block mt-6 px-8 py-3">Browse Clinics</Link>
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

      {/* Consultation Fee Banner */}
      {paymentEnabled && consultationFee && (
        <div className="frost-card rounded-2xl p-4 mb-6 border-l-4 border-teal-400 fade-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Consultation Fee</p>
              <p className="text-2xl font-black text-slate-800 mt-1">
                INR {consultationFee.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1 rounded-full">
                Payment Required
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Date Selector */}
      <div className="frost-card rounded-2xl p-6 mb-6 fade-up stagger-1">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          Choose Date
        </h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Appointment Date</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => { setDate(e.target.value); setSelectedSlot(null); }}
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
          Available Time Slots
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
                onClick={() => handleSlotClick(slot)}
                disabled={bookingSlot === slot || paymentProcessing}
                className={`relative group rounded-xl border-2 p-3 text-center transition-all hover:-translate-y-0.5 disabled:opacity-60 ${
                  selectedSlot === slot
                    ? "border-teal-500 bg-teal-50 ring-2 ring-teal-200"
                    : "border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100"
                }`}
              >
                <p className="text-base font-bold text-emerald-800">{formatTime(slot)}</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {selectedSlot === slot ? "Selected" : "Tap to select"}
                </p>
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
            <p className="text-slate-500 font-medium">No slots available for selected date.</p>
            <p className="text-sm text-slate-400 mt-1">Try a different date or check back later.</p>
          </div>
        )}
      </div>

      {/* Payment Confirmation Section */}
      {selectedSlot && paymentEnabled && (
        <div className="frost-card rounded-2xl p-6 mb-6 fade-up border-2 border-teal-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Confirm and Pay</h2>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Selected Slot</span>
              <span className="text-sm font-bold text-slate-800">{formatTime(selectedSlot)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Date</span>
              <span className="text-sm font-bold text-slate-800">{new Date(date).toLocaleDateString("en-IN", { dateStyle: "long" })}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-bold text-slate-800">Total Amount</span>
              <span className="text-lg font-black text-teal-700">INR {consultationFee?.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedSlot(null)}
              className="brand-btn-outline px-5 py-3 text-sm flex-1"
              disabled={paymentProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handlePayAndBook}
              disabled={paymentProcessing}
              className="brand-btn px-5 py-3 text-sm flex-1 flex items-center justify-center gap-2"
            >
              {paymentProcessing ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Processing...
                </>
              ) : (
                `Pay INR ${consultationFee?.toFixed(2)} and Book`
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">
            Secure payment via Razorpay. Your slot will be confirmed after successful payment.
          </p>
        </div>
      )}
    </div>
  );
}

export default BookAppointment;
