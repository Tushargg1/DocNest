import { useLocation, Link } from "react-router-dom";

const pages = {
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "May 2026",
    content: [
      { heading: "Information We Collect", body: "We collect personal information you provide during registration (name, phone number, optional email), medical data entered through health intake, appointment history, and device information for analytics. Medical prescription images are processed for text extraction and immediately deleted after processing." },
      { heading: "How We Use Your Data", body: "Your data is used to: facilitate appointment booking, maintain medical records, provide AI-powered health insights, generate prescriptions, and send appointment reminders. We do not sell your data to third parties." },
      { heading: "Medical Data Access", body: "Your medical history is accessible only to doctors during active appointments. Doctors must have time-bound consent to access your records outside of active appointments. Consent is automatically revoked after the specified duration." },
      { heading: "Data Storage", body: "Personal data is stored in encrypted databases. Prescription images are temporarily stored on Cloudinary for text extraction and deleted automatically. Cached data in Redis is ephemeral and expires within minutes." },
      { heading: "Your Rights", body: "You can: view all data we hold about you, request correction of inaccurate data, revoke all doctor consents at any time, request deletion of your account and all associated data." },
      { heading: "Contact", body: "For privacy concerns, contact: privacy@docnest.app" },
    ],
  },
  terms: {
    title: "Terms of Service",
    lastUpdated: "May 2026",
    content: [
      { heading: "Acceptance", body: "By using DocNest, you agree to these terms. If you do not agree, do not use the platform." },
      { heading: "User Accounts", body: "You are responsible for maintaining the confidentiality of your account. Each person must register with their own phone number. Sharing accounts is prohibited." },
      { heading: "Medical Disclaimer", body: "DocNest is a technology platform that facilitates connections between patients and healthcare providers. We do not provide medical advice, diagnoses, or treatments. The AI symptom checker provides general guidance only and is not a substitute for professional medical consultation." },
      { heading: "Appointment Booking", body: "Booking an appointment through DocNest creates an agreement between you and the healthcare provider. Cancellation policies are set by individual clinics. DocNest is not liable for missed appointments or service quality." },
      { heading: "Data Accuracy", body: "You are responsible for providing accurate medical information. Inaccurate information may affect the quality of care you receive." },
      { heading: "Prohibited Use", body: "You may not: use the platform for fraudulent purposes, impersonate another person, attempt to access other users' medical records, or interfere with platform operations." },
      { heading: "Limitation of Liability", body: "DocNest is not liable for: medical outcomes, clinic service quality, appointment availability, or data loss due to circumstances beyond our control." },
      { heading: "Governing Law", body: "These terms are governed by the laws of India. Disputes shall be resolved in the courts of New Delhi, India." },
    ],
  },
  refund: {
    title: "Refund Policy",
    lastUpdated: "May 2026",
    content: [
      { heading: "Free Platform", body: "DocNest is currently a free platform. No charges are levied on patients for using the booking service." },
      { heading: "Clinic Payments", body: "Any payments made directly to clinics or doctors for consultation fees are between you and the healthcare provider. DocNest does not process these payments." },
      { heading: "Future Paid Features", body: "If paid features are introduced in the future, a detailed refund policy will be published. Users will be notified before any charges apply." },
      { heading: "Disputes", body: "For any billing disputes with healthcare providers, please contact the clinic directly. DocNest can assist in facilitating communication but is not responsible for refunds on third-party services." },
    ],
  },
  disclaimer: {
    title: "Medical Disclaimer",
    lastUpdated: "May 2026",
    content: [
      { heading: "Not Medical Advice", body: "The content on DocNest, including the AI symptom checker, health intake questionnaire, and medical history builder, is for informational purposes only. It is NOT a substitute for professional medical advice, diagnosis, or treatment." },
      { heading: "AI Limitations", body: "Our AI-powered features (symptom checker, prescription OCR, patient summary) use machine learning models that may produce inaccurate results. Always verify AI-generated information with a qualified healthcare professional." },
      { heading: "Emergency Situations", body: "If you are experiencing a medical emergency, call your local emergency services immediately (112 in India). Do not rely on this platform for emergency medical decisions." },
      { heading: "Healthcare Provider Responsibility", body: "Doctors and clinics registered on DocNest are independent healthcare providers. DocNest does not verify medical credentials or guarantee quality of care. Patients should verify their doctor's qualifications independently." },
      { heading: "No Doctor-Patient Relationship", body: "Using DocNest does not create a doctor-patient relationship between you and DocNest. Such relationships are formed directly with healthcare providers you consult through the platform." },
      { heading: "Accuracy of Information", body: "While we strive to keep medical information accurate and up-to-date, we make no warranties about the completeness, reliability, or accuracy of health information on this platform." },
    ],
  },
};

function Legal() {
  const location = useLocation();
  const page = location.pathname.replace("/", "");
  const data = pages[page];

  if (!data) {
    return (
      <div className="shell max-w-3xl py-20 text-center">
        <h1 className="text-2xl font-black text-slate-900">Page Not Found</h1>
        <Link to="/" className="brand-btn inline-block mt-4 px-6 py-2">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="shell max-w-3xl py-10 fade-up">
      <div className="frost-card rounded-2xl p-8 md:p-12">
        <h1 className="text-3xl font-black text-slate-900">{data.title}</h1>
        <p className="text-sm text-slate-400 mt-1">Last updated: {data.lastUpdated}</p>

        <div className="mt-8 space-y-6">
          {data.content.map((section, idx) => (
            <div key={idx}>
              <h2 className="text-lg font-bold text-slate-800 mb-2">{idx + 1}. {section.heading}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="divider mt-8" />
        <p className="text-xs text-slate-400">
          If you have questions about this policy, contact us at support@docnest.app
        </p>
      </div>
    </div>
  );
}

export default Legal;
