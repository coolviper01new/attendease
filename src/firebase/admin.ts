import { initializeApp, getApps, getApp, type App } from 'firebase-admin/app';

// This is a workaround for the fact that the admin SDK is not available in the browser
// and we need to use it in server-side components.
// We are using a global variable to store the app instance to avoid re-initializing it on every request.
let _adminApp: App | null = null;

export function adminApp(): App {
    if (_adminApp) {
        return _adminApp;
    }

    if (getApps().length > 0) {
        _adminApp = getApp();
        return _adminApp;
    }
    
    // The service account credentials are automatically provided by the App Hosting environment.
    _adminApp = initializeApp();
    return _adminApp;
}
