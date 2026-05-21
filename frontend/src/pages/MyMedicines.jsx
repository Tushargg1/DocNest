import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function MyMedicines() {
  const { session } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("today"); // "today" | "all" | "past"

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [remindersRes, visitsRes] = await Promise.all([
        api.get("/medicine-reminders"),
        api.get(`/visits/patient/${session.userId}`),
      ]);
      setReminders(remindersRes.data || []);
      setVisits(visitsRes.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deactivateReminder = async (id) => {
    try {
      await api.put(`/medicine-reminders/${id}/deactivate`);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    }
  };

  // Helpers
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

  const getDaysElapsed = (reminder) => {
    const start = new Date(reminder.startDate);
    const today = new Date();
    return Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)));
  };

  const getTotalDays = (reminder) => {
    const start = new Date(reminder.startDate);
    const end = new Date(reminder.endDate);
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  };

  const getTimeSlots = (timesPerDay) => {
    if (timesPerDay >= 4) return ["Morning", "Afternoon", "Evening", "Night"];
    if (timesPerDay >= 3) return ["Morning", "Afternoon", "Evening"];
    if (timesPerDay === 2) return ["Morning", "Evening"];
    return ["Morning"];
  };

  const getNextPillTime = (timesPerDay) => {
    const now = new Date();
    const hour = now.getHours();
    if (timesPerDay >= 3) {
      if (hour < 9) return "Morning (8:00 AM)";
      if (hour < 14) return "Afternoon (1:00 PM)";
      if (hour < 21) return "Evening (8:00 PM)";
      return "Tomorrow Morning (8:00 AM)";
    }
    if (timesPerDay === 2) {
      if (hour < 9) return "Morning (8:00 AM)";
      if (hour < 21) return "Evening (8:00 PM)";
      return "Tomorrow Morning (8:00 AM)";
    }
    if (hour < 9) return "Morning (8:00 AM)";
    return "Tomorrow Morning (8:00 AM)";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", { dateStyle: "medium" });
    } catch {
      return dateStr;
    }
  };

  // Next visit reminders from visit records
  const upcomingRevisits = visits
    .filter((v) => v.revisitDate && new Date(v.revisitDate) >= new Date())
    .sort((a, b) => new Date(a.revisitDate) - new Date(b.revisitDate));

  const getCurrentTimeSlot = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  };

  if (loading) {
    return (
      <div className="shell max-w-4xl py-10">
        <div className="space-y-4">
          <div className="skeleton h-12 w-64" />
          <div className="skeleton h-40 w-full rounded-2xl" />
          <div className="skeleton h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="shell max-w-4xl py-10 fade-up">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Medication Tracker</p>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">My Medicines</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Track your ongoing medications, next pill times, and upcoming follow-up visits.
        </p>
      </div>

      {/* Next Pill Banner */}
      {reminders.length > 0 && (
        <div className="frost-card rounded-2xl p-5 mb-6 border-l-4 border-teal-500 fade-up">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/30">
              <svg className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Next Pill</p>
              <p className="text-lg font-black text-slate-900 dark:text-slate-100">
                {getNextPillTime(Math.max(...reminders.map((r) => r.timesPerDay)))}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {reminders.length} active medication{reminders.length !== 1 ? "s" : ""} to take
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Revisit Reminder */}
      {upcomingRevisits.length > 0 && (
        <div className="frost-card rounded-2xl p-5 mb-6 border-l-4 border-amber-400 fade-up">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Upcoming Follow-up</p>
              {upcomingRevisits.slice(0, 3).map((v) => (
                <div key={v.id} className="mt-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {formatDate(v.revisitDate)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {v.diagnosis ? `For: ${v.diagnosis}` : "Follow-up visit"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
        {[
          { id: "today", label: "Today's Schedule", count: reminders.length },
          { id: "all", label: "All Medications", count: reminders.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex-1 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
              view === tab.id
                ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-[10px] bg-teal-100 dark:bg-teal-800 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* No Meds State */}
      {reminders.length === 0 && (
        <div className="frost-card rounded-2xl p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Active Medications</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            When your doctor prescribes medications, they will appear here with reminders for each dose.
          </p>
        </div>
      )}

      {/* Today's Schedule View */}
      {view === "today" && reminders.length > 0 && (
        <div className="space-y-6 fade-up">
          {["Morning", "Afternoon", "Evening", "Night"].map((slot) => {
            const medsForSlot = reminders.filter((r) =>
              getTimeSlots(r.timesPerDay).includes(slot)
            );
            if (medsForSlot.length === 0) return null;

            const currentSlot = getCurrentTimeSlot();
            const isCurrentSlot = slot === currentSlot;
            const slotColors = {
              Morning: { bg: "bg-amber-50 dark:bg-amber-900/10", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400" },
              Afternoon: { bg: "bg-orange-50 dark:bg-orange-900/10", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-400" },
              Evening: { bg: "bg-indigo-50 dark:bg-indigo-900/10", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-400" },
              Night: { bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-200 dark:border-slate-700", text: "text-slate-700 dark:text-slate-400" },
            };
            const colors = slotColors[slot] || slotColors.Morning;

            return (
              <div key={slot} className={`frost-card rounded-2xl overflow-hidden ${isCurrentSlot ? "ring-2 ring-teal-300 dark:ring-teal-700" : ""}`}>
                {/* Slot Header */}
                <div className={`px-5 py-3 ${colors.bg} border-b ${colors.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${colors.text}`}>{slot}</span>
                    {isCurrentSlot && (
                      <span className="text-[10px] font-bold bg-teal-100 dark:bg-teal-800 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                        Now
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{medsForSlot.length} med{medsForSlot.length !== 1 ? "s" : ""}</span>
                </div>
                {/* Meds List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {medsForSlot.map((reminder) => (
                    <div key={reminder.id} className="px-5 py-4 flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/30">
                        <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{reminder.medicineName}</p>
                        {reminder.dosage && <p className="text-xs text-slate-500 dark:text-slate-400">{reminder.dosage}</p>}
                        <p className="text-[10px] text-slate-400 mt-1">
                          Day {getDaysElapsed(reminder) + 1} of {getTotalDays(reminder)} — {getDaysRemaining(reminder)} day{getDaysRemaining(reminder) !== 1 ? "s" : ""} left
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${getProgress(reminder)}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{getProgress(reminder)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All Medications View */}
      {view === "all" && reminders.length > 0 && (
        <div className="space-y-3 fade-up">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="frost-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/30">
                    <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{reminder.medicineName}</p>
                    {reminder.dosage && <p className="text-xs text-slate-500 mt-0.5">{reminder.dosage}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 font-semibold">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {reminder.frequency || "As directed"}
                      </span>
                      <span className="text-slate-400">
                        {formatDate(reminder.startDate)} — {formatDate(reminder.endDate)}
                      </span>
                    </div>
                    {/* Progress */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Day {getDaysElapsed(reminder) + 1} of {getTotalDays(reminder)}</span>
                        <span>{getDaysRemaining(reminder)} day{getDaysRemaining(reminder) !== 1 ? "s" : ""} remaining</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${getProgress(reminder)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deactivateReminder(reminder.id)}
                  className="shrink-0 text-xs font-bold text-slate-400 hover:text-rose-500 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                >
                  Stop
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyMedicines;
