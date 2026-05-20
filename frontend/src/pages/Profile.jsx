import { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Profile() {
  const { session, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [patientMedical, setPatientMedical] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [clinicPatients, setClinicPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
          session.role === "PATIENT" ? api.get(`/patients/profile/${session.userId}`).catch(err => { console.error("Medical fetch failed", err); return {data:{}}; }) : Promise.resolve({ data: {} })
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
      } else {
        setMessage("Profile updated successfully!");
      }
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.response?.data || "Update failed");
    } finally {
      setSaving(false);
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
          <div className="frost-card-dark px-5 py-2.5 rounded-2xl">
            <p className="text-[10px] font-black text-teal-300 uppercase tracking-widest">{profile.role}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Left Side: Summary & Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="frost-card p-8 rounded-[2.5rem] text-center shadow-xl">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-teal-200">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-900">{profile.fullName}</h2>
            {profile.phoneNumber && <p className="text-sm font-bold text-teal-600">{profile.phoneNumber}</p>}
            {profile.email && <p className="text-xs font-medium text-slate-400 mt-0.5">{profile.email}</p>}
            {!profile.email && <p className="text-xs text-slate-400 mt-0.5 italic">No email added yet — add below</p>}
          </div>

          {session.role === "PATIENT" && patientMedical && (
             <div className="frost-card p-8 rounded-[2.5rem] shadow-xl bg-teal-50 border-teal-100 border">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-4">Vitals Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Age</p>
                      <p className="font-black text-slate-900">{patientMedical.age || "—"}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Blood</p>
                      <p className="font-black text-slate-900 text-teal-600">{patientMedical.bloodGroup || "—"}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Height</p>
                      <p className="font-black text-slate-900">{patientMedical.height ? `${patientMedical.height} cm` : "—"}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Weight</p>
                      <p className="font-black text-slate-900">{patientMedical.weight ? `${patientMedical.weight} kg` : "—"}</p>
                   </div>
                </div>
             </div>
          )}

          {session.role === "CLINIC" && clinic && (
            <div className={`frost-card p-8 rounded-[2.5rem] shadow-xl border-l-4 ${clinic.approved ? "border-emerald-500" : "border-amber-500"}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Status</p>
              <span className={`status-badge ${clinic.approved ? "status-booked" : "status-cancelled"}`}>
                {clinic.approved ? "● Verified & Public" : "○ Pending Approval"}
              </span>
              {!clinic.approved && (
                <p className="mt-4 text-[11px] font-medium text-amber-600 leading-relaxed">
                  Your clinical details are under review. Patients search will see you once approved.
                </p>
              )}
            </div>
          )}

          {session.role === "CLINIC" && (
             <div className="frost-card p-8 rounded-[2.5rem] shadow-xl bg-slate-900 text-white">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Staff Overview</h4>
                <div className="mt-4 flex items-end gap-3">
                   <p className="text-5xl font-black tracking-tighter">{doctors.length}</p>
                   <p className="text-xs font-bold text-slate-400 mb-1.5 uppercase">Registered<br/>Doctors</p>
                </div>
             </div>
          )}
        </div>

        {/* Right Side: Shared Profile Form & Doctor List */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleUpdate} className="space-y-8">
            <section className="frost-card p-10 rounded-[2.5rem] shadow-2xl">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-teal-500" /> User Information
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="field mt-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                  <input
                    type="text"
                    value={profile.phoneNumber || ""}
                    onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                    className="field mt-2"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email (Optional)</label>
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
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" /> Medical Profile
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Age</label>
                    <input
                      type="number"
                      value={patientMedical.age || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, age: e.target.value })}
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Gender</label>
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Height (cm)</label>
                    <input
                      type="number" step="0.1"
                      value={patientMedical.height || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, height: e.target.value })}
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Weight (kg)</label>
                    <input
                      type="number" step="0.1"
                      value={patientMedical.weight || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, weight: e.target.value })}
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Blood Group</label>
                    <input
                      type="text"
                      value={patientMedical.bloodGroup || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, bloodGroup: e.target.value })}
                      placeholder="e.g. O+ve"
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Emergency Contact</label>
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">⚠️ Allergies</label>
                    <input
                      type="text"
                      value={patientMedical.allergies || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, allergies: e.target.value })}
                      placeholder="e.g. Peanuts, Penicillin, Aspirin"
                      className="field mt-2"
                    />
                    <p className="text-xs text-rose-500 mt-1 ml-1">⚠️ This is critical — doctors will be alerted to your allergies</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">💊 Current Medications</label>
                    <textarea
                      value={patientMedical.currentMedications || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, currentMedications: e.target.value })}
                      placeholder="List all medications you are currently taking (name, dose, frequency)"
                      className="field mt-2 h-24 pt-3"
                    />
                    <p className="text-xs text-slate-400 mt-1 ml-1">Shared with doctor during appointments to avoid drug interactions</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">📋 Past Medical History</label>
                    <textarea
                      value={patientMedical.medicalHistory || ""}
                      onChange={(e) => setPatientMedical({ ...patientMedical, medicalHistory: e.target.value })}
                      placeholder="Past surgeries, chronic conditions, hospitalizations..."
                      className="field mt-2 h-32 pt-3"
                    />
                  </div>
                </div>
              </section>
            )}

            {session.role === "CLINIC" && clinic && (
              <section className="frost-card p-10 rounded-[2.5rem] shadow-2xl">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-500" /> Clinic Profile
                </h3>
                 <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Clinic Name</label>
                    <input
                      type="text"
                      value={clinic.name}
                      onChange={(e) => setClinic({ ...clinic, name: e.target.value })}
                      className="field mt-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Street Address</label>
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Latitude</label>
                      <input
                        type="number" step="any"
                        value={clinic.latitude || ""}
                        onChange={(e) => setClinic({ ...clinic, latitude: e.target.value })}
                        className="field mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Longitude</label>
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
                <div className={`rounded-2xl p-4 text-sm font-bold ${message.includes("success") || message.includes("pending") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {message}
                </div>
              )}
              <button disabled={saving} className="brand-btn w-full py-5 text-sm font-black uppercase tracking-widest transition-all shadow-xl">
                {saving ? "Processing..." : "Save Profile Changes"}
              </button>
            </div>
          </form>

          {session.role === "CLINIC" && clinic && (
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">Medical Staff</h2>
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
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Work Starts</label>
                      <input type="time" className="field" value={docForm.workStart} onChange={e => setDocForm({...docForm, workStart: e.target.value})} required />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Work Ends</label>
                      <input type="time" className="field" value={docForm.workEnd} onChange={e => setDocForm({...docForm, workEnd: e.target.value})} required />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Slot Duration (Min)</label>
                      <input type="number" className="field" value={docForm.slotDurationMinutes} onChange={e => setDocForm({...docForm, slotDurationMinutes: parseInt(e.target.value)})} required />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Room / Cabin</label>
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
                    <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">
                      {message}
                    </div>
                  )}

                  <button className="brand-btn w-full py-4 text-sm font-black uppercase tracking-widest shadow-xl">
                    {editingDoctorId ? "Save Doctor Changes" : "Register Staff Member"}
                  </button>
                </form>
              )}

              <div className="grid gap-4">
                {doctors.map(doc => (
                  <article key={doc.doctorUserId} className="frost-card p-6 rounded-[2rem] flex items-center justify-between shadow-lg">
                     <div>
                        <div className="flex items-center gap-3">
                           <h4 className="font-black text-slate-900 uppercase tracking-tighter">{doc.doctorName}</h4>
                           <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase truncate">
                              {doc.specialization}
                           </span>
                           <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${doc.approvalStatus === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
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
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Room</span>
                          <p className="font-black text-slate-900">{doc.roomId || "—"}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {doc.approvalStatus !== "ACTIVE" && (
                            <button type="button" onClick={() => approveDoctor(doc.doctorUserId)} className="rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white">
                              Approve
                            </button>
                          )}
                          <button type="button" onClick={() => startEditDoctor(doc)} className="rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white">
                            Edit
                          </button>
                          <button type="button" onClick={() => removeDoctor(doc.doctorUserId)} className="rounded-xl bg-rose-600 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white">
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
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Clinic Patients</h3>
                <p className="mt-1 text-sm text-slate-500">Only patients with bookings in this clinic are shown here. Treatment details stay hidden until they book here.</p>
                <div className="mt-4 grid gap-3">
                  {clinicPatients.map((patient) => (
                    <article key={patient.patientUserId} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-900">{patient.patientName}</p>
                          <p className="text-xs text-slate-500">{patient.email} {patient.phoneNumber ? `| ${patient.phoneNumber}` : ""}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
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
