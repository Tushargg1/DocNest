import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * Modal showing QR code for an appointment check-in.
 * Patient shows this at the clinic. Doctor scans it to mark ATTENDED.
 */
function AppointmentQR({ appointment, onClose }) {
  if (!appointment) return null;

  const checkInData = JSON.stringify({
    type: "checkin",
    appointmentId: appointment.appointmentId || appointment.id,
    code: appointment.checkInCode,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="frost-card rounded-[2rem] p-8 w-full max-w-sm fade-up shadow-2xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-4xl mb-3">🎫</div>
        <h3 className="text-xl font-black text-slate-900">Check-in QR Code</h3>
        <p className="text-sm text-slate-500 mt-1">Show this to the doctor or clinic staff</p>

        <div className="my-6 p-6 bg-white rounded-2xl flex items-center justify-center">
          <QRCodeSVG value={checkInData} size={200} level="H" />
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-1">Or share this code</p>
          <p className="text-3xl font-black text-teal-800 tracking-widest">{appointment.checkInCode || "—"}</p>
        </div>

        <div className="text-left space-y-1 mb-4 text-sm">
          <p><span className="text-slate-400">Token:</span> <strong>{appointment.tokenNumber}</strong></p>
          <p><span className="text-slate-400">Time:</span> <strong>{new Date(appointment.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</strong></p>
        </div>

        <button onClick={onClose} className="brand-btn w-full py-3 text-sm">
          Close
        </button>
      </div>
    </div>
  );
}

export default AppointmentQR;
