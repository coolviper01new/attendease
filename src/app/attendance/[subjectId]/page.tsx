
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
    return { id: subjectSnapshot.id, ...subjectSnapshot.data() } as Subject;
  } catch (error) {
    console.error("Error fetching subject in server component:", error);
    return null;
  }
}

export default async function SubjectAttendancePage({ params }: { params: { subjectId: string } }) {
  const { subjectId } = params;
  const subject = await getSubject(subjectId);

  if (!subject) {
    notFound();
  }

  return <AttendanceClient subject={subject} />;
}
