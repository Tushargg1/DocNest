import { useState, useEffect } from "react";
import api from "../services/api";

function RescheduleModal({ appointment, onClose, onSuccess }) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!date) return;
    const fetchSlots = async () => {
      setLoading(true);
      setError("");
      setSelectedSlot(null);
      try {
        const { data } = await api.get(
          `/appointments/doctor/${appointment.doctorUserId}/slots`,
          { params: { date } }
        );
        setSlots(data.availableSlots || []);
      } catch (err) {
        setError(err?.message || "Unable to fetch available slots");
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, [date, appointment.doctorUserId]);

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError("");
    try {
      await api.put(`/appointments/${appointment.appointmentId}/reschedule`, {
        newStartTime: selectedSlot,
      });
      onSuccess();
    } catch (err) {
      setError(err?.message || "Rescheduling failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="frost-card rounded-xl p-8 w-full max-w-md fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-teal-600 mb-1">
              Reschedule
            </p>
            <h3 className="text-xl font-black text-slate-900">
              Choose New Time
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost px-3 py-1 text-xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Date Picker */}
        <div className="mb-5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
            Select Date
          </label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="field w-full"
          />
        </div>

        {/* Available Slots */}
        {date && (
          <div className="mb-5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
              Available Slots
              {slots.length > 0 && (
                <span className="ml-2 text-teal-600 normal-case">
                  ({slots.length} available)
                </span>
              )}
            </label>

            {loading && (
              <div className="grid gap-2 grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="skeleton h-10 w-full rounded-lg" />
                ))}
              </div>
            )}

            {!loading && slots.length > 0 && (
              <div className="grid gap-2 grid-cols-3 max-h-48 overflow-y-auto">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg border-2 px-2 py-2 text-xs font-bold transition-all ${
                      selectedSlot === slot
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/50"
                    }`}
                  >
                    {formatTime(slot)}
                  </button>
                ))}
              </div>
            )}

            {!loading && slots.length === 0 && (
              <div className="text-center py-6 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-500">
                  No slots available
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Try a different date
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="alert-error mb-4">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn-ghost py-3 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSlot || submitting}
            className="flex-1 brand-btn py-3 text-sm font-bold disabled:opacity-50"
          >
            {submitting ? "Rescheduling..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RescheduleModal;
