importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyAPGOPCVbrOgjxDknYQqZ2VQG8olpDd9A0",
  authDomain: "family-planner-86c68.firebaseapp.com",
  databaseURL: "https://family-planner-86c68-default-rtdb.firebaseio.com",
  projectId: "family-planner-86c68",
  messagingSenderId: "807824461716",
  appId: "1:807824461716:web:c705726f8a4fe76b6b8981"
});

const messaging = firebase.messaging();

// Фоновые уведомления — когда приложение закрыто или свёрнуто
messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body: body,
    icon: '/my-project/planner/assets/icon-192.png',
    badge: '/my-project/planner/assets/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'shopping-update',
    renotify: true
  });
});
