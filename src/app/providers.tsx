'use client';

import { FirebaseClientProvider } from "@/firebase";
import { type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <FirebaseClientProvider>
            {children}
        </FirebaseClientProvider>
    );
}
