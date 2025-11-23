
'use client';
import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, collectionGroup, getDocs, getDoc } from 'firebase/firestore';
import type { Subject, Student, AttendanceSession, Warning, Attendance, Registration } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InformationalDashboard } from './components/informational-dashboard';
import { AnalyticalDashboard } from './components/analytical-dashboard';
import { TacticalDashboard } from './components/tactical-dashboard';
import { StrategicDashboard } from './components/strategic-dashboard';
import { PageHeader } from '@/components/page-header';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export type DashboardData = {
    students: Student[];
    subjects: Subject[];
    activeSessions: AttendanceSession[];
    warnings: Warning[];
    attendance: Attendance[];
    registrations: Registration[];
}

export default function AdminDashboardPage() {
    const firestore = useFirestore();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);

            const handlePermissionError = (operation: 'list', path: string) => {
                const permissionError = new FirestorePermissionError({ path, operation });
                errorEmitter.emit('permission-error', permissionError);
            };

            try {
                const studentsQuery = query(collection(firestore, 'users'), where('role', '==', 'student'));
                const subjectsQuery = query(collection(firestore, 'subjects'));
                const warningsQuery = query(collectionGroup(firestore, 'warnings'));
                const attendanceQuery = query(collectionGroup(firestore, 'attendance'));
                const registrationsQuery = query(collectionGroup(firestore, 'registrations'));


                const [
                    studentsSnapshot,
                    subjectsSnapshot,
                    warningsSnapshot,
                    attendanceSnapshot,
                    registrationsSnapshot,
                ] = await Promise.all([
                    getDocs(studentsQuery).catch(err => { handlePermissionError('list', 'users'); throw err; }),
                    getDocs(subjectsQuery).catch(err => { handlePermissionError('list', 'subjects'); throw err; }),
                    getDocs(warningsQuery).catch(err => { handlePermissionError('list', 'warnings'); throw err; }),
                    getDocs(attendanceQuery).catch(err => { handlePermissionError('list', 'attendance'); throw err; }),
                    getDocs(registrationsQuery).catch(err => { handlePermissionError('list', 'registrations'); throw err; }),
                ]);

                const students = studentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Student[];
                const subjects = subjectsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Subject[];
                const warnings = warningsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Warning[];
                const attendance = attendanceSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Attendance[];
                const registrations = registrationsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Registration[];
                
                // New strategy: Fetch active sessions per subject
                let activeSessions: AttendanceSession[] = [];
                for (const subject of subjects) {
                    const activeSessionQuery = query(
                        collection(firestore, 'subjects', subject.id, 'attendanceSessions'), 
                        where('isActive', '==', true)
                    );
                    try {
                        const activeSessionSnapshot = await getDocs(activeSessionQuery);
                        activeSessionSnapshot.forEach(doc => {
                             activeSessions.push({ ...doc.data(), id: doc.id } as AttendanceSession);
                        });
                    } catch (e) {
                         handlePermissionError('list', `subjects/${subject.id}/attendanceSessions`);
                    }
                }


                setDashboardData({
                    students,
                    subjects,
                    activeSessions,
                    warnings,
                    attendance,
                    registrations,
                });
            } catch (error) {
                // Errors are now handled by the handlePermissionError callback,
                // so we don't need to console.error them here.
            } finally {
                setIsLoading(false);
            }
        };

        if (firestore) {
            fetchDashboardData();
        }
    }, [firestore]);


    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <PageHeader
                title="Dashboard"
                description="Your central hub for insights and class management."
            />
            <Tabs defaultValue="informational" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="informational">Informational</TabsTrigger>
                    <TabsTrigger value="analytical">Analytical</TabsTrigger>
                    <TabsTrigger value="tactical">Tactical</TabsTrigger>
                    <TabsTrigger value="strategic">Strategic</TabsTrigger>
                </TabsList>
                <TabsContent value="informational" className="space-y-4">
                    <InformationalDashboard data={dashboardData} isLoading={isLoading} />
                </TabsContent>
                 <TabsContent value="analytical" className="space-y-4">
                    <AnalyticalDashboard data={dashboardData} isLoading={isLoading} />
                </TabsContent>
                 <TabsContent value="tactical" className="space-y-4">
                    <TacticalDashboard data={dashboardData} isLoading={isLoading} />
                </TabsContent>
                 <TabsContent value="strategic" className="space-y-4">
                    <StrategicDashboard data={dashboardData} isLoading={isLoading} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
