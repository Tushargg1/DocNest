import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const steps = [
  { icon: "🏥", title: "Find Nearby Clinics", desc: "Discover verified clinics with all available specializations listed on their banner." },
  { icon: "📅", title: "Book a Slot", desc: "Choose your doctor and time slot. Get an instant personal token number." },
  { icon: "🎫", title: "Arrive 15 min Early", desc: "Wait for your token to be called. Privacy-first: clinics only see your name & phone." },
  { icon: "📝", title: "Doctor Prescription", desc: "Doctor writes prescription digitally. Upload a photo copy for future reference." },
];

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "text-teal-600 bg-teal-50",
    title: "Geo-Discovery",
    desc: "Find verified clinics near you with live GPS tracking. See all specializations at a glance.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: "text-emerald-600 bg-emerald-50",
    title: "Privacy First",
    desc: "Your medical history is shared ONLY during your active appointment. Clinics see only name & phone afterwards.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
    color: "text-blue-600 bg-blue-50",
    title: "Smart Tokens",
    desc: "Each doctor has unique tokens (D001, D002...). Slots lock automatically when booked — no double-booking.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    color: "text-amber-600 bg-amber-50",
    title: "Revisit Reminders",
    desc: "Doctor prescribes a revisit date? We remind you 1 day before to book your follow-up appointment.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: "text-purple-600 bg-purple-50",
    title: "Digital Prescriptions",
    desc: "Upload prescription photos to your medical passport. Access all past treatments securely, anytime.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    color: "text-rose-600 bg-rose-50",
    title: "Medical Passport",
    desc: "One profile with allergies, current medications, past treatments — fully under your control.",
  },
];

function Home() {
  const { session } = useAuth();

  return (
    <div className="pb-16">
      {/* Hero Section */}
      <section className="shell py-12 fade-up">
        <div className="hero-shell rounded-xl overflow-hidden p-8 md:p-14 lg:p-16 text-white">
          {/* Background decorations */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-cyan-300/5 blur-2xl" />
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
            {/* Text Content */}
            <div className="flex-1 max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-bold text-teal-200 uppercase tracking-widest mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
                Next-Gen Healthcare Network · India
              </span>

              <h1 className="text-5xl md:text-6xl font-black leading-[1.05] tracking-tight">
                Smarter Care,<br />
                <span className="text-transparent bg-clip-text text-teal-300">
                  Closer To You
                </span>
              </h1>

              <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-lg">
                DocNest connects patients with verified clinics. Book slots, get personal tokens, 
                share history securely — all in one place. No email required to start.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  to="/nearby"
                  className="group relative overflow-hidden rounded-2xl bg-white px-8 py-4 font-bold text-slate-900 transition-all hover:scale-105 active:scale-95 "
                >
                  <span className="relative z-10">🏥 Find Clinics Near Me</span>
                  <div className="absolute inset-0 -translate-x-full bg-teal-50 transition-transform duration-300 group-hover:translate-x-0" />
                </Link>
                {!session && (
                  <Link
                    to="/register"
                    className="rounded-2xl border-2 border-white/25 bg-white/8 px-8 py-4 font-bold text-white transition-all hover:bg-white/15 hover:border-white/40"
                  >
                    Create Account Free →
                  </Link>
                )}
                {session && (
                  <Link
                    to="/profile"
                    className="rounded-2xl border-2 border-white/25 bg-white/8 px-8 py-4 font-bold text-white transition-all hover:bg-white/15"
                  >
                    My Medical Passport →
                  </Link>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> No email required to register</span>
                <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Login with phone + password</span>
                <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Medical data fully private</span>
              </div>
            </div>

            {/* Right: Journey Steps */}
            <div className="flex-1 max-w-sm w-full">
              <div className="glass-navy rounded-3xl p-6 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-teal-300 mb-4">How It Works</p>
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
                      {step.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{step.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="shell py-6">
        <div className="text-center mb-10 fade-up">
          <p className="section-label">Platform Features</p>
          <h2 className="section-title mt-2">Everything You Need</h2>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto">
            Designed for the complete patient journey — from discovering a clinic to uploading your prescription.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feat, i) => (
            <article
              key={i}
              className={`frost-card rounded-2xl p-7 hover:-translate-y-1.5 transition-all duration-300 fade-up stagger-${(i % 3) + 1}`}
            >
              <div className={`h-12 w-12 rounded-2xl ${feat.color} flex items-center justify-center mb-5`}>
                {feat.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{feat.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      {!session && (
        <section className="shell py-6 fade-up">
          <div className="frost-card-dark rounded-xl p-10 md:p-14 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Ready to take control of your <span className="text-teal-400">health?</span>
            </h2>
            <p className="mt-4 text-slate-400 max-w-md mx-auto">
              Register with just your name and phone number. Add email later if you want.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <Link to="/register" className="brand-btn px-8 py-4 text-sm">
                Register as Patient
              </Link>
              <Link to="/nearby" className="btn-ghost px-8 py-4 text-sm">
                Browse Clinics First
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default Home;


