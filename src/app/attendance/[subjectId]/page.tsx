
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';
import { notFound } from 'next/navigation';
import type { Subject } from '@/lib/types';
import { AttendanceClient } from './components/attendance-client';

// This is a server-side component to fetch initial data
async function getSubject(subjectId: string): Promise<Subject | null> {
  try {
    const firestore = getFirestore(adminApp());
    const subjectDocRef = firestore.doc(`subjects/${subjectId}`);
    const subjectSnapshot = await subjectDocRef.get();

    if (!subjectSnapshot.exists) {
      return null;
    }
    const data = subjectSnapshot.data();
    if (!data) return null;

    // We manually construct the object to ensure type safety and add the ID
    return {
      id: subjectSnapshot.id,
      name: data.name,
      code: data.code,
      description: data.description,
      credits: data.credits,
      hasLab: data.hasLab,
      lectureSchedules: data.lectureSchedules,
      labSchedules: data.labSchedules,
      block: data.block,
      schoolYear: data.schoolYear,
      yearLevel: data.yearLevel,
      enrollmentStatus: data.enrollmentStatus,
    } as Subject;
  } catch (error) {
    console.error("Error fetching subject in server component:", error);
    // In case of error, we treat it as if the subject was not found.
    return null;
  }
}

export default async function SubjectAttendancePage({ params }: { params: { subjectId: string } }) {
  const { subjectId } = params;
  const subject = await getSubject(subjectId);

  if (!subject) {
    notFound();
  }

  // The fetched subject data is passed as a prop to the Client Component
  return <AttendanceClient subject={subject} />;
}
