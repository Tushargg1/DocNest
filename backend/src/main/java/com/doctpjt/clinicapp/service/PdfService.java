package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.entity.Clinic;
import com.doctpjt.clinicapp.entity.DoctorProfile;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.entity.VisitRecord;
import com.doctpjt.clinicapp.repository.ClinicRepository;
import com.doctpjt.clinicapp.repository.DoctorProfileRepository;
import com.doctpjt.clinicapp.repository.UserRepository;
import com.doctpjt.clinicapp.repository.VisitRecordRepository;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class PdfService {

    private static final DeviceRgb BRAND_TEAL = new DeviceRgb(14, 165, 165);
    private static final DeviceRgb LIGHT_BG = new DeviceRgb(248, 250, 255);

    private final VisitRecordRepository visitRecordRepository;
    private final UserRepository userRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final ClinicRepository clinicRepository;

    public PdfService(
        VisitRecordRepository visitRecordRepository,
        UserRepository userRepository,
        DoctorProfileRepository doctorProfileRepository,
        ClinicRepository clinicRepository
    ) {
        this.visitRecordRepository = visitRecordRepository;
        this.userRepository = userRepository;
        this.doctorProfileRepository = doctorProfileRepository;
        this.clinicRepository = clinicRepository;
    }

    public byte[] generatePrescriptionPdf(Long visitId) {
        VisitRecord visit = visitRecordRepository.findById(visitId)
            .orElseThrow(() -> new IllegalArgumentException("Visit record not found"));

        User doctor = userRepository.findById(visit.getDoctorUserId()).orElse(null);
        User patient = userRepository.findById(visit.getPatientUserId()).orElse(null);
        DoctorProfile profile = doctorProfileRepository.findByUserId(visit.getDoctorUserId()).orElse(null);
        Clinic clinic = (profile != null && profile.getClinicId() != null)
            ? clinicRepository.findById(profile.getClinicId()).orElse(null)
            : null;

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdfDoc = new PdfDocument(new PdfWriter(baos));
        Document doc = new Document(pdfDoc);

        // Header
        addClinicHeader(doc, clinic, doctor, profile);
        doc.add(new Paragraph("\n"));

        // Patient Info
        Table patientTable = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
            .useAllAvailableWidth();
        patientTable.addCell(infoCell("Patient", patient != null ? patient.getFullName() : "Unknown"));
        patientTable.addCell(infoCell("Date", visit.getVisitDate() != null ? visit.getVisitDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : LocalDate.now().toString()));
        doc.add(patientTable);
        doc.add(new Paragraph("\n"));

        // Rx Symbol
        doc.add(new Paragraph("℞")
            .setFontSize(28)
            .setBold()
            .setFontColor(BRAND_TEAL));

        // Diagnosis
        if (visit.getDiagnosis() != null && !visit.getDiagnosis().isBlank()) {
            doc.add(new Paragraph("Diagnosis").setBold().setFontSize(11).setFontColor(ColorConstants.GRAY));
            doc.add(new Paragraph(visit.getDiagnosis()).setFontSize(12));
            doc.add(new Paragraph("\n"));
        }

        // Medications
        if (visit.getMedications() != null && !visit.getMedications().isBlank()) {
            doc.add(new Paragraph("Medications").setBold().setFontSize(11).setFontColor(ColorConstants.GRAY));
            for (String med : visit.getMedications().split("[,\\n]")) {
                String trimmed = med.trim();
                if (!trimmed.isEmpty()) {
                    doc.add(new Paragraph("• " + trimmed).setFontSize(12).setMarginLeft(10));
                }
            }
            doc.add(new Paragraph("\n"));
        }

        // Notes
        if (visit.getDiseaseHistory() != null && !visit.getDiseaseHistory().isBlank()) {
            doc.add(new Paragraph("Notes / History").setBold().setFontSize(11).setFontColor(ColorConstants.GRAY));
            doc.add(new Paragraph(visit.getDiseaseHistory()).setFontSize(11));
            doc.add(new Paragraph("\n"));
        }

        // Revisit
        if (visit.getRevisitDate() != null) {
            doc.add(new Paragraph("Follow-up Date: " + visit.getRevisitDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy")))
                .setBold().setFontSize(11).setFontColor(BRAND_TEAL));
        }

        // Footer
        doc.add(new Paragraph("\n\n"));
        doc.add(new Paragraph("Doctor's Signature: ____________________")
            .setFontSize(10).setTextAlignment(TextAlignment.RIGHT));
        doc.add(new Paragraph("Generated by DocNest • " + LocalDate.now())
            .setFontSize(8).setFontColor(ColorConstants.GRAY).setTextAlignment(TextAlignment.CENTER));

        doc.close();
        return baos.toByteArray();
    }

    public byte[] generatePatientHistoryPdf(Long patientUserId) {
        User patient = userRepository.findById(patientUserId)
            .orElseThrow(() -> new IllegalArgumentException("Patient not found"));

        List<VisitRecord> visits = visitRecordRepository.findByPatientUserIdOrderByVisitDateDesc(patientUserId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdfDoc = new PdfDocument(new PdfWriter(baos));
        Document doc = new Document(pdfDoc);

        // Title
        doc.add(new Paragraph("Medical History Report")
            .setFontSize(20).setBold().setFontColor(BRAND_TEAL).setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph(patient.getFullName())
            .setFontSize(14).setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("Generated: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")))
            .setFontSize(9).setFontColor(ColorConstants.GRAY).setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("\n"));

        if (visits.isEmpty()) {
            doc.add(new Paragraph("No visit records found.").setFontColor(ColorConstants.GRAY));
        } else {
            // Visit Table
            Table table = new Table(UnitValue.createPercentArray(new float[]{1.5f, 2, 3, 3}))
                .useAllAvailableWidth();

            // Header row
            table.addHeaderCell(headerCell("Date"));
            table.addHeaderCell(headerCell("Doctor"));
            table.addHeaderCell(headerCell("Diagnosis"));
            table.addHeaderCell(headerCell("Medications"));

            for (VisitRecord visit : visits) {
                User visitDoctor = userRepository.findById(visit.getDoctorUserId()).orElse(null);
                table.addCell(dataCell(visit.getVisitDate() != null ? visit.getVisitDate().format(DateTimeFormatter.ofPattern("dd/MM/yy")) : "—"));
                table.addCell(dataCell(visitDoctor != null ? "Dr. " + visitDoctor.getFullName() : "—"));
                table.addCell(dataCell(visit.getDiagnosis() != null ? visit.getDiagnosis() : "—"));
                table.addCell(dataCell(visit.getMedications() != null ? visit.getMedications() : "—"));
            }

            doc.add(table);
        }

        // Footer
        doc.add(new Paragraph("\n\n"));
        doc.add(new Paragraph("This report is auto-generated by DocNest and is for informational purposes only.")
            .setFontSize(8).setFontColor(ColorConstants.GRAY).setTextAlignment(TextAlignment.CENTER));

        doc.close();
        return baos.toByteArray();
    }

    private void addClinicHeader(Document doc, Clinic clinic, User doctor, DoctorProfile profile) {
        String clinicName = clinic != null ? clinic.getName() : "DocNest Clinic";
        String clinicAddress = clinic != null ? clinic.getAddress() : "";
        String doctorName = doctor != null ? "Dr. " + doctor.getFullName() : "";
        String specialization = profile != null ? profile.getSpecialization() : "";

        doc.add(new Paragraph(clinicName)
            .setFontSize(16).setBold().setFontColor(BRAND_TEAL).setTextAlignment(TextAlignment.CENTER));
        if (!clinicAddress.isBlank()) {
            doc.add(new Paragraph(clinicAddress)
                .setFontSize(9).setFontColor(ColorConstants.GRAY).setTextAlignment(TextAlignment.CENTER));
        }
        doc.add(new Paragraph(doctorName + (specialization.isBlank() ? "" : " — " + specialization))
            .setFontSize(11).setTextAlignment(TextAlignment.CENTER));
        // Divider line
        doc.add(new Paragraph("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            .setFontSize(8).setFontColor(BRAND_TEAL).setTextAlignment(TextAlignment.CENTER));
    }

    private Cell headerCell(String text) {
        return new Cell().add(new Paragraph(text).setBold().setFontSize(9))
            .setBackgroundColor(BRAND_TEAL)
            .setFontColor(ColorConstants.WHITE)
            .setBorder(Border.NO_BORDER)
            .setPadding(6);
    }

    private Cell dataCell(String text) {
        return new Cell().add(new Paragraph(text).setFontSize(9))
            .setBorder(Border.NO_BORDER)
            .setPadding(5);
    }

    private Cell infoCell(String label, String value) {
        return new Cell().add(
            new Paragraph(label).setFontSize(8).setFontColor(ColorConstants.GRAY).setBold()
        ).add(
            new Paragraph(value).setFontSize(11)
        ).setBorder(Border.NO_BORDER).setPadding(5).setBackgroundColor(LIGHT_BG);
    }
}
