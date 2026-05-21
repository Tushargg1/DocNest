import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const STORAGE_KEY = "health-intake-reminder";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A popup notification that reminds patients to complete their medical history intake.
 * Shows once per week if the patient hasn't completed the health profile yet.
 * Dismisses for 7 days on close.
 */
function HealthIntakeReminder() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [hasProfile, setHasProfile] = useState(null);

  useEffect(() => {
    if (!session || session.role !== "PATIENT") return;

    // Check if dismissed recently
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const dismissedAt = Number(stored);
      if (Date.now() - dismissedAt < SEVEN_DAYS_MS) {
        return; // Dismissed within last 7 days
      }
    }

    // Check if patient has already completed the health profile
    const checkProfile = async () => {
      try {
        const { data } = await api.get(`/intake/status`);
        // If completed, don't show
        if (data?.completed) {
          setHasProfile(true);
          return;
        }
        setHasProfile(false);
      } catch {
        // If endpoint doesn't exist or fails, check patient profile directly
        try {
          const { data: profile } = await api.get(`/patients/${session.userId}/profile`);
          if (profile?.medicalHistory || profile?.allergies || profile?.bloodGroup) {
            setHasProfile(true);
            return;
          }
          setHasProfile(false);
        } catch {
          // If both fail, show the reminder anyway (be safe)
          setHasProfile(false);
        }
      }
    };

    checkProfile();
  }, [session]);

  useEffect(() => {
    if (hasProfile === false) {
      // Small delay so it doesn't flash immediately on page load
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasProfile]);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const goToIntake = () => {
    dismiss();
    navigate("/intake");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-slide-up">
      <div className="frost-card rounded-2xl p-5 shadow-xl border border-teal-100 dark:border-teal-800">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/30">
            <svg className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Complete Your Medical Profile
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Help doctors treat you better by answering a few quick health questions. Takes only 2-3 minutes.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={dismiss}
            className="flex-1 btn-ghost py-2.5 text-xs font-bold"
          >
            Remind Later
          </button>
          <button
            onClick={goToIntake}
            className="flex-1 brand-btn py-2.5 text-xs font-bold"
          >
            Start Now
          </button>
        </div>

        {/* Subtle info */}
        <p className="text-[10px] text-slate-400 text-center mt-3">
          Private and secure. Shared with doctors only during appointments.
        </p>
      </div>
    </div>
  );
}

export default HealthIntakeReminder;
