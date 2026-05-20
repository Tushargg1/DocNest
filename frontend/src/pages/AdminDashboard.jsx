import { useEffect, useState } from "react";
import api from "../services/api";

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/admin/dashboard");
        setDashboard(data);
      } catch (err) {
        setError(err?.response?.data || "Unable to load dashboard");
      }
    };
    load();
  }, []);

  if (error) {
    return <p className="shell py-10 text-red-600">{error}</p>;
  }

  if (!dashboard) {
    return (
      <div className="shell py-10">
        <div className="skeleton h-20 w-full" />
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="shell py-10 fade-up">
      <h1 className="text-3xl font-bold">Head Admin Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="metric-card metric-users">Users: {dashboard.totalUsers}</div>
        <div className="metric-card metric-clinics">Clinics: {dashboard.totalClinics}</div>
        <div className="metric-card metric-appointments">Appointments: {dashboard.totalAppointments}</div>
        <div className="metric-card metric-visits">Visits: {dashboard.totalVisits}</div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="frost-card rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-slate-900">Recent Users</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {(dashboard.users || []).slice(-5).reverse().map((user) => (
              <p key={user.id}>
                {user.fullName} - {user.role}
              </p>
            ))}
            {(dashboard.users || []).length === 0 && <p className="text-slate-500">No users yet.</p>}
          </div>
        </section>

        <section className="frost-card rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-slate-900">Recent Clinics</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {(dashboard.clinics || []).slice(-5).reverse().map((clinic) => (
              <p key={clinic.id}>
                {clinic.name} - {clinic.address}
              </p>
            ))}
            {(dashboard.clinics || []).length === 0 && <p className="text-slate-500">No clinics yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;
