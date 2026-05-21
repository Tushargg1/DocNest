import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import QRScanner from "../components/QRScanner";

function DoctorWorkspace() {
  const { session } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientMedical, setPatientMedical] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
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
    { id: "schedule", label: "Today's Schedule" },
    { id: "patients", label: "My Patients" },
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
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowScanner(true)}
            className="brand-btn px-4 py-2 text-xs flex items-center gap-2"
          >
            Scan Patient QR
          </button>
          {dashboard && (
            <div className={`status-badge text-sm px-4 py-2 ${dashboard.approvalStatus === "ACTIVE" ? "status-booked" : "status-pending"}`}>
              {dashboard.approvalStatus === "ACTIVE" ? "Active" : "Pending Approval"}
            </div>
          )}
        </div>
      </div>

      {status && <div className="alert-error mb-6"><p className="font-semibold">{status}</p></div>}

      {/* Stat Cards */}
      {dashboard && (
        <div className="grid gap-4 sm:grid-cols-3 mb-8 fade-up stagger-1">
          <div className="frost-card rounded-2xl p-6 border border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Clinic</p>
            <p className="text-lg font-bold text-slate-800">{dashboard.clinicName || "Not assigned"}</p>
          </div>
          <div className="frost-card rounded-2xl p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Upcoming</p>
            <p className="text-4xl font-bold text-slate-800">
              {dashboard.upcomingAppointments?.length || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">appointments</p>
          </div>
          <div className="frost-card rounded-2xl p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Patients Seen</p>
            <p className="text-4xl font-bold text-teal-600">
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
                {appointments.map((appt) => {
                  const pat = (dashboard?.patients || []).find(p => p.patientUserId === appt.patientUserId);
                  return (
                  <div
                    key={appt.appointmentId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-teal-200 transition-colors cursor-pointer"
                    onClick={() => viewPatient({ ...appt, patientName: pat?.patientName, phoneNumber: pat?.phoneNumber })}
                  >
                    <div className="flex items-center gap-3">
                      {appt.tokenNumber && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-xs font-bold text-teal-700">
                          {appt.tokenNumber}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-800">
                          {pat?.patientName || `Patient #${appt.patientUserId}`}
                        </p>
                        <p className="text-xs text-slate-500">{pat?.phoneNumber ? pat.phoneNumber + " · " : ""}{formatDateTime(appt.startTime)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={getStatusClass(appt.status)}>{appt.status}</span>
                      <button className="btn-ghost px-3 py-1.5 text-xs" onClick={(e) => { e.stopPropagation(); viewPatient({ ...appt, patientName: pat?.patientName, phoneNumber: pat?.phoneNumber }); }}>
                        View & Prescribe →
                      </button>
                    </div>
                  </div>
                  );
                })}
                {appointments.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-500">No appointments for {scheduleDate}</p>
                  </div>
                )}
              </div>

              {/* All Upcoming Summary */}
              {dashboard?.upcomingAppointments && dashboard.upcomingAppointments.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h3 className="font-semibold text-slate-900 mb-4">All Upcoming Appointments</h3>
                  <div className="space-y-2">
                    {dashboard.upcomingAppointments.slice(0, 5).map(appt => {
                      const pat = (dashboard?.patients || []).find(p => p.patientUserId === appt.patientUserId);
                      return (
                      <div key={appt.appointmentId || appt.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <p className="font-bold text-sm">{pat?.patientName || `Patient #${appt.patientUserId}`}</p>
                          <p className="text-xs text-slate-500">{pat?.phoneNumber ? pat.phoneNumber + " · " : ""}{formatDateTime(appt.startTime)}</p>
                        </div>
                        <span className="text-xs font-semibold uppercase text-teal-600 bg-teal-50 px-2 py-1 rounded">
                          Token {appt.tokenNumber || "—"}
                        </span>
                      </div>
                      );
                    })}
                    {dashboard.upcomingAppointments.length > 5 && (
                      <p className="text-xs text-center text-slate-400 mt-2">+{dashboard.upcomingAppointments.length - 5} more upcoming</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Patients Tab — Today's patients only */}
          {activeTab === "patients" && (
            <div className="frost-card rounded-2xl p-6">
              <p className="text-sm text-slate-500 mb-4 alert-info">
                Only today's patients are shown. Medical history is visible only during active appointments. Previous days' records are cleared for privacy.
              </p>
              <div className="space-y-3">
                {(() => {
                  // Use the schedule appointments (already filtered by scheduleDate which defaults to today)
                  const todayAppts = appointments.filter(a => a.status === "BOOKED" || a.status === "ATTENDED");
                  
                  if (todayAppts.length === 0) {
                    return <p className="text-center py-8 text-slate-400">No patients scheduled for today.</p>;
                  }

                  return todayAppts.map((appt) => {
                    const pat = (dashboard?.patients || []).find(p => p.patientUserId === appt.patientUserId);
                    return (
                    <article key={appt.appointmentId} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{pat?.patientName || `Patient #${appt.patientUserId}`}</p>
                          <p className="text-xs text-slate-500">{pat?.phoneNumber || "—"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`status-badge text-[10px] ${appt.status === "BOOKED" ? "status-booked" : "status-completed"}`}>{appt.status}</span>
                          <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">
                            {appt.startTime ? new Date(appt.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <span className="text-slate-400 font-bold">Rx:</span>{" "}
                          <span className="text-slate-700">{pat?.lastDiagnosis || "Not yet prescribed"}</span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <span className="text-slate-400 font-bold">Meds:</span>{" "}
                          <span className="text-slate-700">{pat?.lastMedications || "—"}</span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <span className="text-slate-400 font-bold">Token:</span>{" "}
                          <span className="text-slate-700">{appt.tokenNumber || "—"}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => viewPatient({ ...appt, patientName: pat?.patientName, phoneNumber: pat?.phoneNumber })}
                          className="btn-ghost px-3 py-1.5 text-xs"
                        >
                          View & Prescribe →
                        </button>
                      </div>
                    </article>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Patient Detail + Prescription Panel */}
        <div className="lg:col-span-1">
          {selectedPatient ? (
            <div className="space-y-4">
              {/* Patient Info */}
              <div className="frost-card rounded-2xl p-6 border border-slate-200 bg-slate-50">
                <p className="section-label text-teal-600 mb-3">Current Patient</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-xl font-bold text-teal-700">
                    {(selectedPatient.patientName || "P").charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{selectedPatient.patientName || `Patient #${selectedPatient.patientUserId}`}</p>
                    <p className="text-xs text-slate-500">{selectedPatient.phoneNumber || "Phone on file"}</p>
                  </div>
                </div>

                {/* Medical History (only during active appointment) */}
                {patientMedical && !patientMedical.note && (
                  <div className="space-y-3 border-t border-slate-200 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Medical History</p>
                    {patientMedical.allergies && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                        <p className="text-[10px] font-semibold uppercase text-red-600 mb-1">Allergies</p>
                        <p className="text-sm text-red-800">{patientMedical.allergies}</p>
                      </div>
                    )}
                    {patientMedical.currentMedications && (
                      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3">
                        <p className="text-[10px] font-semibold uppercase text-slate-600 mb-1">Current Medications</p>
                        <p className="text-sm text-slate-800">{patientMedical.currentMedications}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 flex-wrap">
                      {patientMedical.bloodGroup && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Blood:</span>
                          <span className="font-bold text-teal-600">{patientMedical.bloodGroup}</span>
                        </div>
                      )}
                      {patientMedical.age && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Age:</span>
                          <span className="font-bold text-slate-800">{patientMedical.age}</span>
                        </div>
                      )}
                      {patientMedical.weight && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Weight:</span>
                          <span className="font-bold text-slate-800">{patientMedical.weight} kg</span>
                        </div>
                      )}
                    </div>
                    {/* Structured disease history */}
                    {patientMedical.medicalHistory && (() => {
                      const raw = patientMedical.medicalHistory;
                      let records = [];
                      try {
                        const p = raw.trim().startsWith("[") ? JSON.parse(raw) : null;
                        if (Array.isArray(p)) records = p;
                      } catch { /* not JSON */ }

                      if (records.length > 0) {
                        return (
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-slate-500 mb-2">Past Conditions ({records.length})</p>
                            <div className="space-y-2">
                              {records.map((rec, i) => {
                                const statusText = (rec.status || "").trim().toLowerCase();
                                let tagColor = "bg-red-50 border border-red-200 text-red-700";
                                let tagLabel = "Ongoing";
                                if (statusText && !statusText.includes("ongoing") && !statusText.includes("still") && !statusText.includes("active")) {
                                  const dateMatch = statusText.match(/(\d{4})/);
                                  if (dateMatch && new Date().getFullYear() - parseInt(dateMatch[1]) > 1) {
                                    tagColor = "bg-slate-50 border border-slate-200 text-slate-600";
                                    tagLabel = "Resolved";
                                  } else {
                                    tagColor = "bg-slate-100 border border-slate-200 text-slate-700";
                                    tagLabel = "Recent";
                                  }
                                }
                                return (
                                  <div key={i} className="rounded-lg bg-white border border-slate-200 p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="font-bold text-slate-800 text-sm">{rec.diseaseName || "Unknown"}</p>
                                      <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${tagColor}`}>{tagLabel}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-slate-600">
                                      {rec.startedWhen && <p>Detected: {rec.startedWhen}</p>}
                                      {rec.status && !rec.status.toLowerCase().includes("ongoing") && <p>Ended: {rec.status}</p>}
                                      {(rec.medications || rec.medicineName) && <p className="col-span-2">Meds: {rec.medications || rec.medicineName}</p>}
                                      {rec.hospital && <p>Hospital: {rec.hospital}</p>}
                                      {rec.doctorName && <p>Doctor: {rec.doctorName}</p>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Fallback: plain text
                      return (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Clinical Notes</p>
                          <p className="text-sm text-slate-700">{raw}</p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {patientMedical?.note && (
                  <p className="text-xs text-slate-500 mt-3 italic">{patientMedical.note}</p>
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
                <h3 className="font-bold text-slate-900 mb-4">
                  Write Prescription
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
                      <p className="font-semibold text-sm">Select a patient from the schedule (not just the patients tab) to write a prescription. The appointment ID is required.</p>
                    </div>
                  )}
                  {rxMsg === "success" && (
                    <div className="alert-success">
                      <p className="font-semibold text-sm">Prescription saved. Patient will receive a reminder if revisit date is set.</p>
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
              <p className="font-bold text-slate-700">Select a patient</p>
              <p className="text-sm text-slate-400 mt-1">Click on an appointment from the schedule to view patient details and write a prescription.</p>
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onClose={() => setShowScanner(false)}
          onSuccess={() => {
            setShowScanner(false);
            loadSchedule(); // Refresh schedule after check-in
          }}
        />
      )}
    </div>
  );
}

export default DoctorWorkspace;
