const socket = io();

function showNotification(message) {
  const notif = document.createElement('div');
  notif.style.position = 'fixed';
  notif.style.top = '10px';
  notif.style.left = '50%';
  notif.style.transform = 'translateX(-50%)';
  notif.style.backgroundColor = 'green';
  notif.style.color = 'white';
  notif.style.padding = '10px';
  notif.style.borderRadius = '5px';
  notif.style.zIndex = '9999';
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}
