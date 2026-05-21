import { useState } from "react";
import api from "../services/api";
import consentApi from "../services/consentApi";
import { useAuth } from "../context/AuthContext";

function DoctorPatientHistory() {
  const { session } = useAuth();
  const [patientUserId, setPatientUserId] = useState("");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [consentStatus, setConsentStatus] = useState(null); // "ACTIVE" | "PENDING" | "NONE"
  const [requestingConsent, setRequestingConsent] = useState(false);

  const checkConsentAndLoad = async () => {
    setError("");
    setHistory([]);
    setConsentStatus(null);
    setLoading(true);
    try {
      // First check consent status
      const { data: consentData } = await consentApi.checkConsent(Number(patientUserId));
      setConsentStatus(consentData.status);

      if (consentData.status === "ACTIVE") {
        // Load history if consent is active
        const { data } = await api.get(`/visits/doctor/${session.userId}/patient/${patientUserId}`);
        setHistory(data);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || "Unable to load history";
      if (err?.response?.status === 403) {
        setConsentStatus("NONE");
      } else {
        setError(typeof msg === "string" ? msg : "Unable to load history");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestConsent = async () => {
    setRequestingConsent(true);
    setError("");
    try {
      await consentApi.requestConsent(Number(patientUserId));
      setConsentStatus("PENDING");
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data || "Failed to request consent");
    } finally {
      setRequestingConsent(false);
    }
  };

  return (
    <div className="shell max-w-5xl py-10 fade-up">
      <h1 className="text-2xl font-bold">Doctor View: Patient History</h1>
      <div className="mt-4 flex gap-3">
        <input
          value={patientUserId}
          onChange={(e) => setPatientUserId(e.target.value)}
          placeholder="Patient User ID"
          className="field max-w-xs"
        />
        <button
          onClick={checkConsentAndLoad}
          className="brand-btn px-4 py-2"
          disabled={loading || !patientUserId.trim()}
        >
          {loading ? "Loading..." : "Load History"}
        </button>
      </div>
      {error && <p className="mt-2 text-red-600">{error}</p>}

      {/* Consent States */}
      {consentStatus === "NONE" && !loading && (
        <div className="mt-6 frost-card rounded-xl p-8 text-center border border-slate-200">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800">Access Restricted</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            You need the patient's consent to view their medical history.
            Request access and the patient will be notified.
          </p>
          <button
            onClick={handleRequestConsent}
            disabled={requestingConsent}
            className="brand-btn px-6 py-2.5 mt-5 text-sm"
          >
            {requestingConsent ? "Requesting..." : "Request Access"}
          </button>
        </div>
      )}

      {consentStatus === "PENDING" && !loading && (
        <div className="mt-6 frost-card rounded-xl p-8 text-center border border-slate-200">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
            <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800">Consent Pending</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Your access request has been sent to the patient.
            You will be able to view their history once they approve.
          </p>
          <span className="inline-flex items-center gap-2 mt-4 text-xs font-bold text-amber-700 bg-amber-100 px-4 py-2 rounded-full">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Waiting for approval
          </span>
        </div>
      )}

      {/* Medical History — shown only if consent is ACTIVE */}
      {consentStatus === "ACTIVE" && (
        <div className="mt-6 space-y-4">
          {loading && (
            <>
              <div className="skeleton h-28 w-full" />
              <div className="skeleton h-28 w-full" />
            </>
          )}
          {history.map((visit) => (
            <article key={visit.id} className="frost-card rounded-xl p-4">
              <p className="text-sm text-slate-500">Visit Date: {visit.visitDate}</p>
              <p className="mt-2">
                <span className="font-medium">Diagnosis:</span> {visit.diagnosis}
              </p>
              <p>
                <span className="font-medium">Disease History:</span> {visit.diseaseHistory}
              </p>
              <p>
                <span className="font-medium">Medications:</span> {visit.medications}
              </p>
            </article>
          ))}
          {!loading && history.length === 0 && !error && (
            <p className="text-sm text-slate-600">No records found for this patient ID.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default DoctorPatientHistory;
