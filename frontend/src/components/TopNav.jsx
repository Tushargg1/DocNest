import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function TopNav() {
  const { session, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const navClass = ({ isActive }) =>
    `nav-link ${isActive ? "nav-link-active" : ""}`;

  const roleIcon = {
    PATIENT: "🧑‍⚕️",
    CLINIC: "🏥",
    DOCTOR: "👨‍⚕️",
    ADMIN: "🔐",
  };

  return (
    <header className="sticky top-3 z-50 px-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between topnav-pill rounded-2xl px-3 py-2.5">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900 transition-opacity hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-400 shadow-sm">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          DocNest<span className="text-teal-500">.</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <NavLink to="/nearby" className={navClass}>
            🏥 Find Clinics
          </NavLink>
          <NavLink to="/about" className={navClass}>
            About
          </NavLink>

          {session?.role === "DOCTOR" && (
            <NavLink to="/doctor/workspace" className={navClass}>
              🩺 Doctor Panel
            </NavLink>
          )}
          {session?.role === "PATIENT" && (
            <NavLink to="/patient/visits" className={navClass}>
              📅 Appointments
            </NavLink>
          )}
          {session?.role === "PATIENT" && (
            <NavLink to="/symptoms" className={navClass}>
              🤖 Symptoms
            </NavLink>
          )}
          {session?.role === "CLINIC" && (
            <NavLink to="/clinic/workspace" className={navClass}>
              🏥 Clinic Panel
            </NavLink>
          )}
          {session?.role === "ADMIN" && (
            <NavLink to="/admin" className={navClass}>
              🔐 Admin
            </NavLink>
          )}
          {session && (
            <NavLink to="/profile" className={navClass}>
              👤 Profile
            </NavLink>
          )}

          {!session ? (
            <NavLink to="/login" className="brand-btn px-4 py-2 text-xs ml-1">
              Sign In
            </NavLink>
          ) : (
            <div className="flex items-center gap-2 ml-1">
              <span className="identity-chip">
                {roleIcon[session.role] || "👤"} {session.fullName}
              </span>
              <button onClick={logout} className="logout-btn text-xs">
                Logout
              </button>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="ml-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2 rounded-xl hover:bg-slate-100 transition"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span className={`block h-0.5 w-5 bg-slate-700 transition-all ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`block h-0.5 w-5 bg-slate-700 transition-all ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-5 bg-slate-700 transition-all ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mx-auto mt-2 max-w-6xl frost-card rounded-2xl p-4 fade-up">
          <div className="flex flex-col gap-1">
            <NavLink to="/nearby" className={navClass} onClick={() => setMenuOpen(false)}>🏥 Find Clinics</NavLink>
            <NavLink to="/about" className={navClass} onClick={() => setMenuOpen(false)}>About</NavLink>
            {session?.role === "PATIENT" && (
              <NavLink to="/patient/visits" className={navClass} onClick={() => setMenuOpen(false)}>📅 Appointments</NavLink>
            )}
            {session?.role === "PATIENT" && (
              <NavLink to="/symptoms" className={navClass} onClick={() => setMenuOpen(false)}>🤖 Symptoms</NavLink>
            )}
            {session?.role === "CLINIC" && (
              <NavLink to="/clinic/workspace" className={navClass} onClick={() => setMenuOpen(false)}>🏥 Clinic Panel</NavLink>
            )}
            {session?.role === "DOCTOR" && (
              <NavLink to="/doctor/workspace" className={navClass} onClick={() => setMenuOpen(false)}>🩺 Doctor Panel</NavLink>
            )}
            {session?.role === "ADMIN" && (
              <NavLink to="/admin" className={navClass} onClick={() => setMenuOpen(false)}>🔐 Admin</NavLink>
            )}
            {session && (
              <NavLink to="/profile" className={navClass} onClick={() => setMenuOpen(false)}>👤 Profile</NavLink>
            )}
            <div className="divider" />
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold text-slate-500">Dark Mode</span>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {darkMode ? "☀️ Light" : "🌙 Dark"}
              </button>
            </div>
            <div className="divider" />
            {!session ? (
              <Link to="/login" className="brand-btn py-2.5 text-center" onClick={() => setMenuOpen(false)}>Sign In</Link>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="identity-chip text-xs">{session.fullName} · {session.role}</span>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="logout-btn text-xs">Logout</button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default TopNav;
