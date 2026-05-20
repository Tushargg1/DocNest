import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function DoctorDetails() {
  const { doctorUserId } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchDoctor = async () => {
    try {
      const { data } = await api.get(`/clinics/doctor/${doctorUserId}`);
      setDoctor(data);
    } catch (err) {
      setMessage("Unable to load doctor details");
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    setSlotsLoading(true);
    try {
      const { data } = await api.get(`/appointments/doctor/${doctorUserId}/slots`, {
        params: { date },
      });
      setSlots(data.availableSlots || []);
    } catch (err) {
      console.error("Unable to fetch slots", err);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctor();
  }, [doctorUserId]);

  useEffect(() => {
    fetchSlots();
  }, [doctorUserId, date]);

  const handleBookingClick = (slot) => {
    if (!session) {
      // Redirect to login but save the intent? 
      // For now, just go to login/patient
      navigate("/login/patient");
      return;
    }
    // If logged in, go to the booking page with pre-filled slot? 
    // Or just let them book from here.
    // Transition to the existing BookAppointment page with params
    navigate(`/book?doctorUserId=${doctorUserId}&clinicId=${doctor.clinicId}&date=${date}`);
  };

  if (loading) return <div className="shell py-10"><div className="skeleton h-64 w-full rounded-3xl" /></div>;
  if (!doctor) return <div className="shell py-10 text-center text-slate-600">Doctor not found.</div>;

  return (
    <div className="shell py-10 fade-up">
      <Link to="/nearby" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Results
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Profile Card */}
        <section className="lg:col-span-2">
          <div className="frost-card overflow-hidden rounded-[2.5rem] p-0">
            <div className="h-32 bg-gradient-to-r from-cyan-600 to-emerald-600" />
            <div className="relative px-8 pb-8">
              <div className="absolute -top-12 left-8 h-24 w-24 rounded-3xl bg-white p-1 shadow-xl">
                <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-100 text-3xl font-bold text-slate-400">
                  {doctor.doctorName.charAt(0)}
                </div>
              </div>
              <div className="pt-16">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-black text-slate-900">Dr. {doctor.doctorName}</h1>
                    <p className="text-lg font-medium text-cyan-600">
                      {doctor.occupation || doctor.specialization} ({doctor.specialization})
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {doctor.age ? `${doctor.age} years` : ""} {doctor.gender ? `• ${doctor.gender}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-emerald-700">
                    <span className="text-xl font-black">{doctor.averageRating || "N/A"}</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Rating</span>
                  </div>
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Biography</h3>
                    <p className="leading-relaxed text-slate-600">
                      {doctor.bio || "No biography provided yet."}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Qualifications</h3>
                    <div className="flex flex-wrap gap-2">
                      {doctor.degrees.map((deg, i) => (
                        <span key={i} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                          {deg}
                        </span>
                      ))}
                      {doctor.degrees.length === 0 && <span className="text-sm text-slate-500">Not listed</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-[2rem] border border-white/40 bg-white/30 p-8">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Clinic Headquarters</h3>
                  <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
                    <div>
                      <p className="text-xl font-black text-slate-900">{doctor.clinicName}</p>
                      <p className="mt-1 text-slate-500 font-medium">{doctor.clinicAddress}</p>
                    </div>
                    {doctor.roomId && (
                      <div className="rounded-2xl bg-cyan-500/10 px-5 py-3 text-cyan-700 ring-1 ring-cyan-500/20 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Designated Room</p>
                        <p className="text-lg font-black tracking-tight">{doctor.roomId}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar: Availability & Slots */}
        <aside className="space-y-6">
          <div className="frost-card rounded-[2rem] p-6 shadow-xl ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Check Availability</h2>
            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Select Date</label>
              <input 
                type="date" 
                value={date} 
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)} 
                className="field mt-2"
              />
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Available Slots</h3>
                {slotsLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />}
              </div>
              
              <div className="max-h-80 space-y-2 overflow-y-auto pr-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => handleBookingClick(slot)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <span className="font-medium text-slate-700">
                      {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                ))}
                {!slotsLoading && slots.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                    <p className="text-sm text-slate-500">No slots available for this date.</p>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400 italic">
              * Login is required to confirm your booking.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default DoctorDetails;
