import api from "./api";

export const consentApi = {
  /** Doctor requests consent from a patient */
  requestConsent(patientId) {
    return api.post("/consent/request", { patientId });
  },

  /** Patient approves a pending consent request */
  approveConsent(consentId, durationHours = 24) {
    return api.put(`/consent/${consentId}/approve`, { durationHours });
  },

  /** Patient denies a pending consent request */
  denyConsent(consentId) {
    return api.put(`/consent/${consentId}/deny`);
  },

  /** Patient revokes all active consent */
  revokeAll() {
    return api.put("/consent/revoke-all");
  },

  /** Patient: get pending consent requests */
  getPatientPending() {
    return api.get("/consent/patient/pending");
  },

  /** Patient: get active consents */
  getPatientActive() {
    return api.get("/consent/patient/active");
  },

  /** Doctor: check consent status for a patient */
  checkConsent(patientId) {
    return api.get(`/consent/check/${patientId}`);
  },
};

export default consentApi;
