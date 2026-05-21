import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../services/api";

/**
 * QR Scanner used by doctors/clinic staff to check-in patients.
 * Falls back to manual code entry if camera is denied.
 */
function QRScanner({ onSuccess, onClose }) {
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);
  const scannerRef = useRef(null);
  const elementId = "qr-reader-container";

  useEffect(() => {
    const html5Qr = new Html5Qrcode(elementId);
    scannerRef.current = html5Qr;

    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (cameras && cameras.length > 0) {
          const cameraId = cameras[cameras.length - 1].id; // back camera usually last
          html5Qr.start(
            cameraId,
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decoded) => handleScan(decoded),
            () => { /* ignore per-frame errors */ }
          ).then(() => setScanning(true)).catch(() => setError("Camera permission denied. Use manual code below."));
        } else {
          setError("No camera found. Use manual code below.");
        }
      })
      .catch(() => setError("Camera not accessible. Use manual code below."));

    return () => {
      try {
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
      } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScan = async (decodedText) => {
    let code = decodedText;
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.code) code = parsed.code;
    } catch { /* not JSON, use as-is */ }
    submitCode(code);
  };

  const submitCode = async (code) => {
    if (!code) return;
    setError("");
    try {
      const { data } = await api.post("/appointments/check-in", { checkInCode: code.trim().toUpperCase() });
      setResultMsg(`✅ Patient checked in! Token ${data.tokenNumber}`);
      // Stop scanning
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop().catch(() => {});
      }
      onSuccess && onSuccess(data);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Invalid code or already checked in");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="frost-card rounded-[2rem] p-6 w-full max-w-md fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-900">📷 Scan Patient QR</h3>
          <button onClick={onClose} className="btn-ghost px-3 py-1 text-xs">✕</button>
        </div>

        {/* Camera scanner */}
        <div id={elementId} className="rounded-xl overflow-hidden mb-4" style={{ minHeight: scanning ? 280 : 0 }} />

        {!scanning && !error && (
          <div className="text-center py-8 text-slate-400 text-sm">Starting camera...</div>
        )}

        {error && (
          <div className="alert-warning text-xs mb-3">{error}</div>
        )}

        {/* Manual code entry */}
        <div className="border-t border-slate-100 pt-4 mt-2">
          <p className="text-xs font-bold text-slate-500 mb-2">Or enter the 6-letter code manually:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              className="field text-center font-mono tracking-widest"
              maxLength={8}
            />
            <button
              onClick={() => submitCode(manualCode)}
              disabled={!manualCode}
              className="brand-btn px-4 py-2 text-xs disabled:opacity-50"
            >
              Check In
            </button>
          </div>
        </div>

        {resultMsg && (
          <div className="alert-success mt-4 text-sm font-semibold">{resultMsg}</div>
        )}
      </div>
    </div>
  );
}

export default QRScanner;
