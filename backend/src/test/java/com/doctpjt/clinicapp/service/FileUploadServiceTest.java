package com.doctpjt.clinicapp.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class FileUploadServiceTest {

    @TempDir
    Path tempDir;

    private FileUploadService fileUploadService;

    @BeforeEach
    void setUp() {
        fileUploadService = new FileUploadService(tempDir.toString());
    }

    @Test
    @DisplayName("Successful upload returns URL path")
    void uploadFile_validImage_shouldReturnUrl() throws IOException {
        MultipartFile file = mockFile("test-photo.jpg", "image/jpeg", 1024, new byte[1024]);

        String result = fileUploadService.uploadFile(file);

        assertThat(result).startsWith("/uploads/");
        assertThat(result).endsWith(".jpg");
    }

    @Test
    @DisplayName("Successful PDF upload returns URL path")
    void uploadFile_validPdf_shouldReturnUrl() throws IOException {
        MultipartFile file = mockFile("document.pdf", "application/pdf", 2048, new byte[2048]);

        String result = fileUploadService.uploadFile(file);

        assertThat(result).startsWith("/uploads/");
        assertThat(result).endsWith(".pdf");
    }

    @Test
    @DisplayName("Reject non-image/pdf file types")
    void uploadFile_invalidType_shouldThrow() throws IOException {
        MultipartFile file = mockFile("script.exe", "application/octet-stream", 1024, new byte[1024]);

        assertThatThrownBy(() -> fileUploadService.uploadFile(file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid file type");
    }

    @Test
    @DisplayName("Reject text/html file type")
    void uploadFile_htmlType_shouldThrow() throws IOException {
        MultipartFile file = mockFile("page.html", "text/html", 1024, new byte[1024]);

        assertThatThrownBy(() -> fileUploadService.uploadFile(file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid file type");
    }

    @Test
    @DisplayName("Reject files larger than 5MB")
    void uploadFile_tooLarge_shouldThrow() throws IOException {
        long sixMB = 6 * 1024 * 1024;
        MultipartFile file = mockFile("large.jpg", "image/jpeg", sixMB, new byte[100]);

        assertThatThrownBy(() -> fileUploadService.uploadFile(file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("5MB");
    }

    @Test
    @DisplayName("Reject file exactly at 5MB boundary (over)")
    void uploadFile_exactlyOverLimit_shouldThrow() throws IOException {
        long overLimit = 5 * 1024 * 1024 + 1;
        MultipartFile file = mockFile("big.png", "image/png", overLimit, new byte[100]);

        assertThatThrownBy(() -> fileUploadService.uploadFile(file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("5MB");
    }

    @Test
    @DisplayName("Accept file exactly at 5MB boundary")
    void uploadFile_exactlyAtLimit_shouldSucceed() throws IOException {
        long exactLimit = 5 * 1024 * 1024;
        byte[] content = new byte[100];
        MultipartFile file = mockFile("exact.png", "image/png", exactLimit, content);

        String result = fileUploadService.uploadFile(file);

        assertThat(result).startsWith("/uploads/");
        assertThat(result).endsWith(".png");
    }

    @Test
    @DisplayName("Reject empty file")
    void uploadFile_emptyFile_shouldThrow() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(true);

        assertThatThrownBy(() -> fileUploadService.uploadFile(file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty or missing");
    }

    @Test
    @DisplayName("Reject null file")
    void uploadFile_nullFile_shouldThrow() {
        assertThatThrownBy(() -> fileUploadService.uploadFile(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty or missing");
    }

    @Test
    @DisplayName("Accept PNG images")
    void uploadFile_pngImage_shouldSucceed() throws IOException {
        MultipartFile file = mockFile("photo.png", "image/png", 2048, new byte[2048]);

        String result = fileUploadService.uploadFile(file);

        assertThat(result).startsWith("/uploads/");
        assertThat(result).endsWith(".png");
    }

    private MultipartFile mockFile(String filename, String contentType, long size, byte[] content) throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn(filename);
        when(file.getContentType()).thenReturn(contentType);
        when(file.getSize()).thenReturn(size);
        when(file.getInputStream()).thenReturn(new ByteArrayInputStream(content));
        return file;
    }
}
