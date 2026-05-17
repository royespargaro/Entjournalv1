importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAyOh78twRX01bqRu_pNYBTLGft2Hv59Xc",
  authDomain: "gen-lang-client-0160390188.firebaseapp.com",
  projectId: "gen-lang-client-0160390188",
  storageBucket: "gen-lang-client-0160390188.firebasestorage.app",
  messagingSenderId: "768532879814",
  appId: "1:768532879814:web:16f49bf54d62777e193ac7",
});

const messaging = firebase.messaging();
