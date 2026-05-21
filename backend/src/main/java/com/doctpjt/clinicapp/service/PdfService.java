package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.entity.Clinic;
import com.doctpjt.clinicapp.entity.DoctorProfile;
import com.doctpjt.clinicapp.entity.PatientProfile;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.entity.VisitRecord;
import com.doctpjt.clinicapp.repository.ClinicRepository;
import com.doctpjt.clinicapp.repository.DoctorProfileRepository;
import com.doctpjt.clinicapp.repository.PatientProfileRepository;
import com.doctpjt.clinicapp.repository.UserRepository;
import com.doctpjt.clinicapp.repository.VisitRecordRepository;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.LineSeparator;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class PdfService {

    private static final DeviceRgb BRAND_TEAL = new DeviceRgb(14, 165, 165);
    private static final DeviceRgb DARK_TEAL = new DeviceRgb(10, 120, 120);
    private static final DeviceRgb LIGHT_BG = new DeviceRgb(248, 250, 255);
    private static final DeviceRgb LIGHT_TEAL_BG = new DeviceRgb(240, 253, 253);
    private static final DeviceRgb HEADER_BG = new DeviceRgb(14, 165, 165);
    private static final DeviceRgb TABLE_HEADER_BG = new DeviceRgb(30, 58, 95);
    private static final DeviceRgb TABLE_ALT_ROW = new DeviceRgb(245, 248, 255);
    private static final DeviceRgb BORDER_COLOR = new DeviceRgb(200, 210, 220);
    private static final DeviceRgb TEXT_DARK = new DeviceRgb(30, 41, 59);
    private static final DeviceRgb TEXT_MUTED = new DeviceRgb(100, 116, 139);

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    private final VisitRecordRepository visitRecordRepository;
    private final UserRepository userRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final ClinicRepository clinicRepository;
    private final PatientProfileRepository patientProfileRepository;

    public PdfService(
        VisitRecordRepository visitRecordRepository,
        UserRepository userRepository,
        DoctorProfileRepository doctorProfileRepository,
        ClinicRepository clinicRepository,
        PatientProfileRepository patientProfileRepository
    ) {
        this.visitRecordRepository = visitRecordRepository;
        this.userRepository = userRepository;
        this.doctorProfileRepository = doctorProfileRepository;
        this.clinicRepository = clinicRepository;
        this.patientProfileRepository = patientProfileRepository;
    }

    public byte[] generatePrescriptionPdf(Long visitId) {
        VisitRecord visit = visitRecordRepository.findById(visitId)
            .orElseThrow(() -> new IllegalArgumentException("Visit record not found"));

        User doctor = userRepository.findById(visit.getDoctorUserId()).orElse(null);
        User patient = userRepository.findById(visit.getPatientUserId()).orElse(null);
        DoctorProfile profile = doctorProfileRepository.findByUserId(visit.getDoctorUserId()).orElse(null);
        PatientProfile patientProfile = patientProfileRepository.findByUserId(visit.getPatientUserId()).orElse(null);
        Clinic clinic = (profile != null && profile.getClinicId() != null)
            ? clinicRepository.findById(profile.getClinicId()).orElse(null)
            : null;

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdfDoc = new PdfDocument(new PdfWriter(baos));
        pdfDoc.setDefaultPageSize(PageSize.A4);
        Document doc = new Document(pdfDoc, PageSize.A4);
        doc.setMargins(30, 40, 40, 40);

        // === CLINIC HEADER SECTION ===
        addProfessionalHeader(doc, clinic, doctor, profile);

        // === PATIENT INFO SECTION ===
        addPatientInfoSection(doc, patient, patientProfile, visit);

        // === Rx SYMBOL ===
        doc.add(new Paragraph("℞")
            .setFontSize(32)
            .setBold()
            .setFontColor(BRAND_TEAL)
            .setMarginTop(10)
            .setMarginBottom(5));

        // === DIAGNOSIS SECTION ===
        if (visit.getDiagnosis() != null && !visit.getDiagnosis().isBlank()) {
            addSectionHeader(doc, "Diagnosis");
            doc.add(new Paragraph(visit.getDiagnosis())
                .setFontSize(11)
                .setFontColor(TEXT_DARK)
                .setMarginLeft(5)
                .setMarginBottom(10));
        }

        // === MEDICATIONS TABLE ===
        if (visit.getMedications() != null && !visit.getMedications().isBlank()) {
            addSectionHeader(doc, "Prescribed Medications");
            addMedicationTable(doc, visit.getMedications());
        }

        // === NOTES / HISTORY ===
        if (visit.getDiseaseHistory() != null && !visit.getDiseaseHistory().isBlank()) {
            addSectionHeader(doc, "Clinical Notes / History");
            doc.add(new Paragraph(visit.getDiseaseHistory())
                .setFontSize(10)
                .setFontColor(TEXT_DARK)
                .setMarginLeft(5)
                .setMarginBottom(10)
                .setBackgroundColor(LIGHT_BG)
                .setPadding(8));
        }

        // === FOLLOW-UP DATE ===
        if (visit.getRevisitDate() != null) {
            Table followUp = new Table(UnitValue.createPercentArray(new float[]{1})).useAllAvailableWidth();
            followUp.addCell(new Cell()
                .add(new Paragraph("Follow-up Date: " + visit.getRevisitDate().format(DATE_FORMAT))
                    .setBold().setFontSize(11).setFontColor(DARK_TEAL))
                .setBackgroundColor(LIGHT_TEAL_BG)
                .setBorder(new SolidBorder(BRAND_TEAL, 1))
                .setPadding(8));
            doc.add(followUp);
        }

        // === SIGNATURE & FOOTER ===
        addFooterSection(doc, doctor);

        doc.close();
        return baos.toByteArray();
    }

    public byte[] generatePatientHistoryPdf(Long patientUserId) {
        User patient = userRepository.findById(patientUserId)
            .orElseThrow(() -> new IllegalArgumentException("Patient not found"));

        PatientProfile patientProfile = patientProfileRepository.findByUserId(patientUserId).orElse(null);
        List<VisitRecord> visits = visitRecordRepository.findByPatientUserIdOrderByVisitDateDesc(patientUserId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdfDoc = new PdfDocument(new PdfWriter(baos));
        pdfDoc.setDefaultPageSize(PageSize.A4);
        Document doc = new Document(pdfDoc, PageSize.A4);
        doc.setMargins(30, 40, 40, 40);

        // Title
        doc.add(new Paragraph("Medical History Report")
            .setFontSize(22).setBold().setFontColor(BRAND_TEAL).setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph(patient.getFullName())
            .setFontSize(14).setTextAlignment(TextAlignment.CENTER).setFontColor(TEXT_DARK));

        // Patient details
        if (patientProfile != null) {
            StringBuilder details = new StringBuilder();
            if (patientProfile.getAge() != null) details.append("Age: ").append(patientProfile.getAge()).append(" | ");
            if (patientProfile.getGender() != null) details.append("Gender: ").append(patientProfile.getGender()).append(" | ");
            if (patientProfile.getBloodGroup() != null) details.append("Blood Group: ").append(patientProfile.getBloodGroup());
            if (details.length() > 0) {
                doc.add(new Paragraph(details.toString().replaceAll("\\| $", ""))
                    .setFontSize(10).setFontColor(TEXT_MUTED).setTextAlignment(TextAlignment.CENTER));
            }
        }

        doc.add(new Paragraph("Generated: " + LocalDateTime.now().format(DATETIME_FORMAT))
            .setFontSize(9).setFontColor(TEXT_MUTED).setTextAlignment(TextAlignment.CENTER));

        addThinSeparator(doc);

        if (visits.isEmpty()) {
            doc.add(new Paragraph("No visit records found.")
                .setFontColor(TEXT_MUTED).setFontSize(11).setMarginTop(20));
        } else {
            // Visit Table
            Table table = new Table(UnitValue.createPercentArray(new float[]{1.5f, 2f, 3f, 3f}))
                .useAllAvailableWidth()
                .setMarginTop(10);

            // Header row
            table.addHeaderCell(historyHeaderCell("Date"));
            table.addHeaderCell(historyHeaderCell("Doctor"));
            table.addHeaderCell(historyHeaderCell("Diagnosis"));
            table.addHeaderCell(historyHeaderCell("Medications"));

            int rowIndex = 0;
            for (VisitRecord visit : visits) {
                User visitDoctor = userRepository.findById(visit.getDoctorUserId()).orElse(null);
                DeviceRgb rowBg = (rowIndex % 2 == 0) ? ColorConstants.WHITE instanceof DeviceRgb ? (DeviceRgb) ColorConstants.WHITE : new DeviceRgb(255, 255, 255) : TABLE_ALT_ROW;
                table.addCell(historyDataCell(visit.getVisitDate() != null ? visit.getVisitDate().format(DateTimeFormatter.ofPattern("dd/MM/yy")) : "—", rowBg));
                table.addCell(historyDataCell(visitDoctor != null ? "Dr. " + visitDoctor.getFullName() : "—", rowBg));
                table.addCell(historyDataCell(visit.getDiagnosis() != null ? visit.getDiagnosis() : "—", rowBg));
                table.addCell(historyDataCell(visit.getMedications() != null ? visit.getMedications() : "—", rowBg));
                rowIndex++;
            }

            doc.add(table);
        }

        // Footer
        doc.add(new Paragraph("\n"));
        addThinSeparator(doc);
        doc.add(new Paragraph("This report is auto-generated by DocNest and is for informational purposes only.")
            .setFontSize(8).setFontColor(TEXT_MUTED).setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("It does not constitute medical advice. Please consult your healthcare provider.")
            .setFontSize(8).setFontColor(TEXT_MUTED).setTextAlignment(TextAlignment.CENTER));

        doc.close();
        return baos.toByteArray();
    }

    // ===== HELPER METHODS =====

    private void addProfessionalHeader(Document doc, Clinic clinic, User doctor, DoctorProfile profile) {
        String clinicName = clinic != null ? clinic.getName() : "DocNest Clinic";
        String clinicAddress = clinic != null && clinic.getAddress() != null ? clinic.getAddress() : "";
        String clinicPhone = clinic != null && clinic.getPhone() != null ? clinic.getPhone() : "";
        String doctorName = doctor != null ? "Dr. " + doctor.getFullName() : "";
        String doctorEmail = doctor != null && doctor.getEmail() != null ? doctor.getEmail() : "";
        String specialization = profile != null && profile.getSpecialization() != null ? profile.getSpecialization() : "";
        String regNumber = profile != null && profile.getRegistrationNumber() != null ? profile.getRegistrationNumber() : "";

        // Clinic name as header
        Paragraph clinicTitle = new Paragraph(clinicName)
            .setFontSize(20)
            .setBold()
            .setFontColor(BRAND_TEAL)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginBottom(2);
        doc.add(clinicTitle);

        // Clinic contact details
        if (!clinicAddress.isBlank() || !clinicPhone.isBlank()) {
            StringBuilder contactLine = new StringBuilder();
            if (!clinicAddress.isBlank()) contactLine.append(clinicAddress);
            if (!clinicAddress.isBlank() && !clinicPhone.isBlank()) contactLine.append(" | ");
            if (!clinicPhone.isBlank()) contactLine.append("Phone: ").append(clinicPhone);
            doc.add(new Paragraph(contactLine.toString())
                .setFontSize(9)
                .setFontColor(TEXT_MUTED)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(2));
        }

        // Teal divider
        SolidLine tealLine = new SolidLine(1.5f);
        tealLine.setColor(BRAND_TEAL);
        doc.add(new LineSeparator(tealLine).setMarginTop(6).setMarginBottom(6));

        // Doctor info row
        Table doctorTable = new Table(UnitValue.createPercentArray(new float[]{3, 2})).useAllAvailableWidth();

        // Left: doctor name + specialization
        Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setPadding(4);
        leftCell.add(new Paragraph(doctorName)
            .setFontSize(13).setBold().setFontColor(TEXT_DARK));
        if (!specialization.isBlank()) {
            leftCell.add(new Paragraph(specialization)
                .setFontSize(10).setFontColor(TEXT_MUTED));
        }
        doctorTable.addCell(leftCell);

        // Right: reg number + email
        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setPadding(4).setTextAlignment(TextAlignment.RIGHT);
        if (!regNumber.isBlank()) {
            rightCell.add(new Paragraph("Reg. No: " + regNumber)
                .setFontSize(9).setFontColor(TEXT_DARK));
        }
        if (!doctorEmail.isBlank()) {
            rightCell.add(new Paragraph(doctorEmail)
                .setFontSize(9).setFontColor(TEXT_MUTED));
        }
        doctorTable.addCell(rightCell);

        doc.add(doctorTable);

        // Thin separator after doctor info
        SolidLine thinLine = new SolidLine(0.5f);
        thinLine.setColor(BORDER_COLOR);
        doc.add(new LineSeparator(thinLine).setMarginTop(4).setMarginBottom(8));
    }

    private void addPatientInfoSection(Document doc, User patient, PatientProfile patientProfile, VisitRecord visit) {
        Table infoTable = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1})).useAllAvailableWidth();
        infoTable.setMarginBottom(10);

        // Patient Name
        infoTable.addCell(infoCell("Patient Name", patient != null ? patient.getFullName() : "Unknown"));

        // Age / Gender
        String ageGender = "";
        if (patientProfile != null) {
            if (patientProfile.getAge() != null) ageGender += patientProfile.getAge() + " yrs";
            if (patientProfile.getGender() != null) {
                if (!ageGender.isEmpty()) ageGender += " / ";
                ageGender += patientProfile.getGender();
            }
        }
        infoTable.addCell(infoCell("Age / Gender", ageGender.isEmpty() ? "—" : ageGender));

        // Visit Date
        String visitDateStr = visit.getVisitDate() != null
            ? visit.getVisitDate().format(DATE_FORMAT)
            : LocalDate.now().format(DATE_FORMAT);
        infoTable.addCell(infoCell("Visit Date", visitDateStr));

        doc.add(infoTable);
    }

    private void addSectionHeader(Document doc, String title) {
        doc.add(new Paragraph(title)
            .setBold()
            .setFontSize(11)
            .setFontColor(DARK_TEAL)
            .setMarginTop(12)
            .setMarginBottom(4)
            .setBorderBottom(new SolidBorder(BRAND_TEAL, 0.5f))
            .setPaddingBottom(3));
    }

    private void addMedicationTable(Document doc, String medications) {
        String[] meds = medications.split("[\\n;]");
        if (meds.length == 0) return;

        Table table = new Table(UnitValue.createPercentArray(new float[]{0.5f, 3f, 2f, 2f, 2f}))
            .useAllAvailableWidth()
            .setMarginTop(5)
            .setMarginBottom(12);

        // Header
        table.addHeaderCell(medHeaderCell("#"));
        table.addHeaderCell(medHeaderCell("Medication"));
        table.addHeaderCell(medHeaderCell("Dosage"));
        table.addHeaderCell(medHeaderCell("Frequency"));
        table.addHeaderCell(medHeaderCell("Duration"));

        int index = 1;
        for (String med : meds) {
            String trimmed = med.trim();
            if (trimmed.isEmpty()) continue;

            DeviceRgb rowBg = (index % 2 == 0) ? TABLE_ALT_ROW : new DeviceRgb(255, 255, 255);

            // Parse medication string - try to split by common patterns
            // Expected formats: "Drug - Dosage - Frequency - Duration" or "Drug, Dosage, Frequency, Duration"
            // or just plain text
            String[] parts = trimmed.split("\\s*[-|]\\s*|\\s*,\\s*");

            String drugName = parts.length > 0 ? parts[0].trim() : trimmed;
            String dosage = parts.length > 1 ? parts[1].trim() : "As directed";
            String frequency = parts.length > 2 ? parts[2].trim() : "—";
            String duration = parts.length > 3 ? parts[3].trim() : "—";

            table.addCell(medDataCell(String.valueOf(index), rowBg));
            table.addCell(medDataCell(drugName, rowBg).setBold());
            table.addCell(medDataCell(dosage, rowBg));
            table.addCell(medDataCell(frequency, rowBg));
            table.addCell(medDataCell(duration, rowBg));

            index++;
        }

        doc.add(table);
    }

    private void addFooterSection(Document doc, User doctor) {
        doc.add(new Paragraph("\n"));

        // Signature section
        Table sigTable = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
        sigTable.setMarginTop(20);

        Cell leftSig = new Cell().setBorder(Border.NO_BORDER);
        leftSig.add(new Paragraph("Date: " + LocalDate.now().format(DATE_FORMAT))
            .setFontSize(10).setFontColor(TEXT_DARK));
        sigTable.addCell(leftSig);

        Cell rightSig = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT);
        rightSig.add(new Paragraph("____________________________")
            .setFontSize(10).setFontColor(TEXT_MUTED));
        rightSig.add(new Paragraph("Doctor's Signature & Stamp")
            .setFontSize(8).setFontColor(TEXT_MUTED));
        sigTable.addCell(rightSig);

        doc.add(sigTable);

        // Disclaimer footer
        SolidLine footerLine = new SolidLine(0.5f);
        footerLine.setColor(BORDER_COLOR);
        doc.add(new LineSeparator(footerLine).setMarginTop(20).setMarginBottom(6));

        doc.add(new Paragraph("This is a computer-generated prescription. No signature is required for digital copies.")
            .setFontSize(8).setFontColor(TEXT_MUTED).setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("Generated by DocNest on " + LocalDateTime.now().format(DATETIME_FORMAT))
            .setFontSize(7).setFontColor(TEXT_MUTED).setTextAlignment(TextAlignment.CENTER));
    }

    private void addThinSeparator(Document doc) {
        SolidLine line = new SolidLine(0.5f);
        line.setColor(BORDER_COLOR);
        doc.add(new LineSeparator(line).setMarginTop(8).setMarginBottom(8));
    }

    // === Cell helpers ===

    private Cell medHeaderCell(String text) {
        return new Cell()
            .add(new Paragraph(text).setBold().setFontSize(9).setFontColor(ColorConstants.WHITE))
            .setBackgroundColor(TABLE_HEADER_BG)
            .setBorder(Border.NO_BORDER)
            .setPadding(6)
            .setTextAlignment(TextAlignment.CENTER);
    }

    private Cell medDataCell(String text, DeviceRgb bgColor) {
        return new Cell()
            .add(new Paragraph(text).setFontSize(9).setFontColor(TEXT_DARK))
            .setBackgroundColor(bgColor)
            .setBorder(Border.NO_BORDER)
            .setPadding(5)
            .setBorderBottom(new SolidBorder(BORDER_COLOR, 0.3f));
    }

    private Cell historyHeaderCell(String text) {
        return new Cell()
            .add(new Paragraph(text).setBold().setFontSize(9).setFontColor(ColorConstants.WHITE))
            .setBackgroundColor(TABLE_HEADER_BG)
            .setBorder(Border.NO_BORDER)
            .setPadding(6);
    }

    private Cell historyDataCell(String text, DeviceRgb bgColor) {
        return new Cell()
            .add(new Paragraph(text).setFontSize(9).setFontColor(TEXT_DARK))
            .setBackgroundColor(bgColor)
            .setBorder(Border.NO_BORDER)
            .setPadding(5)
            .setBorderBottom(new SolidBorder(BORDER_COLOR, 0.3f));
    }

    private Cell infoCell(String label, String value) {
        return new Cell()
            .add(new Paragraph(label).setFontSize(8).setFontColor(TEXT_MUTED).setBold())
            .add(new Paragraph(value).setFontSize(11).setFontColor(TEXT_DARK))
            .setBorder(new SolidBorder(BORDER_COLOR, 0.5f))
            .setPadding(6)
            .setBackgroundColor(LIGHT_BG);
    }
}
