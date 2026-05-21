import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function NearbyDoctors() {
  const { session } = useAuth();
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
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [likedClinics, setLikedClinics] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("liked-clinics") || "[]")); }
    catch { return new Set(); }
  });
  const searchTimeout = useRef(null);

  const toggleLikeClinic = (clinicId, e) => {
    if (e) e.stopPropagation();
    setLikedClinics(prev => {
      const next = new Set(prev);
      if (next.has(clinicId)) next.delete(clinicId); else next.add(clinicId);
      localStorage.setItem("liked-clinics", JSON.stringify([...next]));
      return next;
    });
  };

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

  // Filter doctors by search query, specialization, and favorites
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch = !searchQuery || 
      doc.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.clinicName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpec = !filterSpec || doc.specialization === filterSpec;
    const matchesFav = !showFavoritesOnly || likedClinics.has(doc.clinicId);
    return matchesSearch && matchesSpec && matchesFav;
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
    .map((clinic) => {
      // Compute clinic-level average rating from all doctors
      const ratedDocs = clinic.doctors.filter(d => d.averageRating > 0);
      const clinicRating = ratedDocs.length > 0
        ? ratedDocs.reduce((sum, d) => sum + d.averageRating, 0) / ratedDocs.length
        : 0;
      return { ...clinic, specializations: Array.from(clinic.specializations), clinicRating: Math.round(clinicRating * 10) / 10 };
    })
    .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

  return (
    <div className="shell py-10 fade-up" onClick={() => setShowSuggestions(false)}>
      {/* Page Header + Compact Location */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label">Healthcare Network</p>
          <h1 className="page-title mt-1">Find Nearby Clinics</h1>
        </div>
        {/* Compact location picker */}
        <div className="relative min-w-[260px] max-w-[340px]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={placeSearch || ""}
                onChange={(e) => handlePlaceInputChange(e.target.value)}
                onFocus={() => placeSuggestions.length > 0 && setShowSuggestions(true)}
                className="field text-sm py-2"
                placeholder={placeName || "Search location..."}
              />
              {showSuggestions && placeSuggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  {placeSuggestions.map((place, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectPlace(place)}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 text-sm"
                    >
                      {place.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={useMyLocation}
              disabled={locating}
              className="btn-ghost px-3 py-2 text-xs shrink-0"
              title="Use GPS"
            >
              {locating ? "..." : "GPS"}
            </button>
          </div>
          {placeName && !placeSearch && (
            <p className="mt-1 text-[11px] text-teal-600 font-medium truncate">Near: {placeName}</p>
          )}
        </div>
      </div>

      {error && <div className="alert-error mb-4"><p className="text-sm">{error}</p></div>}

      {/* Search & Filter */}
      {doctors.length > 0 && (
        <div className="frost-card rounded-xl p-4 mb-6 fade-up stagger-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by doctor name, clinic, or specialization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field text-sm py-2"
              />
            </div>
            <select
              value={filterSpec}
              onChange={(e) => setFilterSpec(e.target.value)}
              className="field max-w-[180px] text-sm py-2"
            >
              <option value="">All Specializations</option>
              {allSpecializations.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
            {session && session.role === "PATIENT" && (
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`btn-ghost px-3 py-2 text-xs flex items-center gap-1.5 ${showFavoritesOnly ? "border-teal-500 text-teal-600 bg-teal-50" : ""}`}
              >
                <svg className="h-3.5 w-3.5" fill={showFavoritesOnly ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                Favorites{likedClinics.size > 0 ? ` (${likedClinics.size})` : ""}
              </button>
            )}
            {(searchQuery || filterSpec || showFavoritesOnly) && (
              <button onClick={() => { setSearchQuery(""); setFilterSpec(""); setShowFavoritesOnly(false); }} className="btn-ghost px-3 py-2 text-xs">
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Showing {filteredDoctors.length} of {doctors.length} doctors
            {showFavoritesOnly && " (favorites only)"}
          </p>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-64 w-full rounded-2xl" />)}
        </div>
      )}

      {/* Clinic Cards — expand inline on click */}
      {!loading && groupedClinics.length > 0 && (
        <>
          <p className="text-sm font-medium text-slate-500 mb-4">
            {groupedClinics.length} clinic{groupedClinics.length !== 1 ? "s" : ""} found nearby
          </p>
          <div className="space-y-4">
            {groupedClinics.map((clinic) => {
              const isExpanded = selectedClinicId === clinic.clinicId;
              const isLiked = likedClinics.has(clinic.clinicId);
              return (
                <article key={clinic.clinicId} className={`frost-card overflow-hidden transition-all ${isExpanded ? "ring-2 ring-teal-200" : ""}`}>
                  {/* Clinic Header — always visible */}
                  <div
                    className="flex items-center justify-between gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setSelectedClinicId(isExpanded ? null : clinic.clinicId)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Expand arrow */}
                      <svg className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">{clinic.clinicName}</h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{clinic.clinicAddress}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {clinic.specializations.map((spec) => (
                            <span key={spec} className="spec-tag-light">{spec}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Clinic rating */}
                      {clinic.clinicRating > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <svg className="h-4 w-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                          <span className="font-semibold text-slate-700">{clinic.clinicRating}</span>
                        </div>
                      )}
                      {/* Like button */}
                      <button
                        onClick={(e) => toggleLikeClinic(clinic.clinicId, e)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition"
                        title={isLiked ? "Remove from favorites" : "Add to favorites"}
                      >
                        <svg className={`h-5 w-5 ${isLiked ? "text-red-500 fill-red-500" : "text-slate-300 hover:text-slate-400"}`} fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      </button>
                      {/* Distance */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-teal-600">{clinic.distanceKm != null ? clinic.distanceKm.toFixed(1) : "—"}</p>
                        <p className="text-[10px] text-slate-400 uppercase">km</p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Clinic details + doctors */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-slate-600">
                          {clinic.doctors.length} doctor{clinic.doctors.length !== 1 ? "s" : ""} available
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {clinic.doctors.map((doc) => (
                          <div key={doc.doctorUserId} className="bg-white rounded-lg border border-slate-200 p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 font-bold text-sm">
                                {(doc.doctorName || "D").charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 text-sm">Dr. {doc.doctorName}</p>
                                <p className="text-xs text-teal-600 mt-0.5">{doc.specialization || "General"}</p>
                                <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                                  {doc.roomId && <span>Room {doc.roomId}</span>}
                                  {doc.averageRating > 0 && <span>{doc.averageRating} rating</span>}
                                </div>
                              </div>
                            </div>
                            <Link
                              to={`/doctor/${doc.doctorUserId}?clinicId=${clinic.clinicId}`}
                              className="brand-btn mt-3 block py-2 text-center text-xs w-full"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Book Appointment
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      {!loading && groupedClinics.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <p className="text-lg font-semibold text-slate-500">No clinics found near this location.</p>
          <p className="mt-2 text-sm text-slate-400">Try using your GPS location or search for a different area.</p>
        </div>
      )}
    </div>
  );
}

export default NearbyDoctors;

