import { useEffect, useState, useMemo } from "react";
import api from "../services/api";

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function formatWeekRange(startDate, endDate) {
  const s = new Date(startDate + "T00:00:00");
  const e = new Date(endDate + "T00:00:00");
  const sMonth = s.toLocaleDateString("en-IN", { month: "short" });
  const eMonth = e.toLocaleDateString("en-IN", { month: "short" });
  if (sMonth === eMonth) {
    return `${s.getDate()} - ${e.getDate()} ${sMonth} ${s.getFullYear()}`;
  }
  return `${s.getDate()} ${sMonth} - ${e.getDate()} ${eMonth} ${s.getFullYear()}`;
}

/**
 * DoctorWeekCalendar - Displays a doctor's weekly availability.
 *
 * Props:
 * - doctorUserId: (required) the doctor's user ID
 * - compact: (optional) if true, shows a simplified view (for patient-facing pages)
 * - onSlotClick: (optional) callback when a slot is clicked, receives slot info
 */
function DoctorWeekCalendar({ doctorUserId, compact = false, onSlotClick }) {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [selectedSlot, setSelectedSlot] = useState(null);

  const fetchSchedule = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/doctors/${doctorUserId}/schedule/week`, {
        params: { startDate: weekStart },
      });
      setSchedule(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load schedule");
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (doctorUserId) fetchSchedule();
  }, [doctorUserId, weekStart]);

  const goToPrevWeek = () => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const goToNextWeek = () => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const goToCurrentWeek = () => {
    setWeekStart(getMonday(new Date()));
  };

  const isCurrentWeek = useMemo(() => {
    return weekStart === getMonday(new Date());
  }, [weekStart]);

  const handleSlotClick = (slot, day) => {
    if (slot.status === "available" && onSlotClick) {
      onSlotClick(slot, day);
    } else if (slot.status === "booked" && slot.patientName) {
      setSelectedSlot(selectedSlot?.startTime === slot.startTime ? null : slot);
    }
  };

  if (loading) {
    return (
      <div className="frost-card rounded-2xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          <span className="ml-3 text-sm text-slate-500">Loading schedule...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="frost-card rounded-2xl p-6">
        <div className="alert-error">
          <p className="font-semibold text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!schedule) return null;

  // Compact view for patient-facing pages (day summary cards)
  if (compact) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Weekly Availability</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevWeek}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              aria-label="Previous week"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xs font-medium text-slate-600 px-2">
              {formatWeekRange(schedule.weekStart, schedule.weekEnd)}
            </span>
            <button
              onClick={goToNextWeek}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              aria-label="Next week"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Day summary cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {schedule.days.filter(d => d.dayName !== "Sun").map((day) => {
            const today = new Date().toISOString().slice(0, 10);
            const isToday = day.date === today;
            const isPast = day.date < today;

            return (
              <div
                key={day.date}
                className={`rounded-xl p-3 text-center border transition-all ${
                  day.onLeave
                    ? "bg-slate-50 border-slate-200 opacity-60"
                    : isPast
                    ? "bg-slate-50 border-slate-100 opacity-50"
                    : day.availableSlots > 0
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-slate-50 border-slate-200"
                } ${isToday ? "ring-2 ring-teal-400 ring-offset-1" : ""}`}
              >
                <p className={`text-[10px] font-bold uppercase ${isToday ? "text-teal-600" : "text-slate-500"}`}>
                  {day.dayName}
                </p>
                <p className={`text-sm font-bold mt-0.5 ${isToday ? "text-teal-700" : "text-slate-800"}`}>
                  {new Date(day.date + "T00:00:00").getDate()}
                </p>
                {day.onLeave ? (
                  <p className="text-[9px] text-slate-400 mt-1 font-medium">Leave</p>
                ) : isPast ? (
                  <p className="text-[9px] text-slate-400 mt-1">Past</p>
                ) : (
                  <p className={`text-[9px] mt-1 font-bold ${day.availableSlots > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                    {day.availableSlots > 0 ? `${day.availableSlots} open` : "Full"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Full week grid view (for doctor workspace)
  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {formatWeekRange(schedule.weekStart, schedule.weekEnd)}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Working hours: {schedule.workStart} - {schedule.workEnd} | {schedule.slotDurationMinutes} min slots
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            aria-label="Previous week"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {!isCurrentWeek && (
            <button
              onClick={goToCurrentWeek}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-600 border border-teal-200 hover:bg-teal-50 transition-colors"
            >
              Today
            </button>
          )}
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            aria-label="Next week"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-white border border-emerald-300"></span>
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-slate-300"></span>
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-slate-100 border border-dashed border-slate-300"></span>
          Past
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-slate-100" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(148,163,184,0.3) 2px, rgba(148,163,184,0.3) 4px)" }}></span>
          Leave
        </span>
      </div>

      {/* Desktop: Grid view */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="grid grid-cols-6 gap-1 mb-1">
            {schedule.days.filter(d => d.dayName !== "Sun").map((day) => {
              const today = new Date().toISOString().slice(0, 10);
              const isToday = day.date === today;
              return (
                <div
                  key={day.date}
                  className={`text-center py-2 rounded-lg ${isToday ? "bg-teal-50 border border-teal-200" : "bg-slate-50"}`}
                >
                  <p className={`text-[10px] font-bold uppercase ${isToday ? "text-teal-600" : "text-slate-500"}`}>
                    {day.dayName}
                  </p>
                  <p className={`text-sm font-bold ${isToday ? "text-teal-700" : "text-slate-800"}`}>
                    {formatDate(day.date)}
                  </p>
                  {day.onLeave && (
                    <span className="inline-block mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
                      On Leave
                    </span>
                  )}
                  {!day.onLeave && day.totalSlots > 0 && (
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {day.bookedSlots}/{day.totalSlots} booked
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Slot grid */}
          <div className="grid grid-cols-6 gap-1 max-h-[420px] overflow-y-auto pr-1">
            {schedule.days.filter(d => d.dayName !== "Sun").map((day) => (
              <div key={day.date} className="space-y-0.5">
                {day.onLeave ? (
                  <div
                    className="h-full min-h-[200px] rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center"
                    style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(148,163,184,0.08) 4px, rgba(148,163,184,0.08) 8px)" }}
                  >
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-400">Leave Day</p>
                      {day.leaveReason && (
                        <p className="text-[10px] text-slate-400 mt-1">{day.leaveReason}</p>
                      )}
                    </div>
                  </div>
                ) : day.slots.length === 0 ? (
                  <div className="h-full min-h-[200px] rounded-lg border border-slate-100 flex items-center justify-center">
                    <p className="text-[10px] text-slate-300">No slots</p>
                  </div>
                ) : (
                  day.slots.map((slot) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        onClick={() => handleSlotClick(slot, day)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] transition-all border ${
                          slot.status === "booked"
                            ? "bg-slate-200 border-slate-300 text-slate-600 hover:bg-slate-250"
                            : slot.status === "available"
                            ? "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                            : "bg-slate-50 border-slate-100 text-slate-400"
                        } ${isSelected ? "ring-2 ring-teal-400" : ""}`}
                        title={
                          slot.status === "booked" && slot.patientName
                            ? `Booked: ${slot.patientName}`
                            : slot.status === "available"
                            ? "Available"
                            : "Past"
                        }
                      >
                        <span className="font-bold">{formatTime(slot.startTime)}</span>
                        {slot.status === "booked" && slot.patientName && isSelected && (
                          <p className="text-[9px] mt-0.5 text-slate-700 font-medium truncate">{slot.patientName}</p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: Day list view */}
      <div className="md:hidden space-y-3">
        {schedule.days.filter(d => d.dayName !== "Sun").map((day) => {
          const today = new Date().toISOString().slice(0, 10);
          const isToday = day.date === today;
          const isPast = day.date < today;

          return (
            <details
              key={day.date}
              className={`rounded-xl border overflow-hidden ${
                isToday ? "border-teal-200 bg-teal-50/30" : "border-slate-200"
              }`}
              open={isToday}
            >
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`text-center ${isToday ? "text-teal-600" : "text-slate-600"}`}>
                    <p className="text-[10px] font-bold uppercase">{day.dayName}</p>
                    <p className="text-lg font-bold">{new Date(day.date + "T00:00:00").getDate()}</p>
                  </div>
                  <div>
                    {day.onLeave ? (
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        On Leave
                      </span>
                    ) : isPast ? (
                      <span className="text-xs text-slate-400">Past day</span>
                    ) : (
                      <span className={`text-xs font-bold ${day.availableSlots > 0 ? "text-emerald-600" : "text-slate-500"}`}>
                        {day.availableSlots} available / {day.totalSlots} total
                      </span>
                    )}
                  </div>
                </div>
                <svg className="h-4 w-4 text-slate-400 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>

              {!day.onLeave && day.slots.length > 0 && (
                <div className="px-4 pb-4 grid grid-cols-3 gap-1.5">
                  {day.slots.map((slot) => (
                    <button
                      key={slot.startTime}
                      onClick={() => handleSlotClick(slot, day)}
                      className={`px-2 py-2 rounded-lg text-center text-xs font-medium transition-all border ${
                        slot.status === "booked"
                          ? "bg-slate-200 border-slate-300 text-slate-600"
                          : slot.status === "available"
                          ? "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          : "bg-slate-50 border-slate-100 text-slate-400"
                      }`}
                    >
                      {formatTime(slot.startTime)}
                      {slot.status === "booked" && slot.patientName && (
                        <p className="text-[9px] mt-0.5 text-slate-500 truncate">{slot.patientName}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {day.onLeave && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-slate-500">
                    {day.leaveReason || "Doctor is on leave this day."}
                  </p>
                </div>
              )}
            </details>
          );
        })}
      </div>
    </div>
  );
}

export default DoctorWeekCalendar;
