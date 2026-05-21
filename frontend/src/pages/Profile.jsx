import { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Profile() {
  const { session, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [patientMedical, setPatientMedical] = useState(null);
  const [expandedMedical, setExpandedMedical] = useState(null);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [clinicPatients, setClinicPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Doctor-specific state
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [doctorDegrees, setDoctorDegrees] = useState([]);
  const [newDegree, setNewDegree] = useState("");
  const [leaves, setLeaves] = useState([]);
  const [newLeaveDate, setNewLeaveDate] = useState("");
  const [newLeaveReason, setNewLeaveReason] = useState("");
  const [cancelOnLeave, setCancelOnLeave] = useState(true);

  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [docForm, setDocForm] = useState({
    fullName: "",
    email: "",
    password: "",
    specialization: "",
    age: "",
    gender: "",
    occupation: "",
    bio: "",
    roomId: "",
    degrees: "",
    workStart: "09:00",
    workEnd: "17:00",
    slotDurationMinutes: 20
  });

  const fetchClinicDashboard = async (clinicId) => {
    try {
      const { data } = await api.get(`/clinics/${clinicId}/dashboard`);
      setDoctors(data.doctors || []);
      setClinicPatients(data.patients || []);
    } catch (err) {
      console.error("Failed to fetch clinic dashboard", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchers = [
          api.get(`/users/${session.userId}`).catch(err => { console.error("User fetch failed", err); return null; }),
          session.role === "CLINIC" ? api.get(`/clinics/owner/${session.userId}`).catch(err => { console.error("Clinic fetch failed", err); return {data:[]}; }) : Promise.resolve({ data: [] }),
          session.role === "PATIENT" ? api.get(`/patients/profile/${session.userId}`).catch(err => { console.error("Medical fetch failed", err); return {data:{}}; }) : Promise.resolve({ data: {} }),
          session.role === "DOCTOR" ? api.get(`/doctors/${session.userId}/profile`).catch(() => null) : Promise.resolve(null),
          session.role === "DOCTOR" ? api.get(`/doctors/${session.userId}/degrees`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          session.role === "DOCTOR" ? api.get(`/doctors/${session.userId}/leaves`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        ];

        const responses = await Promise.all(fetchers);
        
        if (responses[0]?.data) {
          setProfile(responses[0].data);
        }

        if (session.role === "CLINIC" && responses[1]?.data?.length > 0) {
          const c = responses[1].data[0];
          setClinic(c);
          fetchClinicDashboard(c.id);
        }
        
        if (session.role === "PATIENT") {
          setPatientMedical(responses[2]?.data || {});
        }

        if (session.role === "DOCTOR") {
          const dp = responses[3]?.data || null;
          setDoctorProfile(dp ? {
            specialization: dp.specialization || "",
            bio: dp.bio || "",
            occupation: dp.occupation || "",
            age: dp.age || "",
            gender: dp.gender || "",
            roomId: dp.roomId || "",
            workStart: dp.workStart || "09:00",
            workEnd: dp.workEnd || "17:00",
            slotDurationMinutes: dp.slotDurationMinutes || 20,
            approvalStatus: dp.approvalStatus || "ACTIVE",
          } : {
            specialization: "",
            bio: "",
            occupation: "",
            age: "",
            gender: "",
            roomId: "",
            workStart: "09:00",
            workEnd: "17:00",
            slotDurationMinutes: 20,
            approvalStatus: "ACTIVE",
          });
          setDoctorDegrees(responses[4]?.data || []);
          setLeaves(responses[5]?.data || []);
        }
      } catch (err) {
        console.error("Failed to load profile data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [session.userId, session.role]);

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      if (editingDoctorId) {
        const requestBody = {
          fullName: docForm.fullName,
          specialization: docForm.specialization,
          bio: docForm.bio,
          roomId: docForm.roomId,
          age: docForm.age ? parseInt(docForm.age) : null,
          gender: docForm.gender,
          occupation: docForm.occupation,
          degrees: docForm.degrees ? docForm.degrees.split(",").map(d => d.trim()) : [],
          workStart: docForm.workStart,
          workEnd: docForm.workEnd,
          slotDurationMinutes: docForm.slotDurationMinutes ? parseInt(docForm.slotDurationMinutes) : 20,
        };
        await api.put(`/clinics/${clinic.id}/doctors/${editingDoctorId}`, requestBody);
        setMessage("Doctor details updated successfully.");
      } else {
        const requestBody = {
          ...docForm,
          age: docForm.age ? parseInt(docForm.age) : null,
          degrees: docForm.degrees ? docForm.degrees.split(",").map(d => d.trim()) : []
        };
        await api.post(`/clinics/${clinic.id}/doctors`, requestBody);
        setMessage("Doctor registered successfully!");
      }

      setShowDoctorForm(false);
      setEditingDoctorId(null);
      setDocForm({fullName: "", email: "", password: "", specialization: "", age: "", gender: "", occupation: "", bio: "", roomId: "", degrees: "", workStart: "09:00", workEnd: "17:00", slotDurationMinutes: 20});
      fetchClinicDashboard(clinic.id);
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.response?.data || "Doctor registration failed");
    }
  };

  const startEditDoctor = (doctor) => {
    setEditingDoctorId(doctor.doctorUserId);
    setDocForm({
      fullName: doctor.doctorName || "",
      email: "",
      password: "",
      specialization: doctor.specialization || "",
      age: doctor.age || "",
      gender: doctor.gender || "",
      occupation: doctor.occupation || "",
      bio: doctor.bio || "",
      roomId: doctor.roomId || "",
      degrees: (doctor.degrees || []).join(", "),
      workStart: doctor.workStart || "09:00",
      workEnd: doctor.workEnd || "17:00",
      slotDurationMinutes: doctor.slotDurationMinutes || 20,
    });
    setShowDoctorForm(true);
    setMessage("Editing doctor details. Save to send the update for approval.");
  };

  const removeDoctor = async (doctorUserId) => {
    if (!clinic) return;
    try {
      await api.post(`/clinics/${clinic.id}/doctors/${doctorUserId}/remove`);
      setMessage("Doctor removed from clinic.");
      fetchClinicDashboard(clinic.id);
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.response?.data || "Unable to remove doctor");
    }
  };

  const approveDoctor = async (doctorUserId) => {
    if (!clinic) return;
    try {
      await api.post(`/clinics/${clinic.id}/doctors/${doctorUserId}/approve`);
      setMessage("Doctor profile approved and live.");
      fetchClinicDashboard(clinic.id);
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.response?.data || "Unable to approve doctor");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      // Update User Profile
      const { data: updatedUser } = await api.put(`/users/${session.userId}`, profile);
      setProfile(updatedUser);
      login({ ...session, fullName: updatedUser.fullName });

      // Update Clinic if applicable
      if (session.role === "CLINIC" && clinic) {
        const { data: updatedClinic } = await api.put(`/clinics/${clinic.id}`, clinic);
        setClinic(updatedClinic);
        setMessage("Profile and Clinic details updated! Approval status reset to pending.");
      } else if (session.role === "PATIENT" && patientMedical) {
        const { data: updatedMedical } = await api.put(`/patients/profile/${session.userId}`, patientMedical);
        setPatientMedical(updatedMedical);
        setMessage("Medical profile updated successfully!");
      } else if (session.role === "DOCTOR" && doctorProfile) {
        await api.post("/doctors/profile", {
          userId: session.userId,
          specialization: doctorProfile.specialization,
          bio: doctorProfile.bio,
          occupation: doctorProfile.occupation,
          age: doctorProfile.age ? parseInt(doctorProfile.age) : null,
          gender: doctorProfile.gender,
          roomId: doctorProfile.roomId,
          workStart: doctorProfile.workStart,
          workEnd: doctorProfile.workEnd,
          slotDurationMinutes: doctorProfile.slotDurationMinutes ? parseInt(doctorProfile.slotDurationMinutes) : 20,
        });
        setMessage("Professional profile updated successfully!");
      } else {
        setMessage("Profile updated successfully!");
      }
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.response?.data || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDegree = async (e) => {
    e.preventDefault();
    if (!newDegree.trim()) return;
    try {
      const { data } = await api.post(`/doctors/${session.userId}/degrees`, { degreeName: newDegree.trim() });
      setDoctorDegrees(prev => [...prev, data]);
      setNewDegree("");
      setMessage("Degree added.");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to add degree.");
    }
  };

  const handleAddLeave = async (e) => {
    e.preventDefault();
    if (!newLeaveDate) return;
    try {
      const { data } = await api.post(`/doctors/${session.userId}/leaves`, {
        leaveDate: newLeaveDate,
        reason: newLeaveReason.trim() || null,
        cancelAppointments: cancelOnLeave,
      });
      setLeaves(prev => [...prev, data]);
      setNewLeaveDate("");
      setNewLeaveReason("");
      setMessage("Leave day added.");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to add leave.");
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    try {
      await api.delete(`/doctors/${session.userId}/leaves/${leaveId}`);
      setLeaves(prev => prev.filter(l => l.id !== leaveId));
      setMessage("Leave removed.");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to remove leave.");
    }
  };

  if (loading) return <div className="shell py-20"><div className="skeleton h-40 w-full rounded-3xl" /></div>;
  if (!profile) return <div className="shell py-20 text-center text-slate-500 font-bold">Account not found.</div>;

  return (
    <div className="shell max-w-5xl py-12 fade-up">
      <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
        <div>
          <p className="section-label">Account</p>
          <h1 className="page-title text-4xl mt-1">
            {session.role === "CLINIC" ? "Clinic Management" : session.role === "PATIENT" ? "Medical Passport" : "Account Settings"}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {session.role === "CLINIC" ? "Manage your clinic profile and medical staff." : session.role === "PATIENT" ? "Your personal health record — fully private and under your control." : "Manage your personal information."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 border border-slate-200 px-5 py-2.5 rounded-2xl">
            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">{profile.role}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Left Side: Summary & Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="frost-card p-8 rounded-[2.5rem] text-center shadow-xl">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-teal-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">{profile.fullName}</h2>
            {profile.phoneNumber && <p className="text-sm font-bold text-teal-600">{profile.phoneNumber}</p>}
            {profile.email && <p className="text-xs font-medium text-slate-400 mt-0.5">{profile.email}</p>}
            {!profile.email && <p className="text-xs text-slate-400 mt-0.5 italic">No email added yet — add below</p>}
          </div>

          {session.role === "PATIENT" && patientMedical && (
             <div className="frost-card p-8 rounded-[2.5rem] shadow-xl bg-teal-50 border-teal-100 border">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-4">Vitals Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Age</p>
                      <p className="font-bold text-slate-900">{patientMedical.age || "—"}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Blood</p>
                      <p className="font-bold text-teal-600">{patientMedical.bloodGroup || "—"}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Height</p>
                      <p className="font-bold text-slate-900">{patientMedical.height ? `${patientMedical.height} cm` : "—"}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Weight</p>
                      <p className="font-bold text-slate-900">{patientMedical.weight ? `${patientMedical.weight} kg` : "—"}</p>
                   </div>
                </div>
             </div>
          )}

          {session.role === "DOCTOR" && doctorProfile && (
            <div className={`frost-card p-8 rounded-[2.5rem] shadow-xl border-l-4 ${doctorProfile.approvalStatus === "ACTIVE" ? "border-teal-500" : "border-slate-300"}`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Profile Status</p>
              <span className={`status-badge ${doctorProfile.approvalStatus === "ACTIVE" ? "status-booked" : "status-cancelled"}`}>
                {doctorProfile.approvalStatus === "ACTIVE" ? "Active" : "Pending Approval"}
              </span>
              {doctorProfile.specialization && (
                <p className="mt-3 text-sm font-bold text-teal-600">{doctorProfile.specialization}</p>
              )}
              {doctorProfile.workStart && doctorProfile.workEnd && (
                <p className="mt-1 text-xs text-slate-500">{doctorProfile.workStart} – {doctorProfile.workEnd}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">{doctorDegrees.length} degree{doctorDegrees.length !== 1 ? "s" : ""} on file</p>
            </div>
          )}

          {session.role === "CLINIC" && clinic && (
            <div className={`frost-card p-8 rounded-[2.5rem] shadow-xl border-l-4 ${clinic.approved ? "border-teal-500" : "border-slate-300"}`}>              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Live Status</p>
              <span className={`status-badge ${clinic.approved ? "status-booked" : "status-cancelled"}`}>
                {clinic.approved ? "Verified & Public" : "Pending Approval"}
              </span>
              {!clinic.approved && (
                <p className="mt-4 text-[11px] font-medium text-slate-500 leading-relaxed">
                  Your clinical details are under review. Patients search will see you once approved.
                </p>
              )}
            </div>
          )}

          {session.role === "CLINIC" && (
             <div className="frost-card p-8 rounded-[2.5rem] shadow-xl bg-slate-900 text-white">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Staff Overview</h4>
                <div className="mt-4 flex items-end gap-3">
                   <p className="text-5xl font-bold tracking-tighter">{doctors.length}</p>
                   <p className="text-xs font-bold text-slate-400 mb-1.5 uppercase">Registered<br/>Doctors</p>
                </div>
             </div>
          )}
        </div>

        {/* Right Side: Shared Profile Form & Doctor List */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleUpdate} className="space-y-8">
            <section className="frost-card p-10 rounded-[2.5rem] shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-teal-500" /> User Information
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="field mt-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                  <input
                    type="text"
                    value={profile.phoneNumber || ""}
                    onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                    className="field mt-2"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={profile.email || ""}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="field mt-2"
                    placeholder="Add email later if you want"
                  />
                </div>
              </div>
            </section>

            {session.role === "PATIENT" && patientMedical && (
              <section className="frost-card p-10 rounded-[2.5rem] shadow-2xl">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500" /> Medical Profile
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Age</label>
                    <input
                      type="number"
                      value={patientMedical.age || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, age: e.target.value })}
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Gender</label>
                    <select
                      value={patientMedical.gender || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, gender: e.target.value })}
                      className="field mt-2"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Height (cm)</label>
                    <input
                      type="number" step="0.1"
                      value={patientMedical.height || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, height: e.target.value })}
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Weight (kg)</label>
                    <input
                      type="number" step="0.1"
                      value={patientMedical.weight || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, weight: e.target.value })}
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Blood Group</label>
                    <input
                      type="text"
                      value={patientMedical.bloodGroup || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, bloodGroup: e.target.value })}
                      placeholder="e.g. O+ve"
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Emergency Contact</label>
                    <input
                      type="text"
                      value={patientMedical.emergencyContact || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, emergencyContact: e.target.value })}
                      className="field mt-2"
                    />
                  </div>
                </div>
                <div className="mt-6 space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Allergies</label>
                    <input
                      type="text"
                      value={patientMedical.allergies || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, allergies: e.target.value })}
                      placeholder="e.g. Peanuts, Penicillin, Aspirin"
                      className="field mt-2"
                    />
                    <p className="text-xs text-red-500 mt-1 ml-1">This is critical — doctors will be alerted to your allergies</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Current Medications</label>
                    <textarea
                      value={patientMedical.currentMedications || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, currentMedications: e.target.value })}
                      placeholder="List all medications you are currently taking (name, dose, frequency)"
                      className="field mt-2 h-24 pt-3"
                    />
                    <p className="text-xs text-slate-400 mt-1 ml-1">Shared with doctor during appointments to avoid drug interactions</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Medical History</label>
                    {/* Structured card editor for medical history */}
                    {(() => {
                      const raw = patientMedical.medicalHistory || "";
                      let records = [];
                      try {
                        const p = raw.trim().startsWith("[") ? JSON.parse(raw) : null;
                        if (Array.isArray(p)) records = p;
                      } catch { /* not JSON */ }

                      const updateRecords = (newRecords) => {
                        setPatientMedical({ ...patientMedical, medicalHistory: JSON.stringify(newRecords) });
                      };

                      const addRow = () => {
                        updateRecords([...records, { diseaseName: "", startedWhen: "", medications: "", status: "", hospital: "", doctorName: "", visitDate: "" }]);
                      };

                      const updateRow = (idx, field, value) => {
                        const updated = [...records];
                        updated[idx] = { ...updated[idx], [field]: value };
                        updateRecords(updated);
                      };

                      const removeRow = (idx) => {
                        updateRecords(records.filter((_, i) => i !== idx));
                      };

                      // If data is plain text (old format), show migration option
                      if (raw && records.length === 0) {
                        return (
                          <div className="mt-2 space-y-3">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                              <p className="text-xs font-bold text-slate-700 mb-1">Old format detected — migrate to structured table?</p>
                              <p className="text-xs text-slate-600 whitespace-pre-wrap mb-2">{raw}</p>
                              <button
                                type="button"
                                onClick={() => updateRecords([{ diseaseName: raw, startedWhen: "", medications: "", status: "", hospital: "", doctorName: "", visitDate: "" }])}
                                className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition"
                              >
                                Convert to table format →
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="mt-3 space-y-2">
                          {records.map((rec, idx) => {
                            // Determine status tag color
                            const statusText = (rec.status || "").trim().toLowerCase();
                            let tagColor = "bg-red-50 text-red-600 border-red-100";
                            let tagLabel = "Ongoing";
                            if (!statusText || statusText.includes("ongoing") || statusText.includes("still") || statusText.includes("active") || statusText.includes("current")) {
                              tagColor = "bg-red-50 text-red-600 border-red-100";
                              tagLabel = "Ongoing";
                            } else {
                              // It's a date or resolved text
                              const dateMatch = statusText.match(/(\d{4})/);
                              if (dateMatch) {
                                const year = parseInt(dateMatch[1]);
                                const currentYear = new Date().getFullYear();
                                if (currentYear - year <= 1) {
                                  tagColor = "bg-slate-200 text-slate-700 border-slate-300";
                                  tagLabel = "Recent";
                                } else {
                                  tagColor = "bg-slate-100 text-slate-600 border-slate-200";
                                  tagLabel = "Resolved";
                                }
                              } else {
                                tagColor = "bg-slate-100 text-slate-600 border-slate-200";
                                tagLabel = "Resolved";
                              }
                            }

                            const isExpanded = expandedMedical === idx;
                            return (
                              <div key={idx} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                {/* Collapsed header — always visible */}
                                <div
                                  onClick={() => setExpandedMedical(isExpanded ? null : idx)}
                                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <svg className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    <p className="font-bold text-slate-900 text-sm truncate">{rec.diseaseName || `Condition ${idx + 1}`}</p>
                                  </div>
                                  <span className={`shrink-0 ml-3 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${tagColor}`}>
                                    {tagLabel}
                                  </span>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && (
                                  <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-4">
                                    {/* Row 1: Disease + Detected */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Disease / Condition</label>
                                        <input type="text" value={rec.diseaseName || ""} onChange={(e) => updateRow(idx, "diseaseName", e.target.value)} placeholder="e.g. Diabetes Type 2" className="field mt-1 text-sm" />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Detected On</label>
                                        <input type="date" value={rec.startedWhen || ""} onChange={(e) => updateRow(idx, "startedWhen", e.target.value)} className="field mt-1 text-sm" />
                                      </div>
                                    </div>

                                    {/* Row 2: Status — full width */}
                                    <div>
                                      <label className="text-[9px] font-bold uppercase text-slate-400">Status</label>
                                      {(!rec.status || rec.status.toLowerCase().includes("ongoing") || rec.status.toLowerCase().includes("still") || rec.status.toLowerCase().includes("active")) ? (
                                        <div className="mt-1 flex items-center gap-3">
                                          <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">Still Ongoing</span>
                                          <button type="button" onClick={() => updateRow(idx, "status", new Date().toISOString().slice(0, 10))} className="text-xs font-bold text-teal-600 hover:text-teal-800 underline transition">
                                            Mark as ended →
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="mt-1 flex items-center gap-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">Ended on:</span>
                                            <input type="date" value={rec.status || ""} onChange={(e) => updateRow(idx, "status", e.target.value)} className="field text-sm w-40" />
                                          </div>
                                          <button type="button" onClick={() => updateRow(idx, "status", "")} className="text-xs font-bold text-red-500 hover:text-red-700 underline transition">
                                            Set back to ongoing
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Row 3: Medications — full width */}
                                    <div>
                                      <label className="text-[9px] font-bold uppercase text-slate-400">Medications (comma separated)</label>
                                      <input type="text" value={rec.medications || rec.medicineName || ""} onChange={(e) => updateRow(idx, "medications", e.target.value)} placeholder="e.g. Metformin 500mg, Glimepiride 1mg, Insulin 10U" className="field mt-1 text-sm" />
                                    </div>

                                    {/* Row 4: Hospital, Doctor, Last Visit */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                      <div>
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Hospital</label>
                                        <input type="text" value={rec.hospital || ""} onChange={(e) => updateRow(idx, "hospital", e.target.value)} placeholder="e.g. AIIMS Delhi" className="field mt-1 text-sm" />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Doctor Name</label>
                                        <input type="text" value={rec.doctorName || ""} onChange={(e) => updateRow(idx, "doctorName", e.target.value)} placeholder="e.g. Dr. Sharma" className="field mt-1 text-sm" />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Last Visit Date</label>
                                        <input type="date" value={rec.visitDate || ""} onChange={(e) => updateRow(idx, "visitDate", e.target.value)} className="field mt-1 text-sm" />
                                      </div>
                                    </div>

                                    {/* Delete with confirmation */}
                                    <div className="pt-2 border-t border-slate-100">
                                      {deleteConfirmIdx === idx ? (
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs text-red-600 font-medium">Type "delete" to confirm:</span>
                                          <input
                                            type="text"
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            placeholder="delete"
                                            className="border border-red-200 rounded-lg px-3 py-1.5 text-xs w-24 focus:outline-none focus:border-red-400"
                                            autoFocus
                                          />
                                          <button
                                            type="button"
                                            disabled={deleteConfirmText.toLowerCase() !== "delete"}
                                            onClick={() => { removeRow(idx); setDeleteConfirmIdx(null); setDeleteConfirmText(""); }}
                                            className="text-xs font-bold text-white bg-red-500 px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 transition"
                                          >
                                            Confirm Delete
                                          </button>
                                          <button type="button" onClick={() => { setDeleteConfirmIdx(null); setDeleteConfirmText(""); }} className="text-xs text-slate-500 hover:text-slate-700">
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <button type="button" onClick={() => { setDeleteConfirmIdx(idx); setDeleteConfirmText(""); }} className="text-xs font-bold text-red-500 hover:text-red-700 transition">
                                          Remove this entry
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={addRow}
                            className="w-full rounded-xl border-2 border-dashed border-teal-300 py-3 text-sm font-bold text-teal-600 hover:bg-teal-50 transition"
                          >
                            + Add Disease / Condition
                          </button>
                          {records.length === 0 && (
                            <p className="text-xs text-slate-400 text-center mt-1">No entries yet. Click above to add your medical history.</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </section>
            )}

            {session.role === "DOCTOR" && doctorProfile && (
              <section className="frost-card p-10 rounded-[2.5rem] shadow-2xl">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500" /> Professional Profile
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Specialization</label>
                    <input
                      type="text"
                      value={doctorProfile.specialization || ""}
                      onChange={(e) => setDoctorProfile({ ...doctorProfile, specialization: e.target.value })}
                      placeholder="e.g. Cardiologist"
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Occupation / Title</label>
                    <input
                      type="text"
                      value={doctorProfile.occupation || ""}
                      onChange={(e) => setDoctorProfile({ ...doctorProfile, occupation: e.target.value })}
                      placeholder="e.g. Senior Consultant"
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Age</label>
                    <input
                      type="number"
                      value={doctorProfile.age || ""}
                      onChange={(e) => setDoctorProfile({ ...doctorProfile, age: e.target.value })}
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Gender</label>
                    <select
                      value={doctorProfile.gender || ""}
                      onChange={(e) => setDoctorProfile({ ...doctorProfile, gender: e.target.value })}
                      className="field mt-2"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Room / Cabin</label>
                    <input
                      type="text"
                      value={doctorProfile.roomId || ""}
                      onChange={(e) => setDoctorProfile({ ...doctorProfile, roomId: e.target.value })}
                      placeholder="e.g. 101, Cabin A"
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Slot Duration (min)</label>
                    <input
                      type="number"
                      value={doctorProfile.slotDurationMinutes || 20}
                      onChange={(e) => setDoctorProfile({ ...doctorProfile, slotDurationMinutes: parseInt(e.target.value) })}
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Work Starts</label>
                    <input
                      type="time"
                      value={doctorProfile.workStart || "09:00"}
                      onChange={(e) => setDoctorProfile({ ...doctorProfile, workStart: e.target.value })}
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Work Ends</label>
                    <input
                      type="time"
                      value={doctorProfile.workEnd || "17:00"}
                      onChange={(e) => setDoctorProfile({ ...doctorProfile, workEnd: e.target.value })}
                      className="field mt-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Professional Bio</label>
                    <textarea
                      value={doctorProfile.bio || ""}
                      onChange={(e) => setDoctorProfile({ ...doctorProfile, bio: e.target.value })}
                      placeholder="Brief professional summary visible to patients..."
                      className="field mt-2 h-28 pt-3"
                    />
                  </div>
                </div>
              </section>
            )}

            {session.role === "CLINIC" && clinic && (
              <section className="frost-card p-10 rounded-[2.5rem] shadow-2xl">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500" /> Clinic Profile
                </h3>
                 <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Clinic Name</label>
                    <input
                      type="text"
                      value={clinic.name}
                      onChange={(e) => setClinic({ ...clinic, name: e.target.value })}
                      className="field mt-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Street Address</label>
                    <input
                      type="text"
                      value={clinic.address}
                      onChange={(e) => setClinic({ ...clinic, address: e.target.value })}
                      className="field mt-2"
                      required
                    />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Latitude</label>
                      <input
                        type="number" step="any"
                        value={clinic.latitude || ""}
                        onChange={(e) => setClinic({ ...clinic, latitude: e.target.value })}
                        className="field mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Longitude</label>
                      <input
                        type="number" step="any"
                        value={clinic.longitude || ""}
                        onChange={(e) => setClinic({ ...clinic, longitude: e.target.value })}
                        className="field mt-2"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="space-y-4">
              {message && !showDoctorForm && (
                <div className={`rounded-2xl p-4 text-sm font-bold ${message.includes("success") || message.includes("pending") ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700"}`}>
                  {message}
                </div>
              )}
              <button disabled={saving} className="brand-btn w-full py-5 text-sm font-semibold uppercase tracking-widest transition-all shadow-xl">
                {saving ? "Processing..." : "Save Profile Changes"}
              </button>
            </div>
          </form>

          {session.role === "DOCTOR" && (
            <div className="space-y-8">
              {/* Degrees */}
              <section className="frost-card p-8 rounded-[2.5rem] shadow-2xl">
                <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500" /> Qualifications & Degrees
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {doctorDegrees.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No degrees added yet.</p>
                  )}
                  {doctorDegrees.map((deg) => (
                    <span key={deg.id} className="text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded-full">
                      {deg.degreeName}
                    </span>
                  ))}
                </div>
                <form onSubmit={handleAddDegree} className="flex gap-3">
                  <input
                    type="text"
                    value={newDegree}
                    onChange={(e) => setNewDegree(e.target.value)}
                    placeholder="e.g. MBBS - AIIMS Delhi"
                    className="field flex-1"
                  />
                  <button type="submit" className="brand-btn px-5 py-2 text-xs font-bold whitespace-nowrap">
                    + Add
                  </button>
                </form>
              </section>

              {/* Leave Management */}
              <section className="frost-card p-8 rounded-[2.5rem] shadow-2xl">
                <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-400" /> Leave Days
                </h3>
                <div className="space-y-2 mb-5">
                  {leaves.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No upcoming leave days.</p>
                  )}
                  {leaves.map((leave) => (
                    <div key={leave.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{leave.leaveDate}</p>
                        {leave.reason && <p className="text-xs text-slate-500">{leave.reason}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteLeave(leave.id)}
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddLeave} className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Leave Date</label>
                      <input
                        type="date"
                        value={newLeaveDate}
                        onChange={(e) => setNewLeaveDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="field mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Reason (optional)</label>
                      <input
                        type="text"
                        value={newLeaveReason}
                        onChange={(e) => setNewLeaveReason(e.target.value)}
                        placeholder="e.g. Personal, Conference"
                        className="field mt-1"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cancelOnLeave}
                      onChange={(e) => setCancelOnLeave(e.target.checked)}
                      className="rounded"
                    />
                    Auto-cancel booked appointments on this day
                  </label>
                  <button type="submit" className="brand-btn px-6 py-2.5 text-xs font-bold">
                    Add Leave Day
                  </button>
                </form>
              </section>
            </div>
          )}

          {session.role === "CLINIC" && clinic && (
            <section className="space-y-6">              <div className="flex items-center justify-between px-2">
                 <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Medical Staff</h2>
                 <button 
                  onClick={() => setShowDoctorForm(!showDoctorForm)}
                  className="brand-btn-outline px-4 py-2 text-xs"
                 >
                   {showDoctorForm ? "Cancel" : "+ Add / Edit Doctor"}
                 </button>
              </div>

              {showDoctorForm && (
                <form onSubmit={handleAddDoctor} className="frost-card p-10 rounded-[2.5rem] shadow-2xl space-y-6 fade-up">
                  <div className="grid gap-6 md:grid-cols-2">
                    <input placeholder="Doctor Full Name" className="field" value={docForm.fullName} onChange={e => setDocForm({...docForm, fullName: e.target.value})} required />
                    {!editingDoctorId && (
                      <input placeholder="Contact Email" type="email" className="field" value={docForm.email} onChange={e => setDocForm({...docForm, email: e.target.value})} required />
                    )}
                    {!editingDoctorId && (
                      <input placeholder="Initial Password" type="password" className="field" value={docForm.password} onChange={e => setDocForm({...docForm, password: e.target.value})} required />
                    )}
                    <input placeholder="Specialization (e.g. Cardiologist)" className="field" value={docForm.specialization} onChange={e => setDocForm({...docForm, specialization: e.target.value})} required />
                    
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 ml-1">Work Starts</label>
                      <input type="time" className="field" value={docForm.workStart} onChange={e => setDocForm({...docForm, workStart: e.target.value})} required />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 ml-1">Work Ends</label>
                      <input type="time" className="field" value={docForm.workEnd} onChange={e => setDocForm({...docForm, workEnd: e.target.value})} required />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 ml-1">Slot Duration (Min)</label>
                      <input type="number" className="field" value={docForm.slotDurationMinutes} onChange={e => setDocForm({...docForm, slotDurationMinutes: parseInt(e.target.value)})} required />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 ml-1">Room / Cabin</label>
                      <input placeholder="e.g. 101, Cabin A" className="field" value={docForm.roomId} onChange={e => setDocForm({...docForm, roomId: e.target.value})} />
                    </div>

                    <input placeholder="Age" type="number" className="field" value={docForm.age} onChange={e => setDocForm({...docForm, age: e.target.value})} />
                    <select className="field" value={docForm.gender} onChange={e => setDocForm({...docForm, gender: e.target.value})}>
                       <option value="">Select Gender</option>
                       <option value="Male">Male</option>
                       <option value="Female">Female</option>
                       <option value="Other">Other</option>
                    </select>
                    <input placeholder="Occupation / Main Title" className="field md:col-span-2" value={docForm.occupation} onChange={e => setDocForm({...docForm, occupation: e.target.value})} required />
                  </div>
                  <textarea placeholder="Professional Bio & Summary" className="field h-32 pt-4" value={docForm.bio} onChange={e => setDocForm({...docForm, bio: e.target.value})} />
                  <input placeholder="Degrees (MBBS - AIIMS, MD - Harvard)" className="field" value={docForm.degrees} onChange={e => setDocForm({...docForm, degrees: e.target.value})} />
                  
                  {message && showDoctorForm && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700 border border-slate-200">
                      {message}
                    </div>
                  )}

                  <button className="brand-btn w-full py-4 text-sm font-semibold uppercase tracking-widest shadow-xl">
                    {editingDoctorId ? "Save Doctor Changes" : "Register Staff Member"}
                  </button>
                </form>
              )}

              <div className="grid gap-4">
                {doctors.map(doc => (
                  <article key={doc.doctorUserId} className="frost-card p-6 rounded-[2rem] flex items-center justify-between shadow-lg">
                     <div>
                        <div className="flex items-center gap-3">
                           <h4 className="font-bold text-slate-900 uppercase tracking-tighter">{doc.doctorName}</h4>
                           <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase truncate">
                              {doc.specialization}
                           </span>
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${doc.approvalStatus === "ACTIVE" ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-600"}`}>
                              {doc.approvalStatus === "ACTIVE" ? "Live" : "Pending Approval"}
                           </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-1">{doc.occupation || "N/A"}</p>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                          Next booking: {doc.nextAppointmentTime ? new Date(doc.nextAppointmentTime).toLocaleString() : "None"}
                        </p>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                          Last patient: {doc.lastPatientName || "None"}
                        </p>
                        <div className="mt-2 flex gap-1.5 flex-wrap">
                           {(doc.degrees || []).map((d, i) => (
                              <span key={i} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 truncate max-w-[150px]">
                                {d}
                              </span>
                           ))}
                        </div>
                     </div>
                     <div className="text-right space-y-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Room</span>
                          <p className="font-bold text-slate-900">{doc.roomId || "—"}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {doc.approvalStatus !== "ACTIVE" && (
                            <button type="button" onClick={() => approveDoctor(doc.doctorUserId)} className="rounded-xl bg-teal-600 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white">
                              Approve
                            </button>
                          )}
                          <button type="button" onClick={() => startEditDoctor(doc)} className="rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white">
                            Edit
                          </button>
                          <button type="button" onClick={() => removeDoctor(doc.doctorUserId)} className="rounded-xl bg-red-600 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white">
                            Remove
                          </button>
                        </div>
                     </div>
                  </article>
                ))}
                {doctors.length === 0 && (
                  <p className="text-center py-10 text-slate-400 font-medium italic">No doctors registered yet.</p>
                )}
              </div>

              <section className="frost-card p-6 rounded-[2rem] shadow-lg">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Clinic Patients</h3>
                <p className="mt-1 text-sm text-slate-500">Only patients with bookings in this clinic are shown here. Treatment details stay hidden until they book here.</p>
                <div className="mt-4 grid gap-3">
                  {clinicPatients.map((patient) => (
                    <article key={patient.patientUserId} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{patient.patientName}</p>
                          <p className="text-xs text-slate-500">{patient.email} {patient.phoneNumber ? `| ${patient.phoneNumber}` : ""}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {patient.treatmentVisible ? "Booked in clinic" : "Hidden"}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <p>Upcoming: {patient.nextAppointmentTime ? new Date(patient.nextAppointmentTime).toLocaleString() : "None"}</p>
                        <p>Last visit: {patient.lastVisitTime ? new Date(patient.lastVisitTime).toLocaleDateString() : "None"}</p>
                        <p>Last doctor: {patient.lastDoctorName || "None"}</p>
                        <p>Total clinic bookings: {patient.totalAppointments}</p>
                      </div>
                    </article>
                  ))}
                  {clinicPatients.length === 0 && (
                    <p className="text-sm text-slate-500">No booked patients are visible yet.</p>
                  )}
                </div>
              </section>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
