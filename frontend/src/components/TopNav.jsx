import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import NotificationBell from "./NotificationBell";

function TopNav() {
  const { session, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const navClass = ({ isActive }) =>
    `nav-link ${isActive ? "nav-link-active" : ""}`;

  // Logo links to role-appropriate home
  const homeLink = !session ? "/" :
    session.role === "DOCTOR" ? "/doctor/workspace" :
    session.role === "CLINIC" ? "/clinic/workspace" :
    session.role === "ADMIN" ? "/admin" : "/";

  return (
    <header className="sticky top-3 z-50 px-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between topnav-pill rounded-2xl px-3 py-2.5">
        {/* Logo */}
        <Link
          to={homeLink}
          className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 transition-opacity hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-teal-500 to-cyan-400 shadow-sm">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          DocNest<span className="text-teal-500">.</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {(!session || session.role === "PATIENT") && (
            <NavLink to="/nearby" className={navClass}>
              {t("nav.findClinics")}
            </NavLink>
          )}

          {session?.role === "DOCTOR" && (
            <NavLink to="/doctor/workspace" className={navClass}>
              {t("nav.mySchedule")}
            </NavLink>
          )}
          {session?.role === "PATIENT" && (
            <NavLink to="/patient/visits" className={navClass}>
              {t("nav.appointments")}
            </NavLink>
          )}
          {session?.role === "PATIENT" && (
            <NavLink to="/symptoms" className={navClass}>
              {t("nav.symptoms")}
            </NavLink>
          )}
          {session?.role === "PATIENT" && (
            <NavLink to="/intake" className={navClass}>
              {t("nav.healthProfile")}
            </NavLink>
          )}
          {session?.role === "PATIENT" && (
            <NavLink to="/consent" className={navClass}>
              Consent
            </NavLink>
          )}
          {session?.role === "CLINIC" && (
            <NavLink to="/clinic/workspace" className={navClass}>
              {t("nav.dashboard")}
            </NavLink>
          )}
          {session?.role === "CLINIC" && (
            <NavLink to="/profile" className={navClass}>
              {t("nav.settings")}
            </NavLink>
          )}
          {session?.role === "ADMIN" && (
            <NavLink to="/admin" className={navClass}>
              {t("nav.admin")}
            </NavLink>
          )}
          {(session?.role === "PATIENT" || session?.role === "ADMIN") && (
            <NavLink to="/profile" className={navClass}>
              {t("nav.profile")}
            </NavLink>
          )}

          {!session ? (
            <NavLink to="/login" className="brand-btn px-4 py-2 text-xs ml-1">
              {t("nav.signIn")}
            </NavLink>
          ) : (
            <div className="flex items-center gap-2 ml-1">
              <NotificationBell />
              <span className="identity-chip">
                {session.fullName}
              </span>
              <button onClick={logout} className="logout-btn text-xs">
                {t("nav.logout")}
              </button>
            </div>
          )}

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="ml-2 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
            title={language === "en" ? "Switch to Hindi" : "Switch to English"}
            aria-label={language === "en" ? "Switch to Hindi" : "Switch to English"}
          >
            {language === "en" ? (
              <span>EN | <span className="text-teal-600 dark:text-teal-400">हिं</span></span>
            ) : (
              <span><span className="text-teal-600 dark:text-teal-400">हिं</span> | EN</span>
            )}
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="ml-1 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={darkMode ? t("nav.lightMode") : t("nav.darkMode")}
          >
            {darkMode ? (
              <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={t("nav.menu")}
        >
          <span className={`block h-0.5 w-5 bg-slate-700 dark:bg-slate-300 transition-all ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`block h-0.5 w-5 bg-slate-700 dark:bg-slate-300 transition-all ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-5 bg-slate-700 dark:bg-slate-300 transition-all ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mx-auto mt-2 max-w-6xl frost-card rounded-2xl p-4 fade-up">
          <div className="flex flex-col gap-1">
            {(!session || session.role === "PATIENT") && (
              <NavLink to="/nearby" className={navClass} onClick={() => setMenuOpen(false)}>{t("nav.findClinics")}</NavLink>
            )}
            {session?.role === "PATIENT" && (
              <NavLink to="/patient/visits" className={navClass} onClick={() => setMenuOpen(false)}>{t("nav.appointments")}</NavLink>
            )}
            {session?.role === "PATIENT" && (
              <NavLink to="/symptoms" className={navClass} onClick={() => setMenuOpen(false)}>{t("nav.symptoms")}</NavLink>
            )}
            {session?.role === "PATIENT" && (
              <NavLink to="/intake" className={navClass} onClick={() => setMenuOpen(false)}>{t("nav.healthProfile")}</NavLink>
            )}
            {session?.role === "PATIENT" && (
              <NavLink to="/consent" className={navClass} onClick={() => setMenuOpen(false)}>Consent</NavLink>
            )}
            {session?.role === "CLINIC" && (
              <NavLink to="/clinic/workspace" className={navClass} onClick={() => setMenuOpen(false)}>{t("nav.dashboard")}</NavLink>
            )}
            {session?.role === "CLINIC" && (
              <NavLink to="/profile" className={navClass} onClick={() => setMenuOpen(false)}>{t("nav.settings")}</NavLink>
            )}
            {session?.role === "DOCTOR" && (
              <NavLink to="/doctor/workspace" className={navClass} onClick={() => setMenuOpen(false)}>{t("nav.mySchedule")}</NavLink>
            )}
            {session?.role === "ADMIN" && (
              <NavLink to="/admin" className={navClass} onClick={() => setMenuOpen(false)}>{t("nav.admin")}</NavLink>
            )}
            {(session?.role === "PATIENT" || session?.role === "ADMIN") && (
              <NavLink to="/profile" className={navClass} onClick={() => setMenuOpen(false)}>{t("nav.profile")}</NavLink>
            )}
            <div className="divider" />
            {/* Language Toggle - Mobile */}
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Language</span>
              <button
                onClick={toggleLanguage}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {language === "en" ? "EN | हिं" : "हिं | EN"}
              </button>
            </div>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t("nav.darkMode")}</span>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xs font-bold"
              >
                {darkMode ? t("nav.lightMode") : t("nav.darkMode")}
              </button>
            </div>
            <div className="divider" />
            {!session ? (
              <Link to="/login" className="brand-btn py-2.5 text-center" onClick={() => setMenuOpen(false)}>{t("nav.signIn")}</Link>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="identity-chip text-xs">{session.fullName} · {session.role}</span>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="logout-btn text-xs">{t("nav.logout")}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default TopNav;
