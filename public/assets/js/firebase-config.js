// Firebase web app settings for the Learning Hub, in project ef-client-hub (shared with the Client Hub).
// These values identify the project and are not secret; access is controlled by Authentication, the Cloud
// Functions and the security rules. npm run setup writes them here when it registers the web app.

export const firebaseConfig = {
  apiKey: 'AIzaSyDDzJ4W5VliWxKjRYxvfMEkLsTNrOYkr1U',
  // Switch to 'learn.executiveframe.co.nz' once the custom domain is live.
  authDomain: 'executiveframe-learninghub.web.app',
  projectId: 'ef-client-hub',
  storageBucket: 'executiveframe-learninghub',
  messagingSenderId: '311513487129',
  appId: '1:311513487129:web:a28a9be4b31d7141429788',
};

export const FUNCTIONS_REGION = 'australia-southeast1';
