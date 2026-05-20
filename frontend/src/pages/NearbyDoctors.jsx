import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function NearbyDoctors() {
  const [location, setLocation] = useState({ lat: "28.6139", lng: "77.2090" });
  const [placeName, setPlaceName] = useState("New Delhi, India");
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSpec, setFilterSpec] = useState("");
  const searchTimeout = useRef(null);

  const fetchDoctors = async (lat, lng) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/clinics/nearby-doctors", {
        params: { latitude: Number(lat || location.lat), longitude: Number(lng || location.lng) },
      });
      setDoctors(data);
      setSelectedClinicId(null);
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || "Unable to fetch clinics");
    } finally {
      setLoading(false);
    }
  };

  // Reverse geocode: lat/lng -> place name
  const reverseGeocode = async (lat, lng) => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
      const data = await resp.json();
      if (data?.display_name) {
        // Show city/town + state for brevity
        const parts = [];
        if (data.address?.city || data.address?.town || data.address?.village) {
          parts.push(data.address.city || data.address.town || data.address.village);
        }
        if (data.address?.state) parts.push(data.address.state);
        if (data.address?.country) parts.push(data.address.country);
        setPlaceName(parts.length > 0 ? parts.join(", ") : data.display_name.split(",").slice(0, 3).join(","));
      }
    } catch { /* ignore reverse geocoding failures */ }
  };

  // Forward geocode: place name -> lat/lng suggestions
  const searchPlaces = async (query) => {
    if (!query || query.length < 3) {
      setPlaceSuggestions([]);
      return;
    }
    setSearchingPlace(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`);
      const data = await resp.json();
      setPlaceSuggestions(data.map(item => ({
        name: item.display_name.split(",").slice(0, 3).join(","),
        fullName: item.display_name,
        lat: item.lat,
        lng: item.lon,
      })));
      setShowSuggestions(true);
    } catch {
      setPlaceSuggestions([]);
    } finally {
      setSearchingPlace(false);
    }
  };

  const handlePlaceInputChange = (value) => {
    setPlaceSearch(value);
    // Debounce search
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchPlaces(value), 400);
  };

  const selectPlace = (place) => {
    setPlaceName(place.name);
    setPlaceSearch("");
    setLocation({ lat: place.lat, lng: place.lng });
    setShowSuggestions(false);
    setPlaceSuggestions([]);
    fetchDoctors(place.lat, place.lng);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = String(pos.coords.latitude.toFixed(4));
        const lng = String(pos.coords.longitude.toFixed(4));
        setLocation({ lat, lng });
        setLocating(false);
        reverseGeocode(lat, lng);
        fetchDoctors(lat, lng);
      },
      () => {
        setLocating(false);
        setError("Location permission denied. Search for your area manually.");
      }
    );
  };

  useEffect(() => {
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter doctors by search query and specialization
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch = !searchQuery || 
      doc.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.clinicName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpec = !filterSpec || doc.specialization === filterSpec;
    return matchesSearch && matchesSpec;
  });

  // Get all unique specializations for filter dropdown
  const allSpecializations = [...new Set(doctors.map(d => d.specialization).filter(Boolean))].sort();

  const groupedClinics = Object.values(
    filteredDoctors.reduce((acc, doc) => {
      const key = String(doc.clinicId);
      if (!acc[key]) {
        acc[key] = {
          clinicId: doc.clinicId,
          clinicName: doc.clinicName,
          clinicAddress: doc.clinicAddress,
          distanceKm: doc.distanceKm,
          doctors: [],
          specializations: new Set(),
        };
      }
      acc[key].doctors.push(doc);
      if (doc.specialization) acc[key].specializations.add(doc.specialization);
      return acc;
    }, {})
  )
    .map((clinic) => ({ ...clinic, specializations: Array.from(clinic.specializations) }))
    .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

  const selectedClinic = groupedClinics.find((c) => c.clinicId === selectedClinicId) || null;

  return (
    <div className="shell py-10 fade-up" onClick={() => setShowSuggestions(false)}>
      {/* Page Header */}
      <div className="mb-8">
        <p className="section-label">Healthcare Network</p>
        <h1 className="page-title mt-1">Find Nearby Clinics</h1>
        <p className="mt-2 text-slate-500 max-w-xl">
          Clinics are grouped by location. Each clinic banner shows all available specializations.
        </p>
      </div>

      {/* Location Search Card */}
      <div className="frost-card rounded-2xl p-6 mb-8 fade-up stagger-1">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px] relative">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">📍 Your Location</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  value={placeSearch || ""}
                  onChange={(e) => handlePlaceInputChange(e.target.value)}
                  onFocus={() => placeSuggestions.length > 0 && setShowSuggestions(true)}
                  className="field"
                  placeholder={placeName || "Search for your city, area or locality..."}
                />
                {searchingPlace && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="h-4 w-4 animate-spin text-teal-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  </div>
                )}
                {/* Suggestions Dropdown */}
                {showSuggestions && placeSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 frost-card rounded-xl shadow-2xl overflow-hidden">
                    {placeSuggestions.map((place, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectPlace(place)}
                        className="w-full text-left px-4 py-3 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                      >
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{place.name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Current location display */}
            {placeName && !placeSearch && (
              <p className="mt-1.5 text-xs text-teal-600 font-medium">
                📍 Showing clinics near: <strong>{placeName}</strong>
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={useMyLocation}
              disabled={locating}
              className="btn-ghost px-4 py-2.5 text-sm flex items-center gap-2"
            >
              {locating ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : "📍"}
              {locating ? "Detecting..." : "Use GPS"}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-rose-600 font-medium">{error}</p>}
      </div>

      {/* Search & Filter */}
      {doctors.length > 0 && (
        <div className="frost-card rounded-2xl p-5 mb-6 fade-up stagger-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="🔍 Search by doctor name, clinic, or specialization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field"
              />
            </div>
            <select
              value={filterSpec}
              onChange={(e) => setFilterSpec(e.target.value)}
              className="field max-w-[200px]"
            >
              <option value="">All Specializations</option>
              {allSpecializations.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
            {(searchQuery || filterSpec) && (
              <button onClick={() => { setSearchQuery(""); setFilterSpec(""); }} className="btn-ghost px-3 py-2 text-xs">
                ✕ Clear
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Showing {filteredDoctors.length} of {doctors.length} doctors
          </p>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-64 w-full rounded-2xl" />)}
        </div>
      )}

      {/* Clinic Cards */}
      {!loading && groupedClinics.length > 0 && (
        <>
          <p className="text-sm font-semibold text-slate-500 mb-4">
            {groupedClinics.length} clinic{groupedClinics.length !== 1 ? "s" : ""} found nearby
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {groupedClinics.map((clinic, idx) => (
              <article
                key={clinic.clinicId}
                className={`clinic-card fade-up stagger-${(idx % 3) + 1}`}
                onClick={() => setSelectedClinicId(clinic.clinicId === selectedClinicId ? null : clinic.clinicId)}
              >
                {/* Clinic Banner */}
                <div className="clinic-banner">
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black tracking-tight">{clinic.clinicName}</h3>
                        <p className="text-sm text-white/70 mt-0.5">{clinic.clinicAddress}</p>
                      </div>
                      <div className="shrink-0 text-center">
                        <div className="text-2xl font-black text-teal-300">
                          {clinic.distanceKm != null ? clinic.distanceKm.toFixed(1) : "—"}
                        </div>
                        <p className="text-[9px] font-bold text-white/50 uppercase tracking-wide">km away</p>
                      </div>
                    </div>

                    {/* Specialization Tags */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {clinic.specializations.map((spec) => (
                        <span key={spec} className="spec-tag">{spec}</span>
                      ))}
                      {clinic.specializations.length === 0 && (
                        <span className="spec-tag">General Practice</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Clinic Info */}
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">
                      {clinic.doctors.length} doctor{clinic.doctors.length !== 1 ? "s" : ""} available
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedClinicId(clinic.clinicId === selectedClinicId ? null : clinic.clinicId); }}
                      className="brand-btn px-5 py-2 text-xs"
                    >
                      {clinic.clinicId === selectedClinicId ? "Hide Doctors" : "View Doctors"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {!loading && groupedClinics.length === 0 && !error && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="text-4xl mb-4">🏥</div>
          <p className="text-lg font-semibold text-slate-500">No clinics found near this location.</p>
          <p className="mt-2 text-sm text-slate-400">Try using your GPS location or adjust the coordinates.</p>
        </div>
      )}

      {/* Doctor Panel for Selected Clinic */}
      {selectedClinic && (
        <section className="frost-card mt-8 rounded-2xl overflow-hidden fade-up">
          {/* Header */}
          <div className="glass-navy px-8 py-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-teal-300">Doctors at Clinic</p>
              <h2 className="text-2xl font-black text-white mt-1">{selectedClinic.clinicName}</h2>
              <p className="text-sm text-white/60 mt-1">{selectedClinic.clinicAddress}</p>
            </div>
            <button
              onClick={() => setSelectedClinicId(null)}
              className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition-colors"
            >
              ✕ Close
            </button>
          </div>

          {/* Specialization Summary */}
          <div className="px-8 pt-5 flex flex-wrap gap-2">
            {selectedClinic.specializations.map((spec) => (
              <span key={spec} className="spec-tag-light">{spec}</span>
            ))}
          </div>

          {/* Doctor Cards */}
          <div className="p-6 grid gap-4 md:grid-cols-2">
            {selectedClinic.doctors.map((doc) => (
              <article key={doc.doctorUserId} className="frost-card rounded-2xl p-5 hover:-translate-y-1 transition-transform">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-700 font-black text-lg">
                    {(doc.doctorName || "D").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900">Dr. {doc.doctorName}</h3>
                    <span className="spec-tag-light mt-1 inline-flex">{doc.specialization || "General"}</span>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      {doc.roomId && <span>🚪 Room {doc.roomId}</span>}
                      {doc.averageRating && (
                        <span>⭐ {doc.averageRating}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  to={`/doctor/${doc.doctorUserId}?clinicId=${selectedClinic.clinicId}`}
                  className="brand-btn mt-4 block py-2.5 text-center text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  Book Appointment →
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default NearbyDoctors;
