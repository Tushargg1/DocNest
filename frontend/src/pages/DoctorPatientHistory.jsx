import { useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function DoctorPatientHistory() {
  const { session } = useAuth();
  const [patientUserId, setPatientUserId] = useState("");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.get(`/visits/doctor/${session.userId}/patient/${patientUserId}`);
      setHistory(data);
    } catch (err) {
      setError(err?.response?.data || "Unable to load history");
    } finally {
      setLoading(false);
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
        <button onClick={loadHistory} className="brand-btn px-4 py-2" disabled={loading || !patientUserId.trim()}>
          {loading ? "Loading..." : "Load History"}
        </button>
      </div>
      {error && <p className="mt-2 text-red-600">{error}</p>}

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
            <p className="mt-2"><span className="font-medium">Diagnosis:</span> {visit.diagnosis}</p>
            <p><span className="font-medium">Disease History:</span> {visit.diseaseHistory}</p>
            <p><span className="font-medium">Medications:</span> {visit.medications}</p>
          </article>
        ))}
        {!loading && history.length === 0 && !error && (
          <p className="text-sm text-slate-600">No records found for this patient ID.</p>
        )}
      </div>
    </div>
  );
}

export default DoctorPatientHistory;
