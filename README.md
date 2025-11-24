# AttendEase: Smart Attendance Management System

AttendEase is a modern, web-based application designed to streamline attendance tracking for educational institutions. It leverages QR code technology and a role-based access system to provide a secure, efficient, and intuitive experience for both students and administrators (teachers).

## Core Features

- **Role-Based Dashboards**: Separate, tailored dashboards for administrators and students, providing relevant information and actions for each user type.
  - **Admin Dashboard**: A powerful, multi-tabbed interface (Informational, Analytical, Tactical, Strategic) with charts and tables for insightful data analysis on attendance trends, at-risk students, and subject performance.
  - **Student Dashboard**: A personalized view showing daily schedules, all enrolled subjects, and real-time attendance status.

- **QR Code Attendance System**:
  - **Student QR Generation**: Students can generate a unique, session-specific QR code on their registered mobile device.
  - **Real-Time Scanning**: Administrators use an integrated camera interface to scan student QR codes, instantly validating and recording attendance.

- **Secure Device Registration**:
  - To prevent fraudulent check-ins, each student's account is tied to a single registered device.
  - A secure, admin-approval workflow is in place for students who need to change their registered device.

- **Comprehensive Subject & Enrollment Management**:
  - Admins can create, update, and manage subjects, including schedules, credits, and block sections.
  - Enrollment can be opened or closed for subjects. Admins can generate a unique QR code for each subject block, allowing students to enroll instantly by scanning it.

- **Progressive Web App (PWA)**:
  - AttendEase is fully installable on modern mobile browsers (iOS and Android), providing a native app-like experience directly from the user's home screen.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI**: ShadCN UI Components & Tailwind CSS
- **Database**: Firestore
- **Authentication**: Firebase Authentication
- **Generative AI**: Google's Gemini models via Genkit for AI-driven validation and analysis.

## Getting Started

1.  **Register**: Create an account as either a "Student" or "Teacher (Admin)".
2.  **Log In**: Access your role-specific dashboard.
3.  **Explore**:
    - **Admins**: Start by creating subjects and opening them for enrollment.
    - **Students**: Enroll in a subject and register your device to start generating attendance QR codes.