// public/app.js - client socket handler
const socket = io();
let notifCount = 0;
const liveEventsEl = document.getElementById('liveEvents');
const notifCountEl = document.getElementById('notifCount');

function addEvent(text){
  if(!liveEventsEl) return;
  const li = document.createElement('li');
  li.className = 'list-group-item small';
  li.textContent = `${new Date().toLocaleTimeString()} — ${text}`;
  liveEventsEl.prepend(li);
  notifCount = Math.min(999, notifCount+1);
  if (notifCountEl) notifCountEl.textContent = notifCount;
}

// listen to events
socket.on('user:login', data => addEvent(`Login: ${data.email || data.name}`));
socket.on('user:register', data => addEvent(`Registered: ${data.email || data.name}`));
socket.on('user:logout', data => addEvent(`Logout: ${data.email || data.name}`));
socket.on('admin:user_deleted', data => addEvent(`User deleted: ${data.id}`));
socket.on('admin:cleanup', data => addEvent(`Cleanup run at ${data.time || new Date().toLocaleTimeString()}`));
socket.on('welcome', d => console.log('socket welcome', d));
