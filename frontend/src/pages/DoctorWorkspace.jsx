import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function DoctorWorkspace() {
  const { session } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientMedical, setPatientMedical] = useState(null);
  const [rxForm, setRxForm] = useState({
    diagnosis: "",
    medications: "",
    notes: "",
    revisitDate: "",
  });
  const [rxMsg, setRxMsg] = useState("");
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState("schedule");

  useEffect(() => {
    if (!session?.userId) return;
    const load = async () => {
      try {
        const { data } = await api.get(`/doctors/${session.userId}/dashboard`);
        setDashboard(data);
      } catch (err) {
        setStatus(err?.response?.data?.message || "Unable to load dashboard");
      }
    };
    load();
  }, [session?.userId]);

  const loadSchedule = async () => {
    try {
      const { data } = await api.get(`/appointments/doctor/${session.userId}`, {
        params: { date: scheduleDate },
      });
      setAppointments(data || []);
    } catch (err) {
      setStatus(err?.response?.data?.message || "Unable to load schedule");
    }
  };

  useEffect(() => {
    if (session?.userId && scheduleDate) loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.userId, scheduleDate]);

  const viewPatient = async (appt) => {
    // Store with appointmentId so prescription can be saved correctly
    setSelectedPatient({
      ...appt,
      appointmentId: appt.appointmentId || appt.id,
    });
    setRxForm({ diagnosis: "", medications: "", notes: "", revisitDate: "" });
    setRxMsg("");
    setPatientMedical(null);
    try {
      const { data } = await api.get(`/patients/profile/${appt.patientUserId}`);
      setPatientMedical(data);
    } catch {
      setPatientMedical({ note: "Medical history visible during active appointment only" });
    }
  };

  const submitPrescription = async (e) => {
    e.preventDefault();
    setRxMsg("");
    if (!selectedPatient?.appointmentId) {
      setRxMsg("error-no-appt");
      return;
    }
    try {
      await api.post("/visits", {
        appointmentId: selectedPatient.appointmentId,
        doctorUserId: session.userId,
        patientUserId: selectedPatient.patientUserId,
        visitDate: new Date().toISOString().slice(0, 10),
        diagnosis: rxForm.diagnosis,
        diseaseHistory: rxForm.notes,
        medications: rxForm.medications,
        revisitDate: rxForm.revisitDate || null,
        prescriptionPhotoUrl: null,
      });
      setRxMsg("success");
      // Refresh appointments
      loadSchedule();
    } catch (err) {
      setRxMsg("error");
    }
  };

  const getStatusClass = (s) => {
    if (s === "BOOKED") return "status-badge status-booked";
    if (s === "CANCELLED") return "status-badge status-cancelled";
    if (s === "COMPLETED") return "status-badge status-completed";
    return "status-badge status-pending";
  };

  const formatDateTime = (iso) => {
    try { return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
    catch { return iso; }
  };

  const tabs = [
    { id: "schedule", label: "📅 Today's Schedule" },
    { id: "patients", label: "👥 My Patients" },
  ];

  return (
    <div className="shell py-10 fade-up">
      {/* Page Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label">Doctor Portal</p>
          <h1 className="page-title text-4xl">Doctor Workspace</h1>
          <p className="mt-2 text-slate-500">View your schedule, patient records, and write prescriptions.</p>
        </div>
        {dashboard && (
          <div className={`status-badge text-sm px-4 py-2 ${dashboard.approvalStatus === "ACTIVE" ? "status-booked" : "status-pending"}`}>
            {dashboard.approvalStatus === "ACTIVE" ? "✓ Profile Live" : "⏳ Pending Approval"}
          </div>
        )}
      </div>

      {status && <div className="alert-error mb-6"><p className="font-semibold">{status}</p></div>}

      {/* Stat Cards */}
      {dashboard && (
        <div className="grid gap-4 sm:grid-cols-3 mb-8 fade-up stagger-1">
          <div className="frost-card-dark rounded-2xl p-6">
            <p className="text-xs font-black uppercase tracking-widest text-teal-400 mb-2">Clinic</p>
            <p className="text-lg font-bold text-white">{dashboard.clinicName || "Not assigned"}</p>
          </div>
          <div className="frost-card rounded-2xl p-6 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Upcoming</p>
            <p className="text-4xl font-black text-navy" style={{ color: "#0b1437" }}>
              {dashboard.upcomingAppointments?.length || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">appointments</p>
          </div>
          <div className="frost-card rounded-2xl p-6 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Patients Seen</p>
            <p className="text-4xl font-black text-teal-600">
              {dashboard.patients?.length || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">total</p>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200 pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all ${
                  activeTab === tab.id
                    ? "bg-white border border-b-white border-slate-200 text-teal-600 -mb-px"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Schedule Tab */}
          {activeTab === "schedule" && (
            <div className="frost-card rounded-2xl p-6">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="field max-w-[180px]"
                />
              </div>

              <div className="space-y-3">
                {appointments.map((appt) => (
                  <div
                    key={appt.appointmentId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-teal-200 transition-colors cursor-pointer"
                    onClick={() => viewPatient(appt)}
                  >
                    <div className="flex items-center gap-3">
                      {appt.tokenNumber && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black text-teal-300"
                          style={{ background: "linear-gradient(135deg, #0b1437, #0ea5a5)" }}>
                          {appt.tokenNumber}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-800">
                          Patient #{appt.patientUserId}
                        </p>
                        <p className="text-xs text-slate-500">{formatDateTime(appt.startTime)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={getStatusClass(appt.status)}>{appt.status}</span>
                      <button className="btn-ghost px-3 py-1.5 text-xs" onClick={(e) => { e.stopPropagation(); viewPatient(appt); }}>
                        View & Prescribe →
                      </button>
                    </div>
                  </div>
                ))}
                {appointments.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-slate-500">No appointments for {scheduleDate}</p>
                  </div>
                )}
              </div>

              {/* All Upcoming Summary */}
              {dashboard?.upcomingAppointments && dashboard.upcomingAppointments.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h3 className="font-black text-slate-900 mb-4">All Upcoming Appointments</h3>
                  <div className="space-y-2">
                    {dashboard.upcomingAppointments.slice(0, 5).map(appt => (
                      <div key={appt.appointmentId || appt.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <p className="font-bold text-sm">Patient #{appt.patientUserId}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(appt.startTime)}</p>
                        </div>
                        <span className="text-xs font-black uppercase text-teal-600 bg-teal-50 px-2 py-1 rounded">
                          Token {appt.tokenNumber || "—"}
                        </span>
                      </div>
                    ))}
                    {dashboard.upcomingAppointments.length > 5 && (
                      <p className="text-xs text-center text-slate-400 mt-2">+{dashboard.upcomingAppointments.length - 5} more upcoming</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Patients Tab */}
          {activeTab === "patients" && (
            <div className="frost-card rounded-2xl p-6">
              <p className="text-sm text-slate-500 mb-4 alert-info">
                🔒 Patient medical history is visible only for active appointments. Privacy is enforced by the system.
              </p>
              <div className="space-y-3">
                {dashboard?.patients?.map((patient) => (
                  <article key={patient.patientUserId} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">{patient.patientName}</p>
                        <p className="text-xs text-slate-500">
                          {patient.phoneNumber || "Phone hidden"} · {patient.pastVisits || 0} visits
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {patient.nextAppointmentTime && (
                          <span className="text-xs text-teal-600 font-semibold bg-teal-50 px-2 py-1 rounded-lg">
                            Next: {formatDateTime(patient.nextAppointmentTime)}
                          </span>
                        )}
                        <button
                          onClick={() => viewPatient({ patientUserId: patient.patientUserId, ...patient })}
                          className="btn-ghost px-3 py-1.5 text-xs"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {(!dashboard?.patients || dashboard.patients.length === 0) && (
                  <p className="text-center py-8 text-slate-400">No patient history yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Patient Detail + Prescription Panel */}
        <div className="lg:col-span-1">
          {selectedPatient ? (
            <div className="space-y-4">
              {/* Patient Info */}
              <div className="frost-card-dark rounded-2xl p-6">
                <p className="section-label text-teal-300 mb-3">Current Patient</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl font-black text-white">
                    {(selectedPatient.patientName || "P").charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-white">{selectedPatient.patientName || `Patient #${selectedPatient.patientUserId}`}</p>
                    <p className="text-xs text-white/50">{selectedPatient.phoneNumber || "Phone on file"}</p>
                  </div>
                </div>

                {/* Medical History (only during active appointment) */}
                {patientMedical && !patientMedical.note && (
                  <div className="space-y-3 border-t border-white/10 pt-4">
                    <p className="text-xs font-black uppercase tracking-widest text-teal-400">Medical History</p>
                    {patientMedical.allergies && (
                      <div className="bg-rose-500/20 rounded-xl p-3">
                        <p className="text-[10px] font-black uppercase text-rose-300 mb-1">⚠️ Allergies</p>
                        <p className="text-sm text-white">{patientMedical.allergies}</p>
                      </div>
                    )}
                    {patientMedical.bloodGroup && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50">Blood Group:</span>
                        <span className="font-bold text-teal-300">{patientMedical.bloodGroup}</span>
                      </div>
                    )}
                    {patientMedical.medicalHistory && (
                      <div>
                        <p className="text-xs text-white/50 mb-1">Clinical Notes</p>
                        <p className="text-sm text-white/80">{patientMedical.medicalHistory}</p>
                      </div>
                    )}
                  </div>
                )}

                {patientMedical?.note && (
                  <p className="text-xs text-white/50 mt-3 italic">{patientMedical.note}</p>
                )}

                <button
                  onClick={() => setSelectedPatient(null)}
                  className="mt-4 btn-ghost w-full py-2 text-xs"
                >
                  Dismiss
                </button>
              </div>

              {/* Prescription Form */}
              <div className="frost-card rounded-2xl p-6">
                <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                  <span>📝</span> Write Prescription
                </h3>
                <form onSubmit={submitPrescription} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Diagnosis *</label>
                    <input
                      value={rxForm.diagnosis}
                      onChange={(e) => setRxForm({ ...rxForm, diagnosis: e.target.value })}
                      placeholder="Enter diagnosis"
                      className="field"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Medications *</label>
                    <textarea
                      value={rxForm.medications}
                      onChange={(e) => setRxForm({ ...rxForm, medications: e.target.value })}
                      placeholder="Drug name, dosage, frequency..."
                      className="field h-24"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Additional Notes</label>
                    <textarea
                      value={rxForm.notes}
                      onChange={(e) => setRxForm({ ...rxForm, notes: e.target.value })}
                      placeholder="Rest, diet, activity restrictions..."
                      className="field h-20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">
                      Revisit Date (if required)
                    </label>
                    <input
                      type="date"
                      value={rxForm.revisitDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setRxForm({ ...rxForm, revisitDate: e.target.value })}
                      className="field"
                    />
                    <p className="text-xs text-slate-400 mt-1">Patient will be reminded 1 day before this date to book a follow-up.</p>
                  </div>

                  {rxMsg === "error-no-appt" && (
                    <div className="alert-error">
                      <p className="font-bold text-sm">⚠️ Select a patient from the schedule (not just the patients tab) to write a prescription. The appointment ID is required.</p>
                    </div>
                  )}
                  {rxMsg === "success" && (
                    <div className="alert-success">
                      <p className="font-bold text-sm">✓ Prescription saved! Patient will receive a reminder if revisit date is set.</p>
                    </div>
                  )}
                  {rxMsg === "error" && (
                    <div className="alert-error">
                      <p className="font-bold text-sm">Failed to save prescription. Please try again.</p>
                    </div>
                  )}

                  <button type="submit" className="brand-btn w-full py-3 text-sm font-bold">
                    Save Prescription
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="frost-card rounded-2xl p-8 text-center">
              <div className="text-4xl mb-4">👨‍⚕️</div>
              <p className="font-bold text-slate-700">Select a patient</p>
              <p className="text-sm text-slate-400 mt-1">Click on an appointment from the schedule to view patient details and write a prescription.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoctorWorkspace;
