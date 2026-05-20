package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.service.PdfService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pdf")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class PdfController {

    private final PdfService pdfService;

    public PdfController(PdfService pdfService) {
        this.pdfService = pdfService;
    }

    @GetMapping("/prescription/{visitId}")
    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR', 'ADMIN')")
    public ResponseEntity<byte[]> downloadPrescription(@PathVariable Long visitId) {
        byte[] pdfBytes = pdfService.generatePrescriptionPdf(visitId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=prescription-" + visitId + ".pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdfBytes);
    }

    @GetMapping("/patient-history/{patientUserId}")
    @PreAuthorize("hasRole('ADMIN') or (#patientUserId == principal and hasRole('PATIENT'))")
    public ResponseEntity<byte[]> downloadPatientHistory(@PathVariable Long patientUserId) {
        byte[] pdfBytes = pdfService.generatePatientHistoryPdf(patientUserId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=medical-history-" + patientUserId + ".pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdfBytes);
    }
}
