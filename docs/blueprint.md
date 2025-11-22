# **App Name**: AttendEase

## Core Features:

- Admin Dashboard: Comprehensive dashboard for managing school years, semesters, year levels, blocks, and subjects.
- QR Code Generation: Students generate unique QR codes containing studentId, subjectId, and a secret stored in Firestore.
- Attendance Session Management: Admins activate/deactivate attendance sessions for each subject via the admin panel.
- QR Code Scanning: Admins scan student QR codes using a mobile QR scanner to record attendance.
- Attendance Validation Tool: Cloud Function tool to validate QR content, check active sessions, and verify student registrations. AI reasoning helps to prevent errors.
- Absence Warning System: Automatic warnings issued when a student incurs three consecutive absences via cloud function.
- Attendance Reports: Generate and monitor attendance reports and warnings from the admin dashboard.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to convey a sense of trust, reliability, and stability.
- Background color: Very light blue (#E8EAF6), a muted version of the primary, for a calm and focused atmosphere.
- Accent color: Muted purple (#8E24AA) for subtle yet noticeable highlights and action items.
- Body font: 'Inter', sans-serif, for a clean and modern look suitable for extended reading.
- Headline font: 'Space Grotesk', sans-serif, for a modern, technical aesthetic appropriate to a student app.
- Use minimalist icons to represent different sections of the app (e.g., subjects, attendance, reports).
- Maintain a clean, well-organized layout with clear visual hierarchy to facilitate easy navigation.