import { Link } from "react-router-dom";

function About() {
  return (
    <section className="shell py-10 fade-up">
      <div className="frost-card overflow-hidden rounded-[2.5rem] p-8 md:p-12 lg:p-16">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <span className="inline-block rounded-full bg-cyan-100/70 px-4 py-1 text-sm font-semibold text-cyan-900">
              About Us
            </span>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 md:text-6xl">
              We make clinic care feel organized, fast, and human.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              DocNest is built to connect patients, doctors, and clinics in one place. Our goal is to
              reduce waiting, remove friction from booking, and make everyday healthcare coordination feel
              simple from the first search to the final visit.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/nearby" className="brand-btn px-6 py-3 text-sm">
                Find Doctors
              </Link>
              <Link to="/login" className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900">
                Get Started
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Mission</p>
              <p className="mt-4 text-lg leading-7 text-slate-100">
                Simplify clinic discovery and appointment management for every user role.
              </p>
            </div>
            <div className="rounded-3xl bg-teal-600 p-6 text-white shadow-lg">
              <p className="text-sm uppercase tracking-[0.2em] text-teal-100">Focus</p>
              <p className="mt-4 text-lg leading-7 text-teal-50">
                Better booking, clearer profiles, and faster access to care.
              </p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200 sm:col-span-2">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">What we support</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <h2 className="font-black text-slate-900">Patients</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Find doctors, book visits, and review history.</p>
                </div>
                <div>
                  <h2 className="font-black text-slate-900">Doctors</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Manage availability, profiles, and patient records.</p>
                </div>
                <div>
                  <h2 className="font-black text-slate-900">Admins</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Keep the platform clean, visible, and reliable.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;