'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase, getSdks } from '@/firebase';
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
    // useEffect with an empty dependency array runs only on the client, after mount.
    // This is the correct place to initialize client-side libraries.
    if (!firebaseServices) {
      setFirebaseServices(initializeFirebase());
    }
  }, []); // Empty array ensures this runs only once on the client.

  if (!firebaseServices) {
    // Render a loading state or null while waiting for client-side initialization.
    // This prevents children from trying to access Firebase before it's ready.
    return (
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading Firebase...</p>
        </div>
    );
  }

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
