import { Link } from "react-router-dom";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200/80 bg-white/50 backdrop-blur-md">
      <div className="shell py-10">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-400">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              DocNest<span className="text-teal-500">.</span>
            </Link>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-xs">
              AI-powered healthcare platform connecting patients with verified clinics and doctors.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Platform Active
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Platform</p>
            <div className="space-y-2">
              <Link to="/nearby" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Find Clinics</Link>
              <Link to="/login" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Sign In</Link>
              <Link to="/register" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Register</Link>
              <Link to="/apply/clinic" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Register as Clinic</Link>
              <Link to="/symptoms" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Symptom Checker</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Legal</p>
            <div className="space-y-2">
              <Link to="/privacy" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Terms of Service</Link>
              <Link to="/refund" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Refund Policy</Link>
              <Link to="/disclaimer" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Medical Disclaimer</Link>
            </div>
          </div>

          {/* Data & Privacy */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Data Privacy</p>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">&#10003;</span>
                <span>No email required to register</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">&#10003;</span>
                <span>Medical data encrypted at rest</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">&#10003;</span>
                <span>History shared only during appointments</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">&#10003;</span>
                <span>Consent-based doctor access</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">&#10003;</span>
                <span>FHIR R4 / ABDM ready</span>
              </div>
            </div>
          </div>
        </div>

        <div className="divider mt-8" />

        {/* Bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <p>&copy; {year} DocNest Healthcare Technologies. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:text-slate-600 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-600 transition-colors">Terms</Link>
            <Link to="/disclaimer" className="hover:text-slate-600 transition-colors">Disclaimer</Link>
            <span>Made in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
