package com.doctpjt.clinicapp.service;

import ca.uhn.fhir.context.FhirContext;
import com.doctpjt.clinicapp.entity.PatientProfile;
import com.doctpjt.clinicapp.entity.Role;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.entity.VisitRecord;
import com.doctpjt.clinicapp.repository.PatientProfileRepository;
import com.doctpjt.clinicapp.repository.UserRepository;
import com.doctpjt.clinicapp.repository.VisitRecordRepository;
import java.util.List;
import org.hl7.fhir.r4.model.BaseResource;
import org.hl7.fhir.r4.model.Bundle;
import org.hl7.fhir.r4.model.CodeableConcept;
import org.hl7.fhir.r4.model.ContactPoint;
import org.hl7.fhir.r4.model.Encounter;
import org.hl7.fhir.r4.model.Extension;
import org.hl7.fhir.r4.model.HumanName;
import org.hl7.fhir.r4.model.Identifier;
import org.hl7.fhir.r4.model.Patient;
import org.hl7.fhir.r4.model.Reference;
import org.hl7.fhir.r4.model.StringType;
import org.springframework.stereotype.Service;

@Service
public class FhirMappingService {

    private static final String ABHA_SYSTEM = "https://healthid.ndhm.gov.in/abha";
    private static final String MEDICATIONS_EXTENSION_URL = "https://docnest.ai/fhir/StructureDefinition/current-medications";
    private static final String HISTORY_EXTENSION_URL = "https://docnest.ai/fhir/StructureDefinition/disease-history";

    private final FhirContext fhirContext = FhirContext.forR4();
    private final UserRepository userRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final VisitRecordRepository visitRecordRepository;

    public FhirMappingService(
        UserRepository userRepository,
        PatientProfileRepository patientProfileRepository,
        VisitRecordRepository visitRecordRepository
    ) {
        this.userRepository = userRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.visitRecordRepository = visitRecordRepository;
    }

    public Patient toFhirPatient(Long patientUserId) {
        User user = userRepository.findById(patientUserId)
            .orElseThrow(() -> new IllegalArgumentException("Patient user not found"));

        if (user.getRole() != Role.PATIENT) {
            throw new IllegalArgumentException("Requested user is not a patient");
        }

        PatientProfile profile = patientProfileRepository.findByUserId(patientUserId).orElse(null);

        Patient patient = new Patient();
        patient.setId("Patient/" + patientUserId);
        patient.setActive(true);

        patient.addIdentifier(new Identifier()
            .setSystem(ABHA_SYSTEM)
            .setValue(resolveAbhaId(patientUserId, profile)));

        patient.addIdentifier(new Identifier()
            .setSystem("urn:docnest:user-id")
            .setValue(String.valueOf(patientUserId)));

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            patient.addIdentifier(new Identifier().setSystem("mailto").setValue(user.getEmail()));
            patient.addTelecom(new ContactPoint()
                .setSystem(ContactPoint.ContactPointSystem.EMAIL)
                .setValue(user.getEmail()));
        }

        HumanName name = new HumanName().setText(user.getFullName());
        patient.addName(name);

        if (profile != null) {
            if (profile.getBloodGroup() != null && !profile.getBloodGroup().isBlank()) {
                patient.addExtension(new Extension("https://docnest.ai/fhir/StructureDefinition/blood-group", new StringType(profile.getBloodGroup())));
            }
            if (profile.getAllergies() != null && !profile.getAllergies().isBlank()) {
                patient.addExtension(new Extension("https://docnest.ai/fhir/StructureDefinition/allergies", new StringType(profile.getAllergies())));
            }
            if (profile.getEmergencyContact() != null && !profile.getEmergencyContact().isBlank()) {
                patient.addExtension(new Extension("https://docnest.ai/fhir/StructureDefinition/emergency-contact", new StringType(profile.getEmergencyContact())));
            }
        }

        return patient;
    }

    public Encounter toFhirEncounter(VisitRecord visit) {
        Encounter encounter = new Encounter();
        encounter.setId("Encounter/" + visit.getId());
        encounter.setStatus(Encounter.EncounterStatus.FINISHED);

        encounter.setSubject(new Reference("Patient/" + visit.getPatientUserId()));
        encounter.addParticipant()
            .setIndividual(new Reference("Practitioner/" + visit.getDoctorUserId()));

        if (visit.getDiagnosis() != null && !visit.getDiagnosis().isBlank()) {
            encounter.addReasonCode(new CodeableConcept().setText(visit.getDiagnosis()));
        }

        if (visit.getMedications() != null && !visit.getMedications().isBlank()) {
            encounter.addExtension(new Extension(MEDICATIONS_EXTENSION_URL, new StringType(visit.getMedications())));
        }

        if (visit.getDiseaseHistory() != null && !visit.getDiseaseHistory().isBlank()) {
            encounter.addExtension(new Extension(HISTORY_EXTENSION_URL, new StringType(visit.getDiseaseHistory())));
        }

        return encounter;
    }

    public Bundle toPatientRecordBundle(Long patientUserId) {
        Patient patient = toFhirPatient(patientUserId);
        List<VisitRecord> visits = visitRecordRepository.findByPatientUserIdOrderByVisitDateDesc(patientUserId);

        Bundle bundle = new Bundle();
        bundle.setType(Bundle.BundleType.COLLECTION);
        bundle.setId("Bundle/patient-record-" + patientUserId);

        bundle.addEntry()
            .setFullUrl("Patient/" + patientUserId)
            .setResource(patient);

        for (VisitRecord visit : visits) {
            Encounter encounter = toFhirEncounter(visit);
            bundle.addEntry()
                .setFullUrl("Encounter/" + visit.getId())
                .setResource(encounter);
        }

        return bundle;
    }

    public String getPatientRecordFhirJson(Long patientUserId) {
        return convertToFhirJson(toPatientRecordBundle(patientUserId));
    }

    public String convertToFhirJson(BaseResource resource) {
        return fhirContext
            .newJsonParser()
            .setPrettyPrint(true)
            .encodeResourceToString(resource);
    }

    private String resolveAbhaId(Long patientUserId, PatientProfile profile) {
        if (profile != null && profile.getAbhaId() != null && !profile.getAbhaId().isBlank()) {
            return profile.getAbhaId();
        }
        return "ABHA-NOT-REGISTERED-" + patientUserId;
    }
}