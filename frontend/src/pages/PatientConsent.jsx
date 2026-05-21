import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import consentApi from "../services/consentApi";
import api from "../services/api";

function PatientConsent() {
  const { session } = useAuth();
  const [pending, setPending] = useState([]);
  const [active, setActive] = useState([]);
  const [doctorNames, setDoctorNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState("");
  const [durationHours, setDurationHours] = useState(24);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingRes, activeRes] = await Promise.all([
        consentApi.getPatientPending(),
        consentApi.getPatientActive(),
      ]);
      setPending(pendingRes.data || []);
      setActive(activeRes.data || []);

      // Fetch doctor names for all consent records
      const allConsents = [...(pendingRes.data || []), ...(activeRes.data || [])];
      const doctorIds = [...new Set(allConsents.map((c) => c.doctorId))];
      const names = { ...doctorNames };
      await Promise.all(
        doctorIds
          .filter((id) => !names[id])
          .map(async (id) => {
            try {
              const { data } = await api.get(`/users/${id}`);
              names[id] = data.fullName || `Doctor #${id}`;
            } catch {
              names[id] = `Doctor #${id}`;
            }
          })
      );
      setDoctorNames(names);
    } catch {
      setMessage("Failed to load consent data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (consentId) => {
    setActionLoading(consentId);
    setMessage("");
    try {
      await consentApi.approveConsent(consentId, durationHours);
      setMessage("Consent approved.");
      await loadData();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to approve.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (consentId) => {
    setActionLoading(consentId);
    setMessage("");
    try {
      await consentApi.denyConsent(consentId);
      setMessage("Consent denied.");
      await loadData();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to deny.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAll = async () => {
    setActionLoading("revoke-all");
    setMessage("");
    try {
      const { data } = await consentApi.revokeAll();
      setMessage(`Revoked ${data.revoked} consent(s).`);
      await loadData();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to revoke.");
    } finally {
      setActionLoading(null);
    }
  };

  const formatExpiry = (expiryTime) => {
    if (!expiryTime) return "N/A";
    try {
      const d = new Date(expiryTime);
      return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return expiryTime;
    }
  };

  const timeRemaining = (expiryTime) => {
    if (!expiryTime) return "";
    const now = new Date();
    const exp = new Date(expiryTime);
    const diff = exp - now;
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  };

  if (loading) {
    return (
      <div className="shell max-w-4xl py-10">
        <div className="skeleton h-10 w-64 mb-6" />
        <div className="skeleton h-32 w-full mb-4" />
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="shell max-w-4xl py-10 fade-up">
      <div className="mb-8">
        <p className="section-label">Privacy</p>
        <h1 className="page-title text-3xl mt-1">Consent Management</h1>
        <p className="text-slate-500 mt-2">
          Control which doctors can access your medical history. You can approve, deny, or revoke access at any time.
        </p>
      </div>

      {message && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-medium text-slate-700">{message}</p>
        </div>
      )}

      {/* Pending Requests */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Pending Requests</h2>
          {pending.length > 0 && (
            <span className="text-xs font-bold text-white bg-teal-600 px-2.5 py-1 rounded-full">
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="frost-card rounded-xl p-6 text-center">
            <p className="text-sm text-slate-500">No pending consent requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((consent) => (
              <div
                key={consent.id}
                className="frost-card rounded-xl p-5 border border-slate-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-800">
                      {doctorNames[consent.doctorId] || `Doctor #${consent.doctorId}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Requesting access to your medical history
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={durationHours}
                      onChange={(e) => setDurationHours(Number(e.target.value))}
                      className="field text-xs py-1.5 px-2 w-auto"
                    >
                      <option value={1}>1 hour</option>
                      <option value={6}>6 hours</option>
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours</option>
                      <option value={48}>48 hours</option>
                      <option value={72}>72 hours</option>
                    </select>
                    <button
                      onClick={() => handleApprove(consent.id)}
                      disabled={actionLoading === consent.id}
                      className="brand-btn px-4 py-2 text-xs"
                    >
                      {actionLoading === consent.id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleDeny(consent.id)}
                      disabled={actionLoading === consent.id}
                      className="btn-ghost px-4 py-2 text-xs text-red-600 hover:bg-red-50"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active Consents */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Active Access</h2>
          {active.length > 0 && (
            <button
              onClick={handleRevokeAll}
              disabled={actionLoading === "revoke-all"}
              className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
            >
              {actionLoading === "revoke-all" ? "Revoking..." : "Revoke All"}
            </button>
          )}
        </div>

        {active.length === 0 ? (
          <div className="frost-card rounded-xl p-6 text-center">
            <p className="text-sm text-slate-500">No active consents. Your records are private.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((consent) => (
              <div
                key={consent.id}
                className="frost-card rounded-xl p-5 border border-teal-100 bg-teal-50/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-800">
                      {doctorNames[consent.doctorId] || `Doctor #${consent.doctorId}`}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-teal-700 font-semibold">
                        {timeRemaining(consent.expiryTime)}
                      </span>
                      <span className="text-xs text-slate-400">
                        Expires: {formatExpiry(consent.expiryTime)}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-100 px-3 py-1.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default PatientConsent;
