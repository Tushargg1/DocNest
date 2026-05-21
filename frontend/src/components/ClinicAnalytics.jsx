import { useState, useEffect } from "react";
import api from "../services/api";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ClinicAnalytics({ clinicId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartView, setChartView] = useState("visits"); // visits | revenue

  useEffect(() => {
    if (!clinicId) return;
    const fetchAnalytics = async () => {
      try {
        const { data: analytics } = await api.get(`/clinics/${clinicId}/analytics`);
        setData(analytics);
      } catch (err) {
        setError("Unable to load analytics data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [clinicId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-error">
        <p className="font-semibold text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const maxVisits = Math.max(...data.monthlyVisits.map((m) => m.count), 1);
  const maxRevenue = Math.max(...data.monthlyRevenue.map((m) => m.revenue), 1);

  const formatCurrency = (amount) => {
    if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toFixed(0);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="This Month Visits" value={data.thisMonthVisits} />
        <SummaryCard label="This Month Revenue" value={`₹${formatCurrency(data.thisMonthRevenue)}`} />
        <SummaryCard label="Avg Rating" value={data.averageRating > 0 ? `${data.averageRating}/5` : "N/A"} />
        <SummaryCard label="Total Patients" value={data.totalPatients} />
      </div>

      {/* Charts Section */}
      <div className="frost-card rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900">Monthly Trends (Last 12 Months)</h3>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setChartView("visits")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                chartView === "visits" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500"
              }`}
            >
              Visits
            </button>
            <button
              onClick={() => setChartView("revenue")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                chartView === "revenue" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500"
              }`}
            >
              Revenue
            </button>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="flex items-end gap-2 h-48">
          {chartView === "visits" &&
            data.monthlyVisits.map((m, i) => {
              const height = maxVisits > 0 ? (m.count / maxVisits) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-600">
                    {m.count > 0 ? m.count : ""}
                  </span>
                  <div className="w-full flex items-end justify-center" style={{ height: "140px" }}>
                    <div
                      className="w-full max-w-[32px] bg-teal-500 rounded-t-md transition-all duration-300"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${MONTH_NAMES[m.month - 1]} ${m.year}: ${m.count} visits`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {MONTH_NAMES[m.month - 1]}
                  </span>
                </div>
              );
            })}
          {chartView === "revenue" &&
            data.monthlyRevenue.map((m, i) => {
              const height = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-600">
                    {m.revenue > 0 ? `₹${formatCurrency(m.revenue)}` : ""}
                  </span>
                  <div className="w-full flex items-end justify-center" style={{ height: "140px" }}>
                    <div
                      className="w-full max-w-[32px] bg-slate-700 rounded-t-md transition-all duration-300"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${MONTH_NAMES[m.month - 1]} ${m.year}: ₹${m.revenue.toFixed(0)}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {MONTH_NAMES[m.month - 1]}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Bottom Grid: Status Breakdown + Top Doctors */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appointment Status Breakdown */}
        <div className="frost-card rounded-2xl p-6 border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4">Appointment Status</h3>
          <div className="space-y-3">
            <StatusBar
              label="Completed"
              count={data.statusBreakdown.completed}
              percent={data.statusBreakdown.completedPercent}
              color="bg-teal-500"
            />
            <StatusBar
              label="Cancelled"
              count={data.statusBreakdown.cancelled}
              percent={data.statusBreakdown.cancelledPercent}
              color="bg-slate-400"
            />
            <StatusBar
              label="Missed"
              count={data.statusBreakdown.missed}
              percent={data.statusBreakdown.missedPercent}
              color="bg-red-400"
            />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total: {data.statusBreakdown.total} appointments</span>
            <span>Booked: {data.statusBreakdown.booked} | Attended: {data.statusBreakdown.attended}</span>
          </div>
        </div>

        {/* Top Doctors */}
        <div className="frost-card rounded-2xl p-6 border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4">Top Doctors</h3>
          {data.topDoctors.length === 0 ? (
            <p className="text-center py-6 text-slate-400 text-sm">No doctor data available.</p>
          ) : (
            <div className="space-y-3">
              {data.topDoctors.map((doc, i) => (
                <div
                  key={doc.doctorUserId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                      #{i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800">{doc.doctorName}</p>
                      <p className="text-xs text-slate-500">{doc.specialization}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">{doc.appointmentCount} appts</p>
                    <p className="text-xs text-slate-500">
                      {doc.averageRating > 0 ? `${doc.averageRating}/5` : "No ratings"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="frost-card rounded-2xl p-5 border border-slate-200">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function StatusBar({ label, count, percent, color }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500 text-xs">{count} ({percent}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(percent, 0)}%` }}
        />
      </div>
    </div>
  );
}

export default ClinicAnalytics;
