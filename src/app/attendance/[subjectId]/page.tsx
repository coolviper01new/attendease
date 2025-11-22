import { getFirestore, doc, getDoc } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';
import { notFound } from 'next/navigation';
import type { Subject } from '@/lib/types';
import { AttendanceClient } from './components/attendance-client';

// This is a server-side component to fetch initial data
async function getSubject(subjectId: string): Promise<Subject | null> {
  try {
    // IMPORTANT: Using adminApp() directly here for server-side data fetching
    const firestore = getFirestore(adminApp());
    const subjectDocRef = doc(firestore, 'subjects', subjectId);
    const subjectSnapshot = await getDoc(subjectDocRef);

    if (!subjectSnapshot.exists()) {
      return null;
    }
    // We manually add the id to the data object
    return { id: subjectSnapshot.id, ...subjectSnapshot.data() } as Subject;
  } catch (error) {
    console.error("Error fetching subject in server component:", error);
    return null;
  }
}

export default async function SubjectAttendancePage({ params }: { params: { subjectId: string } }) {
  const { subjectId } = params;
  const subject = await getSubject(subjectId);

  // If the subject doesn't exist, immediately return a 404
  if (!subject) {
    notFound();
  }

  // Pass the server-fetched subject data to the client component
  return <AttendanceClient subject={subject} />;
}
