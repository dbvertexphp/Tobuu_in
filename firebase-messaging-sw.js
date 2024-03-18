// This a service worker file for receiving push notifitications.
// See `Access registration token section` @ https://firebase.google.com/docs/cloud-messaging/js/client#retrieve-the-current-registration-token

// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/8.2.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.2.0/firebase-messaging.js");

// Initialize the Firebase app in the service worker by passing the generated config
const firebaseConfig = {
      apiKey: "AIzaSyApp12b-h4sY_PLG7EeeYVSmav3TQx2mVI",
      authDomain: "tobuu-d4578.firebaseapp.com",
      projectId: "tobuu-d4578",
      storageBucket: "tobuu-d4578.appspot.com",
      messagingSenderId: "727314761090",
      appId: "1:727314761090:web:02097a5f9582889e933b9b",
      measurementId: "G-MQLDCFZ0RQ",
};

firebase.initializeApp(firebaseConfig);

// Retrieve firebase messaging
const messaging = firebase.messaging();

// Handle incoming messages while the app is not in focus (i.e in the background, hidden behind other tabs, or completely closed).
messaging.onBackgroundMessage(function (payload) {
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
            body: payload.notification.body,
      };

      self.registration.showNotification(
            notificationTitle,
            notificationOptions
      );
});
