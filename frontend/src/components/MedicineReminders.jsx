import { useEffect, useState } from "react";
import api from "../services/api";

function MedicineReminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" or "schedule"

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const { data } = await api.get("/medicine-reminders");
      setReminders(data || []);
    } catch {
      // silently fail — section is optional
    } finally {
      setLoading(false);
    }
  };

  const deactivateReminder = async (id) => {
    try {
      await api.put(`/medicine-reminders/${id}/deactivate`);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    }
  };

  const getProgress = (reminder) => {
    const start = new Date(reminder.startDate);
    const end = new Date(reminder.endDate);
    const today = new Date();
    const totalDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
    const elapsed = Math.max(0, (today - start) / (1000 * 60 * 60 * 24));
    return Math.min(100, Math.round((elapsed / totalDays) * 100));
  };

  const getDaysRemaining = (reminder) => {
    const end = new Date(reminder.endDate);
    const today = new Date();
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getTimeSlots = (timesPerDay) => {
    if (timesPerDay >= 3) return ["Morning", "Afternoon", "Evening"];
    if (timesPerDay === 2) return ["Morning", "Evening"];
    return ["Morning"];
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", { dateStyle: "medium" });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <section className="mb-8">
        <div className="skeleton h-32 w-full rounded-2xl" />
      </section>
    );
  }

  if (reminders.length === 0) {
    return (
      <section className="mb-8">
        <div className="frost-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
              <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900">Medicine Reminders</h3>
          </div>
          <p className="text-sm text-slate-400">No active medications</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="frost-card rounded-2xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
              <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Medicine Reminders</h3>
              <p className="text-xs text-slate-400">{reminders.length} active medication{reminders.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          {/* View Toggle */}
          <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                view === "list" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView("schedule")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                view === "schedule" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"
              }`}
            >
              Schedule
            </button>
          </div>
        </div>

        {/* List View */}
        {view === "list" && (
          <div className="space-y-3">
            {reminders.map((reminder) => {
              const progress = getProgress(reminder);
              const daysLeft = getDaysRemaining(reminder);
              return (
                <div
                  key={reminder.id}
                  className="border border-slate-100 rounded-xl p-4 hover:border-teal-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                          Active
                        </span>
                        <p className="font-bold text-slate-900 text-sm truncate">
                          {reminder.medicineName}
                        </p>
                      </div>
                      {reminder.dosage && (
                        <p className="text-xs text-slate-500 mt-1">{reminder.dosage}</p>
                      )}
                      <p className="text-xs text-teal-600 font-medium mt-1">
                        Take {reminder.frequency?.toLowerCase() || "as directed"}
                      </p>
                    </div>
                    <button
                      onClick={() => deactivateReminder(reminder.id)}
                      className="shrink-0 text-xs font-bold text-slate-400 hover:text-rose-500 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Stop this medication early"
                    >
                      Stop
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>{progress}% complete</span>
                      <span>{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Ends {formatDate(reminder.endDate)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Schedule View */}
        {view === "schedule" && (
          <div className="space-y-4">
            {["Morning", "Afternoon", "Evening"].map((slot) => {
              const medsForSlot = reminders.filter((r) => {
                const slots = getTimeSlots(r.timesPerDay);
                return slots.includes(slot);
              });

              if (medsForSlot.length === 0) return null;

              const slotIcons = {
                Morning: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ),
                Afternoon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ),
                Evening: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ),
              };

              const slotColors = {
                Morning: "bg-amber-50 text-amber-600 border-amber-100",
                Afternoon: "bg-orange-50 text-orange-600 border-orange-100",
                Evening: "bg-indigo-50 text-indigo-600 border-indigo-100",
              };

              return (
                <div key={slot}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${slotColors[slot]}`}>
                      {slotIcons[slot]}
                      {slot}
                    </span>
                  </div>
                  <div className="space-y-2 pl-2 border-l-2 border-slate-100 ml-3">
                    {medsForSlot.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-teal-300 bg-teal-50">
                          <span className="h-2 w-2 rounded-full bg-teal-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {reminder.medicineName}
                          </p>
                          {reminder.dosage && (
                            <p className="text-xs text-slate-400">{reminder.dosage}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide shrink-0">
                          {getDaysRemaining(reminder)}d left
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default MedicineReminders;
