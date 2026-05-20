import { Link } from "react-router-dom";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200/80 bg-white/50 backdrop-blur-md">
      <div className="shell py-10">
        <div className="grid gap-8 md:grid-cols-3">
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
              Connecting patients with verified clinics. Book slots, manage health records, and stay on top of your care.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Network Active
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Platform</p>
              <div className="space-y-2">
                <Link to="/nearby" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Find Clinics</Link>
                <Link to="/login" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Sign In</Link>
                <Link to="/register" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Register</Link>
                <Link to="/about" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">About Us</Link>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Partners</p>
              <div className="space-y-2">
                <Link to="/apply/clinic" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Apply as Clinic</Link>
                <Link to="/profile" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Clinic Dashboard</Link>
                <Link to="/doctor/workspace" className="block text-sm text-slate-600 hover:text-teal-600 transition-colors">Doctor Portal</Link>
              </div>
            </div>
          </div>

          {/* Privacy Promise */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Privacy Promise</p>
            <div className="space-y-2">
              {[
                "Email is never mandatory",
                "Login with phone + password",
                "Medical history shared only during active appointments",
                "Clinic sees name & phone only after visit",
                "No treatment history visible to others",
              ].map((point) => (
                <div key={point} className="flex items-start gap-2 text-xs text-slate-500">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="divider mt-8" />

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {year} DocNest. Healthcare simplified.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;