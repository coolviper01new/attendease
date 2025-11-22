'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    // This is the correct and safe place to initialize client-side libraries.
    if (typeof window !== 'undefined' && !firebaseServices) {
      setFirebaseServices(initializeFirebase());
    }
    // The dependency array is empty, so this effect runs only once.
  }, [firebaseServices]);

  if (!firebaseServices) {
    // Render a loading state on the server and during initial client render.
    // This prevents children from accessing Firebase before it's initialized.
    return (
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading Firebase...</p>
        </div>
    );
  }

  // Once initialized, provide the services to the rest of the app.
  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
