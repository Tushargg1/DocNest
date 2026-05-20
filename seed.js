const apiUrl = 'http://localhost:8085/api';

async function seed() {
    try {
        console.log("Starting seed process...");

        const suffix = Date.now().toString().slice(-4);
        
        // 1. Register Admin
        let res = await fetch(`${apiUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Super Admin',
                email: `admin${suffix}@docnest.com`,
                phoneNumber: `000000${suffix}`,
                password: 'password123',
                role: 'ADMIN'
            })
        });
        const adminRes = await res.json();
        console.log("Admin registered:", adminRes);

        // 2. Register Patient
        res = await fetch(`${apiUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Test Patient',
                phoneNumber: `987654${suffix}`,
                password: 'password123',
                role: 'PATIENT'
            })
        });
        console.log("Patient registered:", await res.json());

        // 3. Register Clinic Owner
        res = await fetch(`${apiUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Manager Mike',
                email: `clinic${suffix}@docnest.com`,
                phoneNumber: `999999${suffix}`,
                password: 'password123',
                role: 'CLINIC'
            })
        });
        const clinicRes = await res.json();
        const clinicToken = clinicRes.token;
        const clinicOwnerId = clinicRes.userId;
        console.log("Clinic Owner registered:", clinicRes);

        // 4. Create Clinic Entity
        res = await fetch(`${apiUrl}/clinics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${clinicToken}` },
            body: JSON.stringify({
                name: 'DocNest Prime Care',
                address: '123 Health Ave, Wellness City',
                phone: '9876543211',
                latitude: 28.7041,
                longitude: 77.1025,
                ownerUserId: clinicOwnerId
            })
        });
        const clinic = await res.json();
        console.log("Clinic entity created:", clinic);

        // 5. Admin Approves Clinic
        res = await fetch(`${apiUrl}/admin/clinics/approve?clinicId=${clinic.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminRes.token}` }
        });
        console.log("Clinic Approved:", await res.text());

        // 6. Clinic registers a Doctor
        res = await fetch(`${apiUrl}/clinics/${clinic.id}/doctors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${clinicToken}` },
            body: JSON.stringify({
                fullName: 'Dr. Sarah Smith',
                email: `sarah${suffix}@docnest.com`,
                password: 'password123',
                specialization: 'Cardiology',
                roomId: '101',
                age: 40,
                gender: 'Female',
                occupation: 'Senior Cardiologist',
                bio: 'Experienced in treating heart conditions.',
                degrees: ['MBBS-AIIMS', 'MD-Cardiology']
            })
        });
        console.log("Doctor registered by clinic:", await res.json());

        // We can do another Doctor
        res = await fetch(`${apiUrl}/clinics/${clinic.id}/doctors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${clinicToken}` },
            body: JSON.stringify({
                fullName: 'Dr. John Doe',
                email: `john${suffix}@docnest.com`,
                password: 'password123',
                specialization: 'Dermatology',
                roomId: '102',
                age: 35,
                gender: 'Male',
                occupation: 'Dermatologist',
                bio: 'Skin specialist',
                degrees: ['MBBS-CMC', 'MD-Dermatology']
            })
        });
        console.log("Doctor 2 registered by clinic:", await res.json());

        console.log("\n==================== CREDENTIALS ====================");
        console.log(`Patient: phone=987654${suffix} / pwd=password123`);
        console.log(`Clinic Owner: email=clinic${suffix}@docnest.com (or 999999${suffix}) / pwd=password123`);
        console.log(`Doctor 1: email=sarah${suffix}@docnest.com / pwd=password123`);
        console.log(`Doctor 2: email=john${suffix}@docnest.com / pwd=password123`);
        console.log(`Admin: email=admin${suffix}@docnest.com (or 000000${suffix}) / pwd=password123`);
        console.log("=====================================================");

    } catch (e) {
        console.error("Error during seeding:", e);
    }
}
seed();
