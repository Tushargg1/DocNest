import { useEffect, useState } from "react";
import api from "../services/api";

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [clinicDashboard, setClinicDashboard] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loadingClinic, setLoadingClinic] = useState(false);
  const [popup, setPopup] = useState(null); // { type: 'patient'|'doctor', data, profile, visits }
  const [popupLoading, setPopupLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const openPatientPopup = async (patientUserId, patientName) => {
    setPopupLoading(true);
    setPopup({ type: "patient", name: patientName, data: null, visits: [], visitRecords: [] });
    try {
      const [profileRes, appointmentsRes, visitsRes] = await Promise.all([
        api.get(`/patients/profile/${patientUserId}`),
        api.get(`/appointments/patient/${patientUserId}`),
        api.get(`/visits/patient/${patientUserId}`),
      ]);
      setPopup({ type: "patient", name: patientName, data: profileRes.data, visits: appointmentsRes.data || [], visitRecords: visitsRes.data || [] });
    } catch {
      setPopup((p) => ({ ...p, data: { note: "Could not load profile" }, visits: [], visitRecords: [] }));
    } finally {
      setPopupLoading(false);
    }
  };

  const openDoctorPopup = async (doctorUserId, doctorName) => {
    setPopupLoading(true);
    setPopup({ type: "doctor", name: doctorName, data: null, degrees: [] });
    try {
      const [profileRes, degreesRes] = await Promise.all([
        api.get(`/doctors/${doctorUserId}/profile`),
        api.get(`/doctors/${doctorUserId}/degrees`),
      ]);
      setPopup({ type: "doctor", name: doctorName, data: profileRes.data, degrees: degreesRes.data || [] });
    } catch {
      setPopup((p) => ({ ...p, data: { note: "Could not load profile" }, degrees: [] }));
    } finally {
      setPopupLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/admin/dashboard");
        setDashboard(data);
      } catch (err) {
        console.error("Failed to load admin dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openClinic = async (clinic) => {
    setSelectedClinic(clinic);
    setSelectedDoctor(null);
    setSelectedPatient(null);
    setLoadingClinic(true);
    try {
      const { data } = await api.get(`/clinics/${clinic.id}/dashboard`);
      setClinicDashboard(data);
    } catch {
      setClinicDashboard(null);
    } finally {
      setLoadingClinic(false);
    }
  };

  const approveClinic = async (clinicId) => {
    try {
      await api.post(`/admin/clinics/approve?clinicId=${clinicId}`);
      const { data } = await api.get("/admin/dashboard");
      setDashboard(data);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to approve");
    }
  };

  const formatDateTime = (iso) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
    catch { return iso; }
  };

  if (loading) return (
    <div className="shell py-10">
      <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-32 w-full rounded-2xl" />)}</div>
    </div>
  );

  if (!dashboard) return <div className="shell py-10 text-center text-slate-500">Unable to load admin panel.</div>;

  // Derive search lists from dashboard data
  const allUsers = dashboard.users || [];
  const allClinics = dashboard.clinics || [];
  const patients = allUsers.filter(u => u.role === "PATIENT");
  const doctors = allUsers.filter(u => u.role === "DOCTOR");

  return (
    <div className="shell py-10 fade-up">
      <div className="mb-8">
        <p className="section-label">Administration</p>
        <h1 className="page-title text-4xl">Head Admin Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <div className="stat-card metric-users"><p className="text-xs font-semibold uppercase text-white/60 mb-1">Users</p><p className="text-3xl font-bold">{dashboard.totalUsers}</p></div>
        <div className="stat-card metric-clinics"><p className="text-xs font-semibold uppercase text-white/60 mb-1">Clinics</p><p className="text-3xl font-bold">{dashboard.totalClinics}</p></div>
        <div className="stat-card metric-appointments"><p className="text-xs font-semibold uppercase text-white/60 mb-1">Appointments</p><p className="text-3xl font-bold">{dashboard.totalAppointments}</p></div>
        <div className="stat-card metric-visits"><p className="text-xs font-semibold uppercase text-white/60 mb-1">Visits</p><p className="text-3xl font-bold">{dashboard.totalVisits}</p></div>
      </div>

      {/* Global Search */}
      <div className="mb-8 relative">
        <input
          type="text"
          placeholder="Search clinic, doctor, or patient by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="field w-full py-3 pl-4 pr-10 text-sm rounded-xl"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold">✕</button>
        )}
        {searchQuery.trim().length >= 2 && (
          <div className="absolute z-40 mt-2 w-full max-h-80 overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 space-y-1">
            {/* Clinics */}
            {allClinics.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
              <div key={`clinic-${c.id}`} onClick={() => { openClinic(c); setSearchQuery(""); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-xs font-bold text-teal-700">C</div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.address} • {c.approved ? "Verified" : "Pending"}</p>
                </div>
              </div>
            ))}
            {/* Doctors */}
            {doctors.filter(u => u.fullName?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
              <div key={`doc-${u.id}`} onClick={() => { openDoctorPopup(u.id, u.fullName); setSearchQuery(""); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">D</div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{u.fullName}</p>
                  <p className="text-xs text-slate-500">{u.email || u.phoneNumber || "Doctor"}</p>
                </div>
              </div>
            ))}
            {/* Patients */}
            {patients.filter(u => u.fullName?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
              <div key={`pat-${u.id}`} onClick={() => { openPatientPopup(u.id, u.fullName); setSearchQuery(""); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">P</div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{u.fullName}</p>
                  <p className="text-xs text-slate-500">{u.phoneNumber || u.email || "Patient"}</p>
                </div>
              </div>
            ))}
            {/* No results */}
            {allClinics.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 &&
             doctors.filter(u => u.fullName?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 &&
             patients.filter(u => u.fullName?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <p className="text-center text-sm text-slate-400 py-4">No results for "{searchQuery}"</p>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: Clinic List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="font-bold text-slate-900 text-lg mb-3">All Clinics ({dashboard.clinics?.length || 0})</h2>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
            {(dashboard.clinics || []).map((clinic) => (
              <div
                key={clinic.id}
                onClick={() => openClinic(clinic)}
                className={`frost-card rounded-xl p-4 cursor-pointer transition-all hover:border-teal-300 ${
                  selectedClinic?.id === clinic.id ? "border-teal-500 border-2 shadow-lg" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{clinic.name}</p>
                    <p className="text-xs text-slate-500 truncate">{clinic.address}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Owner ID: {clinic.ownerUserId}</p>
                  </div>
                  <span className={`status-badge shrink-0 ${clinic.approved ? "status-booked" : "status-pending"}`}>
                    {clinic.approved ? "Live" : "Pending"}
                  </span>
                </div>
                {!clinic.approved && (
                  <button
                    onClick={(e) => { e.stopPropagation(); approveClinic(clinic.id); }}
                    className="brand-btn w-full mt-3 py-2 text-xs"
                  >
                    ✓ Approve Clinic
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Clinic Details */}
        <div className="lg:col-span-2">
          {!selectedClinic && (
            <div className="frost-card rounded-2xl p-12 text-center">
              <p className="font-bold text-slate-600">Select a clinic from the list</p>
              <p className="text-sm text-slate-400 mt-1">Click any clinic to see its doctors, patients, and appointments.</p>
            </div>
          )}

          {selectedClinic && loadingClinic && (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="skeleton h-28 w-full rounded-2xl" />)}</div>
          )}

          {selectedClinic && clinicDashboard && !loadingClinic && (
            <div className="space-y-6">
              {/* Clinic Header */}
              <div className="frost-card rounded-2xl p-6 border border-slate-200 bg-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{clinicDashboard.clinicName}</h2>
                    <p className="text-slate-500 text-sm mt-1">Clinic ID: #{clinicDashboard.clinicId}</p>
                  </div>
                  <span className={`status-badge ${clinicDashboard.approved ? "status-booked" : "status-pending"}`}>
                    {clinicDashboard.approved ? "Verified" : "Pending"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-5">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-teal-600">{clinicDashboard.doctors?.length || 0}</p>
                    <p className="text-xs text-slate-500">Doctors</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-teal-600">{clinicDashboard.patients?.length || 0}</p>
                    <p className="text-xs text-slate-500">Patients</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-teal-600">{clinicDashboard.allAppointments?.length || 0}</p>
                    <p className="text-xs text-slate-500">Appointments</p>
                  </div>
                </div>
              </div>

              {/* Clinic Full Profile Card */}
              <div className="frost-card rounded-2xl p-6">
                <h3 className="font-bold text-slate-900 mb-4">Clinic Profile</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Clinic Name</p>
                      <p className="font-bold text-slate-900 text-lg">{selectedClinic.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Address</p>
                      <p className="text-sm text-slate-700">{selectedClinic.address || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedClinic.phone || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Owner User ID</p>
                      <p className="text-sm text-slate-700">#{selectedClinic.ownerUserId}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</p>
                      <p className="text-sm text-slate-700">
                        Lat: {selectedClinic.latitude || "—"}, Lng: {selectedClinic.longitude || "—"}
                      </p>
                      {selectedClinic.latitude && selectedClinic.longitude && (
                      <a
                          href={`https://www.google.com/maps?q=${selectedClinic.latitude},${selectedClinic.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-teal-600 font-bold hover:underline mt-1 inline-block"
                        >
                          View on Google Maps →
                        </a>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                      <span className={`status-badge mt-1 ${selectedClinic.approved ? "status-booked" : "status-pending"}`}>
                        {selectedClinic.approved ? "Verified & Public" : "Pending Admin Approval"}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Clinic ID</p>
                      <p className="text-sm font-mono text-slate-700">#{selectedClinic.id}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Doctors */}
              <div className="frost-card rounded-2xl p-6">
                <h3 className="font-bold text-slate-900 mb-4">Doctors ({clinicDashboard.doctors?.length || 0})</h3>
                <div className="space-y-3">
                  {(clinicDashboard.doctors || []).map((doc) => (
                    <div
                      key={doc.doctorUserId}
                      onClick={() => openDoctorPopup(doc.doctorUserId, doc.doctorName)}
                      className="p-4 rounded-xl border border-slate-200 cursor-pointer transition-all hover:bg-teal-50 hover:border-teal-300"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{doc.doctorName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="spec-tag-light">{doc.specialization}</span>
                            {doc.roomId && <span className="text-xs text-slate-400">Room: {doc.roomId}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`status-badge ${doc.approvalStatus === "ACTIVE" ? "status-booked" : "status-pending"}`}>
                            {doc.approvalStatus === "ACTIVE" ? "Live" : "Pending"}
                          </span>
                          <p className="text-xs text-slate-400 mt-1">{doc.upcomingAppointments || 0} upcoming</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!clinicDashboard.doctors || clinicDashboard.doctors.length === 0) && (
                    <p className="text-center py-4 text-slate-400">No doctors registered.</p>
                  )}
                </div>
              </div>

              {/* Patients */}
              <div className="frost-card rounded-2xl p-6">
                <h3 className="font-bold text-slate-900 mb-4">Patients ({clinicDashboard.patients?.length || 0})</h3>
                <div className="space-y-3">
                  {(clinicDashboard.patients || []).map((pat) => (
                    <div
                      key={pat.patientUserId}
                      onClick={() => openPatientPopup(pat.patientUserId, pat.patientName)}
                      className="p-4 rounded-xl border border-slate-200 cursor-pointer transition-all hover:bg-slate-50 hover:border-teal-300"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{pat.patientName}</p>
                          <p className="text-xs text-slate-500">{pat.phoneNumber || "Phone hidden"} • {pat.email || "No email"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-teal-600">{pat.totalAppointments} bookings</p>
                          <p className="text-xs text-slate-400">{pat.upcomingAppointments} upcoming</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!clinicDashboard.patients || clinicDashboard.patients.length === 0) && (
                    <p className="text-center py-4 text-slate-400">No patients booked yet.</p>
                  )}
                </div>
              </div>

              {/* All Appointments */}
              <div className="frost-card rounded-2xl p-6">
                <h3 className="font-bold text-slate-900 mb-4">Appointments ({clinicDashboard.allAppointments?.length || 0})</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600">
                        <th className="px-3 py-2 text-left font-bold text-xs uppercase">Token</th>
                        <th className="px-3 py-2 text-left font-bold text-xs uppercase">Patient</th>
                        <th className="px-3 py-2 text-left font-bold text-xs uppercase">Doctor</th>
                        <th className="px-3 py-2 text-left font-bold text-xs uppercase">Time</th>
                        <th className="px-3 py-2 text-left font-bold text-xs uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(clinicDashboard.allAppointments || []).slice(0, 50).map((appt) => {
                        const doc = (clinicDashboard.doctors || []).find(d => d.doctorUserId === appt.doctorUserId);
                        const pat = (clinicDashboard.patients || []).find(p => p.patientUserId === appt.patientUserId);
                        const statusClass = appt.status === "BOOKED" ? "status-booked"
                          : appt.status === "CANCELLED" ? "status-cancelled"
                          : appt.status === "MISSED" ? "status-cancelled"
                          : "status-completed";
                        return (
                          <tr key={appt.appointmentId} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-bold text-teal-700">{appt.tokenNumber || "—"}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => openPatientPopup(appt.patientUserId, pat?.patientName || `Patient #${appt.patientUserId}`)}
                                className="text-left font-medium text-teal-700 hover:underline cursor-pointer"
                              >
                                {pat ? pat.patientName : `#${appt.patientUserId}`}
                              </button>
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => openDoctorPopup(appt.doctorUserId, doc?.doctorName || `Doctor #${appt.doctorUserId}`)}
                                className="text-left font-medium text-teal-700 hover:underline cursor-pointer"
                              >
                                {doc ? doc.doctorName : `#${appt.doctorUserId}`}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-xs">{formatDateTime(appt.startTime)}</td>
                            <td className="px-3 py-2"><span className={`status-badge ${statusClass}`}>{appt.status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {(!clinicDashboard.allAppointments || clinicDashboard.allAppointments.length === 0) && (
                    <p className="text-center py-6 text-slate-400">No appointments yet.</p>
                  )}
                </div>
              </div>

              {/* Visits History */}
              {clinicDashboard.allVisits && clinicDashboard.allVisits.length > 0 && (
                <div className="frost-card rounded-2xl p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Visit Records ({clinicDashboard.allVisits.length})</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="px-3 py-2 text-left text-xs font-bold">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-bold">Patient</th>
                          <th className="px-3 py-2 text-left text-xs font-bold">Doctor</th>
                          <th className="px-3 py-2 text-left text-xs font-bold">Diagnosis</th>
                          <th className="px-3 py-2 text-left text-xs font-bold">Medications</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clinicDashboard.allVisits.slice(0, 30).map((visit) => {
                          const doc = (clinicDashboard.doctors || []).find(d => d.doctorUserId === visit.doctorUserId);
                          const pat = (clinicDashboard.patients || []).find(p => p.patientUserId === visit.patientUserId);
                          return (
                            <tr key={visit.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-xs">{visit.visitDate || "—"}</td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => openPatientPopup(visit.patientUserId, pat?.patientName || `Patient #${visit.patientUserId}`)}
                                  className="text-left font-medium text-teal-700 hover:underline cursor-pointer"
                                >
                                  {pat ? pat.patientName : `#${visit.patientUserId}`}
                                </button>
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => openDoctorPopup(visit.doctorUserId, doc?.doctorName || `Doctor #${visit.doctorUserId}`)}
                                  className="text-left font-medium text-teal-700 hover:underline cursor-pointer"
                                >
                                  {doc ? doc.doctorName : `#${visit.doctorUserId}`}
                                </button>
                              </td>
                              <td className="px-3 py-2 truncate max-w-[150px]">{visit.diagnosis || "—"}</td>
                              <td className="px-3 py-2 truncate max-w-[150px]">{visit.medications || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Profile Popup Modal ── */}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setPopup(null)}>
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-8" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPopup(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>

            {popupLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
              </div>
            )}

            {/* Patient Popup */}
            {!popupLoading && popup.type === "patient" && popup.data && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-teal-50 border border-teal-200 text-2xl font-bold text-teal-700 mb-3">
                    {popup.name?.charAt(0) || "P"}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{popup.name}</h2>
                  <p className="text-sm text-slate-500">Patient Profile</p>
                </div>

                {popup.data.note ? (
                  <p className="text-center text-slate-500">{popup.data.note}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Age</p>
                        <p className="font-bold text-slate-900">{popup.data.age || "—"}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Gender</p>
                        <p className="font-bold text-slate-900">{popup.data.gender || "—"}</p>
                      </div>
                      <div className="bg-teal-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Blood</p>
                        <p className="font-bold text-teal-700">{popup.data.bloodGroup || "—"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Height</p>
                        <p className="font-bold text-slate-800">{popup.data.height ? `${popup.data.height} cm` : "—"}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Weight</p>
                        <p className="font-bold text-slate-800">{popup.data.weight ? `${popup.data.weight} kg` : "—"}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {popup.data.allergies && (
                        <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                          <p className="text-[10px] font-bold uppercase text-red-600">Allergies</p>
                          <p className="text-sm font-medium text-red-800 mt-1">{popup.data.allergies}</p>
                        </div>
                      )}
                      {popup.data.currentMedications && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                          <p className="text-[10px] font-bold uppercase text-slate-500">Current Medications</p>
                          <p className="text-sm text-slate-800 mt-1">{popup.data.currentMedications}</p>
                        </div>
                      )}
                      {popup.data.emergencyContact && (
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Emergency Contact</p>
                          <p className="font-bold text-slate-800 mt-1">{popup.data.emergencyContact}</p>
                        </div>
                      )}
                      {popup.data.abhaId && (
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-[10px] font-bold uppercase text-slate-400">ABHA ID</p>
                          <p className="font-mono text-sm text-slate-800 mt-1">{popup.data.abhaId}</p>
                        </div>
                      )}
                    </div>

                    {/* Medical History — structured view */}
                    {popup.data.medicalHistory && (() => {
                      const raw = popup.data.medicalHistory;
                      let records = [];
                      try {
                        const p = raw.trim().startsWith("[") ? JSON.parse(raw) : null;
                        if (Array.isArray(p)) records = p;
                      } catch { /* not JSON */ }

                      if (records.length > 0) {
                        return (
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Medical History ({records.length})</p>
                            <div className="space-y-2">
                              {records.map((rec, i) => {
                                const statusText = (rec.status || "").trim().toLowerCase();
                                let tagColor = "bg-red-50 text-red-600";
                                let tagLabel = "Ongoing";
                                if (statusText && !statusText.includes("ongoing") && !statusText.includes("still") && !statusText.includes("active")) {
                                  const dateMatch = statusText.match(/(\d{4})/);
                                  if (dateMatch && new Date().getFullYear() - parseInt(dateMatch[1]) > 1) {
                                    tagColor = "bg-slate-100 text-slate-600";
                                    tagLabel = "Resolved";
                                  } else {
                                    tagColor = "bg-slate-200 text-slate-700";
                                    tagLabel = "Recent";
                                  }
                                }
                                return (
                                  <div key={i} className="rounded-lg border border-slate-200 p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="font-bold text-slate-900 text-sm">{rec.diseaseName || "Unknown condition"}</p>
                                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${tagColor}`}>{tagLabel}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                      {rec.startedWhen && <p><span className="text-slate-400">Detected:</span> {rec.startedWhen}</p>}
                                      {rec.status && !rec.status.toLowerCase().includes("ongoing") && <p><span className="text-slate-400">Ended:</span> {rec.status}</p>}
                                      {(rec.medications || rec.medicineName) && <p className="col-span-2"><span className="text-slate-400">Medications:</span> {rec.medications || rec.medicineName}</p>}
                                      {rec.hospital && <p><span className="text-slate-400">Hospital:</span> {rec.hospital}</p>}
                                      {rec.doctorName && <p><span className="text-slate-400">Doctor:</span> {rec.doctorName}</p>}
                                      {rec.visitDate && <p><span className="text-slate-400">Last visit:</span> {rec.visitDate}</p>}
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
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Medical History</p>
                          <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{raw}</p>
                        </div>
                      );
                    })()}

                    {/* Visit Records Table */}
                    {popup.visitRecords && popup.visitRecords.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 mb-2">Past Visit Records ({popup.visitRecords.length})</p>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-60 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0">
                      <tr className="bg-slate-100 text-slate-700">
                                <th className="px-3 py-2 text-left font-bold">Date</th>
                                <th className="px-3 py-2 text-left font-bold">Diagnosis</th>
                                <th className="px-3 py-2 text-left font-bold">Medications</th>
                                <th className="px-3 py-2 text-left font-bold">Revisit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {popup.visitRecords.map((vr) => (
                                <tr key={vr.id} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 whitespace-nowrap">{vr.visitDate || "—"}</td>
                                  <td className="px-3 py-2">{vr.diagnosis || "—"}</td>
                                  <td className="px-3 py-2">{vr.medications || "—"}</td>
                                  <td className="px-3 py-2 whitespace-nowrap">{vr.revisitDate || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Appointment History */}
                    {popup.visits && popup.visits.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 mb-2">Appointments ({popup.visits.length})</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {popup.visits.map((v) => (
                            <div key={v.appointmentId} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs">
                              <span>{v.startTime ? new Date(v.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</span>
                              <span className={`status-badge ${v.status === "BOOKED" ? "status-booked" : v.status === "CANCELLED" ? "status-cancelled" : "status-completed"}`}>{v.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Doctor Popup */}
            {!popupLoading && popup.type === "doctor" && popup.data && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-2xl font-bold text-slate-700 mb-3">
                    {popup.name?.charAt(0) || "D"}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{popup.name}</h2>
                  <p className="text-sm text-teal-600 font-medium">{popup.data.specialization || "Doctor"}</p>
                </div>

                {popup.data.note ? (
                  <p className="text-center text-slate-500">{popup.data.note}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Age</p>
                        <p className="font-bold text-slate-900">{popup.data.age || "—"}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Gender</p>
                        <p className="font-bold text-slate-900">{popup.data.gender || "—"}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Room</p>
                        <p className="font-bold text-slate-700">{popup.data.roomId || "—"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Work Hours</p>
                        <p className="font-bold text-slate-800">{popup.data.workStart || "09:00"} – {popup.data.workEnd || "17:00"}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Slot Duration</p>
                        <p className="font-bold text-slate-800">{popup.data.slotDurationMinutes || 20} min</p>
                      </div>
                    </div>

                    {popup.data.bio && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Bio</p>
                        <p className="text-sm text-slate-700 mt-1">{popup.data.bio}</p>
                      </div>
                    )}

                    {popup.data.occupation && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Title / Occupation</p>
                        <p className="font-bold text-slate-800 mt-1">{popup.data.occupation}</p>
                      </div>
                    )}

                    {popup.degrees && popup.degrees.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Qualifications</p>
                        <div className="flex flex-wrap gap-2">
                          {popup.degrees.map((d, i) => (
                            <span key={i} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
                              {d.degreeName} — {d.institute} ({d.yearOfCompletion})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
