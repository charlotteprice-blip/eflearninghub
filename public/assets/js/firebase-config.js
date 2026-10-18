// Firebase web app settings for the Learning Hub, in project ef-client-hub (shared with the Client Hub).
// These values identify the project and are not secret; access is controlled by Authentication, the Cloud
// Functions and the security rules. npm run setup writes them here when it registers the web app.

export const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  // Switch to 'app.executiveframe.co.nz' once the custom domain is live.
  authDomain: 'executiveframe-learninghub.web.app',
  projectId: 'ef-client-hub',
  storageBucket: 'executiveframe-learninghub',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
};

export const FUNCTIONS_REGION = 'australia-southeast1';
