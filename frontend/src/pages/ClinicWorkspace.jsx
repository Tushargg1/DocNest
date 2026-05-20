import { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// Clinic Workspace - now redirects to Profile for clinic management
// This is the dedicated workspace for clinics showing patients & appointments
function ClinicWorkspace() {
  const { session } = useAuth();
  const [clinic, setClinic] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [allVisits, setAllVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [clinicNotes, setClinicNotes] = useState({ patientId: null, notes: "", prescriptionUrl: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/clinics/owner/${session.userId}`);
        if (data && data.length > 0) {
          const c = data[0];
          setClinic(c);
          const { data: dash } = await api.get(`/clinics/${c.id}/dashboard`);
          setDoctors(dash.doctors || []);
          setPatients(dash.patients || []);
          setAppointments(dash.upcomingAppointments || []);
          setAllAppointments(dash.allAppointments || []);
          setAllVisits(dash.allVisits || []);
        }
      } catch (err) {
        setMessage("Unable to load clinic data.");
      } finally {
        setLoading(false);
      }
    };
    if (session?.userId) load();
  }, [session?.userId]);

  const addClinicNotes = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/clinics/${clinic.id}/patient-notes`, clinicNotes);
      setMessage("Patient notes saved successfully.");
      setClinicNotes({ patientId: null, notes: "", prescriptionUrl: "" });
      setSelectedPatient(null);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to save notes.");
    }
  };

  const formatDateTime = (iso) => {
    try { return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
    catch { return iso; }
  };

  const tabs = [
    { id: "overview", label: "📊 Overview" },
    { id: "doctors", label: "👨‍⚕️ Doctors" },
    { id: "patients", label: "🧑‍⚕️ Patients" },
  ];

  if (loading) {
    return (
      <div className="shell py-10">
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="skeleton h-32 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="shell max-w-2xl py-20 text-center fade-up">
        <div className="text-5xl mb-4">🏥</div>
        <h1 className="page-title text-3xl">No Clinic Found</h1>
        <p className="mt-2 text-slate-500">You haven't set up a clinic yet. Go to your Profile to create and manage your clinic details.</p>
        <a href="/profile" className="brand-btn inline-block mt-6 px-8 py-3">Go to Profile →</a>
      </div>
    );
  }

  return (
    <div className="shell py-10 fade-up">
      {/* Page Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label">Clinic Portal</p>
          <h1 className="page-title text-4xl">{clinic.name}</h1>
          <p className="mt-1 text-slate-500">{clinic.address}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`status-badge ${clinic.approved ? "status-booked" : "status-pending"}`}>
            {clinic.approved ? "● Live & Public" : "○ Pending Approval"}
          </span>
          <a href="/profile" className="btn-ghost px-4 py-2 text-xs">Edit Profile →</a>
        </div>
      </div>

      {message && (
        <div className={`mb-6 ${message.includes("success") || message.includes("saved") ? "alert-success" : "alert-error"}`}>
          <p className="font-semibold text-sm">{message}</p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8 fade-up stagger-1">
        <div className="stat-card metric-clinics">
          <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">Doctors</p>
          <p className="text-4xl font-black">{doctors.length}</p>
        </div>
        <div className="stat-card metric-appointments">
          <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">Active Patients</p>
          <p className="text-4xl font-black">{patients.length}</p>
        </div>
        <div className="stat-card metric-users">
          <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">Clinic ID</p>
          <p className="text-2xl font-black">#{clinic.id}</p>
        </div>
      </div>

      {!clinic.approved && (
        <div className="alert-warning mb-6 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold">Clinic Under Review</p>
            <p className="text-sm mt-0.5">Your clinic is private until an admin verifies your details. Patients won't see you in search results yet.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mb-6">
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

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Patients */}
            <div className="frost-card rounded-2xl p-6">
              <h2 className="font-black text-slate-900 mb-4">Recent Patient Bookings</h2>
              <div className="alert-info mb-4 text-xs">
                🔒 Only name & phone are shown permanently. Full medical history appears only during active appointments.
              </div>
              <div className="space-y-3">
                {patients.slice(0, 5).map((p) => (
                  <div key={p.patientUserId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{p.patientName}</p>
                      <p className="text-xs text-slate-500">{p.phoneNumber || "Phone on file"}</p>
                      {p.nextAppointmentTime && (
                        <p className="text-xs text-teal-600 font-semibold mt-1">
                          Next: {formatDateTime(p.nextAppointmentTime)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {setSelectedPatient(p); setActiveTab("patients");}}
                      className="btn-ghost px-3 py-1.5 text-xs shrink-0"
                    >
                      Add Notes
                    </button>
                  </div>
                ))}
                {patients.length === 0 && (
                  <p className="text-center py-6 text-slate-400">No booked patients yet.</p>
                )}
              </div>
            </div>

            {/* Quick Doctor Summary */}
            <div className="frost-card rounded-2xl p-6">
              <h2 className="font-black text-slate-900 mb-4">Doctor Status</h2>
              <div className="space-y-3">
                {doctors.map((doc) => (
                  <div key={doc.doctorUserId} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3">
                    <div>
                      <p className="font-bold text-sm text-slate-800">Dr. {doc.doctorName}</p>
                      <p className="text-xs text-teal-600 font-semibold">{doc.specialization}</p>
                      {doc.nextAppointmentTime && (
                        <p className="text-xs text-slate-500">Next: {formatDateTime(doc.nextAppointmentTime)}</p>
                      )}
                    </div>
                    <span className={`status-badge ${doc.approvalStatus === "ACTIVE" ? "status-booked" : "status-pending"}`}>
                      {doc.approvalStatus === "ACTIVE" ? "Live" : "Pending"}
                    </span>
                  </div>
                ))}
                {doctors.length === 0 && (
                  <p className="text-center py-6 text-slate-400 text-sm">No doctors registered yet.</p>
                )}
              </div>
              <a href="/profile" className="brand-btn-outline mt-4 block py-2.5 text-center text-xs">
                Manage Doctors in Profile →
              </a>
            </div>
          </div>

          {/* Upcoming Appointments Table */}
          {appointments && appointments.length > 0 && (
            <div className="frost-card rounded-2xl p-6 mt-6">
              <h2 className="font-black text-slate-900 mb-4">Upcoming Appointments</h2>
              <div className="space-y-3">
                {appointments.map((appt) => {
                  const doc = doctors.find(d => d.doctorUserId === appt.doctorUserId);
                  const pat = patients.find(p => p.patientUserId === appt.patientUserId);
                  return (
                    <div key={appt.appointmentId || appt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xs font-black text-teal-600">
                          {appt.tokenNumber || "—"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {pat ? pat.patientName : `Patient #${appt.patientUserId}`}
                          </p>
                          <p className="text-xs text-slate-500">Scheduled: {formatDateTime(appt.startTime)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-slate-700">Dr. {doc ? doc.doctorName : `ID: ${appt.doctorUserId}`}</p>
                        <span className="status-badge status-booked mt-1 inline-block">{appt.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Doctors Tab */}
      {activeTab === "doctors" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title text-2xl">Medical Staff</h2>
              <a href="/profile" className="brand-btn px-5 py-2.5 text-xs">+ Add / Edit</a>
            </div>
            <div className="grid gap-4">
              {doctors.map((doc) => (
                <div 
                  key={doc.doctorUserId} 
                  className={`frost-card rounded-2xl p-5 cursor-pointer transition-all ${selectedDoctor?.doctorUserId === doc.doctorUserId ? "border-teal-400 border-2" : ""}`}
                  onClick={() => setSelectedDoctor(doc)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 font-black text-xl">
                        {(doc.doctorName || "D").charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{doc.doctorName}</p>
                        <span className="spec-tag-light mt-1">{doc.specialization}</span>
                      </div>
                    </div>
                    <span className={`status-badge shrink-0 ${doc.approvalStatus === "ACTIVE" ? "status-booked" : "status-pending"}`}>
                      {doc.approvalStatus === "ACTIVE" ? "Live" : "Pending"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span>🚪 Room: {doc.roomId || "—"}</span>
                    <span>⭐ Rating: {doc.averageRating || "N/A"}</span>
                    <span>👥 Last patient: {doc.lastPatientName || "None"}</span>
                    <span>📅 Next apt: {doc.nextAppointmentTime ? formatDateTime(doc.nextAppointmentTime) : "None"}</span>
                  </div>
                </div>
              ))}
              {doctors.length === 0 && (
                <div className="text-center py-12 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400">No doctors registered yet.</p>
                  <a href="/profile" className="brand-btn inline-block mt-4 px-6 py-2.5 text-sm">Add First Doctor</a>
                </div>
              )}
            </div>
          </div>
          
          <div>
            {selectedDoctor ? (
              <div className="frost-card rounded-2xl p-6 sticky top-24">
                <h3 className="font-black text-slate-900 mb-4">Appointments for Dr. {selectedDoctor.doctorName}</h3>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {allAppointments.filter(a => a.doctorUserId === selectedDoctor.doctorUserId).map((appt) => {
                    const pat = patients.find(p => p.patientUserId === appt.patientUserId);
                    return (
                      <div key={appt.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3">
                        <div>
                          <p className="font-bold text-sm text-slate-800">{pat ? pat.patientName : `Patient #${appt.patientUserId}`}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(appt.startTime)}</p>
                        </div>
                        <span className={`status-badge text-[10px] ${appt.status === "BOOKED" ? "status-booked" : "status-completed"}`}>
                          {appt.status}
                        </span>
                      </div>
                    );
                  })}
                  {allAppointments.filter(a => a.doctorUserId === selectedDoctor.doctorUserId).length === 0 && (
                    <p className="text-center py-6 text-slate-400 text-sm">No recorded appointments for this doctor in your clinic.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="frost-card rounded-2xl p-8 text-center mt-12">
                <div className="text-4xl mb-3">🩺</div>
                <p className="font-bold text-slate-600">Select a doctor</p>
                <p className="text-sm text-slate-400 mt-1">Click on a doctor to view all their appointments in this clinic.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Patients Tab */}
      {activeTab === "patients" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="section-title text-2xl mb-4">Booked Patients</h2>
            <div className="alert-info mb-4 text-sm">
              🔒 <strong>Privacy Policy:</strong> Medical history is visible ONLY during an active appointment. After the appointment ends, only name and phone number remain visible.
            </div>
            <div className="space-y-3">
              {patients.map((p) => (
                <div
                  key={p.patientUserId}
                  className={`frost-card rounded-2xl p-5 cursor-pointer transition-all ${selectedPatient?.patientUserId === p.patientUserId ? "border-teal-400 border-2" : ""}`}
                  onClick={() => setSelectedPatient(p)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900">{p.patientName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.phoneNumber || "Phone on file"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400">{p.totalAppointments || 0} bookings</p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 space-y-1">
                    {p.nextAppointmentTime && <p>🗓 Next: {formatDateTime(p.nextAppointmentTime)}</p>}
                    {p.lastVisitTime && <p>📅 Last visit: {formatDateTime(p.lastVisitTime)}</p>}
                    {p.lastDoctorName && <p>👨‍⚕️ Last doctor: {p.lastDoctorName}</p>}
                  </div>
                </div>
              ))}
              {patients.length === 0 && (
                <p className="text-center py-6 text-slate-400">No booked patients yet.</p>
              )}
            </div>
          </div>

          {/* Clinic Notes & History Panel */}
          <div>
            {selectedPatient ? (
              <div className="frost-card rounded-2xl p-6 sticky top-24 max-h-[85vh] overflow-y-auto">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="font-black text-slate-900 mb-2">
                    Clinic History: {selectedPatient.patientName}
                  </h3>
                  <div className="space-y-3">
                    {allVisits.filter(v => v.patientUserId === selectedPatient.patientUserId).map((v) => {
                      const vDoc = doctors.find(d => d.doctorUserId === v.doctorUserId);
                      return (
                        <div key={v.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-500 mb-1">{v.visitDate} · {vDoc ? `Dr. ${vDoc.doctorName}` : `Dr. #${v.doctorUserId}`}</p>
                          {v.diagnosis && <p className="text-sm font-bold text-slate-800">Diagnosis: <span className="font-normal">{v.diagnosis}</span></p>}
                          {v.medications && <p className="text-sm font-bold text-slate-800 mt-1">Rx: <span className="font-normal">{v.medications}</span></p>}
                        </div>
                      );
                    })}
                    {allAppointments.filter(a => a.patientUserId === selectedPatient.patientUserId && a.status === "BOOKED").map((a) => {
                      const aDoc = doctors.find(d => d.doctorUserId === a.doctorUserId);
                      return (
                        <div key={a.id} className="bg-teal-50/50 p-3 rounded-xl border border-teal-100 flex justify-between items-center">
                          <div>
                            <p className="text-xs text-teal-600 font-bold uppercase tracking-wide mb-0.5">Upcoming Booking</p>
                            <p className="text-sm font-bold text-slate-800">{formatDateTime(a.startTime)}</p>
                          </div>
                          <p className="text-xs text-slate-600 text-right">With {aDoc ? `Dr. ${aDoc.doctorName}` : `Dr. #${a.doctorUserId}`}</p>
                        </div>
                      );
                    })}
                    {allVisits.filter(v => v.patientUserId === selectedPatient.patientUserId).length === 0 &&
                     allAppointments.filter(a => a.patientUserId === selectedPatient.patientUserId).length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">No records found for this patient at your clinic.</p>
                    )}
                  </div>
                </div>

                <h3 className="font-black text-slate-900 mb-2">Add Clinical Notes</h3>
                <p className="text-xs text-slate-500 mb-4">
                  These notes are for clinic records only. They won't affect the patient's personal medical passport.
                </p>
                <form onSubmit={addClinicNotes} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Clinical Notes / Observations</label>
                    <textarea
                      value={clinicNotes.notes}
                      onChange={(e) => setClinicNotes({ ...clinicNotes, notes: e.target.value, patientId: selectedPatient.patientUserId })}
                      placeholder="Observations, follow-up notes..."
                      className="field h-28"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Prescription Photo URL</label>
                    <input
                      type="url"
                      value={clinicNotes.prescriptionUrl}
                      onChange={(e) => setClinicNotes({ ...clinicNotes, prescriptionUrl: e.target.value })}
                      placeholder="https://... (optional)"
                      className="field"
                    />
                    <p className="text-xs text-slate-400 mt-1">Upload prescription photo for your clinic records</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="brand-btn flex-1 py-3 text-sm">Save Notes</button>
                    <button type="button" onClick={() => setSelectedPatient(null)} className="btn-ghost px-4 py-3 text-sm">Cancel</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="frost-card rounded-2xl p-8 text-center mt-12">
                <div className="text-4xl mb-3">🧑‍⚕️</div>
                <p className="font-bold text-slate-600">Select a patient</p>
                <p className="text-sm text-slate-400 mt-1">Click on a patient to view their clinic history or add notes.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClinicWorkspace;
