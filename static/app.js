if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    console.log("SW registered");

    // 🔴 THIS IS THE FIX
    if (!navigator.serviceWorker.controller) {
      window.location.reload();
    }
  });
}

function notificationsEnabled(){
  return (
    localStorage.getItem('notificationsEnabled') === 'true' ||
    Notification.permission === 'granted'
  );
}

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e)=>{
  console.log("Install prompt available ✅");
  e.preventDefault();
  deferredPrompt = e;
});

function installApp(){
  registerPush();
}

function parseTime(t){
 let [time,ampm]=t.split(' ');
 let [h,m]=time.split(':');
 h=parseInt(h);
 if(ampm==='PM'&&h<12)h+=12;
 let d=new Date(); d.setHours(h,m,0,0);
 return d;
}

function countdown(t){
  let diff = parseTime(t) - Date.now();
  let min = Math.floor(diff / 60000);

  if (min <= 0) return 'Started';

  // Only show countdown if under 120 minutes
  if (min <= 120) {
    return `Starts in ${min} min`;
  }

  return ''; // nothing for long time gaps
}

function scrollToContent(){
  const target =
    document.getElementById('exploreContent') ||
    document.getElementById('moreContent') ||
    document.getElementById('content');

  if(target){
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderAlertButton(e){
  const now = Date.now();
  const startTime = parseTime(e.start_time).getTime();

  // Only show button BEFORE event starts
  if (now >= startTime){
    return ''; // no button
  }

  return `
    <button
      class="alert-btn"
      data-event-id="${e.id}"
      data-title="${e.title}"
      data-time="${e.start_time}"
    >
      🔔 Alert Me
    </button>
  `;
}

async function loadEvents(){
let [eventsRes, alertsRes] = await Promise.all([
  fetch('/api/events'),
  fetch('/api/alerts')
]);

let d = await eventsRes.json();
let userAlerts = new Set();

try {
  const alertData = await alertsRes.json();
  if (Array.isArray(alertData)) {
    userAlerts = new Set(alertData);
  }
} catch (e) {
  console.log("No alerts yet");
}

let h = '';

if (!notificationsEnabled()) {
  h += `
    <div class="card" id="notifyCard">
      🔔 <b>Get Event Reminders</b><br><br>
      Tap to allow notifications 10 min before start<br><br>
      <button onclick="installApp()">🔔 Enable Notifications</button>
    </div>
  `;
}

h += `<h2>📅 Today's Events</h2>`;

  d.forEach(e => {
        const activeClass = isEventActive(e.start_time, e.end_time) ? "active-event" : "";

        h += `
          <div class="card ${activeClass}">
        <b>${e.title}</b><br>
        ${e.description}<br>
        ${e.location}<br>
        ${e.start_time} - ${e.end_time}<br>
        ${getEventStatus(e.start_time, e.end_time)}<br><br>
        ${renderAlertButton(e)}

      </div>
    `;
  });

  document.getElementById('content').innerHTML = h;

  scrollToContent();

document.querySelectorAll(".alert-btn").forEach(button => {
  const eventId = parseInt(button.dataset.eventId);

  // Set initial state
  if (userAlerts.has(eventId)) {
    button.classList.add("active");
    button.textContent = "Remove Alert";
  }

  button.addEventListener("click", async () => {
    console.log("CLICK", eventId);

    const isActive = button.classList.contains("active");

    // Always update UI immediately (important)
    if (!isActive) {
      button.classList.add("active");
      button.textContent = "Remove Alert";
    } else {
      button.classList.remove("active");
      button.textContent = "🔔 Alert Me";
    }

    try {
      let endpoint = null;

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) endpoint = sub.endpoint;
      }

      const url = isActive
        ? `/api/alerts/remove/${eventId}`
        : `/api/alerts/add/${eventId}`;

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint })
      });

    } catch (err) {
      console.error("Toggle failed", err);
    }
  });
});

}

function getEventStatus(start, end){
  const now = Date.now();
  const startTime = parseTime(start).getTime();
  const endTime = parseTime(end).getTime();

  if (now < startTime){
    const min = Math.floor((startTime - now) / 60000);

    if (min <= 120){
      return `<b>Starts in ${min} min</b>`;
    }
    return ''; // no message if far away
  }

  if (now >= startTime && now <= endTime){
    return `<b>Happening Now</b>`;
  }

  return `<b>Ended</b>`;
}

function setAlert(id, title, time){
  let alerts = JSON.parse(localStorage.getItem('alerts') || '[]');

  // prevent duplicates
  if(alerts.find(a => a.id === id)) return;

  alerts.push({ id, title, time });
  localStorage.setItem('alerts', JSON.stringify(alerts));

  Notification.requestPermission();
}

function showSchedule(){
  let alerts = JSON.parse(localStorage.getItem('alerts') || '[]');

  let h = '<h2>⭐ My Schedule</h2>';

  if(alerts.length === 0){
    h += '<div class="card">No saved events</div>';
  document.getElementById('content').innerHTML = h;
  scrollToContent();
  }

  alerts.forEach((a, index) => {
    h += `
      <div class="card">
        <b>${a.title}</b><br>
        ${a.time}<br>
        ${countdown(a.time)}<br><br>
        <button onclick="removeAlert(${index})">❌ Remove</button>
      </div>
    `;
  });

  if(alerts.length > 0){
    h += `<button onclick="clearAlerts()">Clear All</button>`;
  }

  document.getElementById('content').innerHTML = h;
  scrollToContent();
}

function showExplore(){
  document.getElementById('content').innerHTML = `
    <div class="row">
      <button onclick="loadFood()">🍔 Food</button>
      <button onclick="loadMusic()">🎵 Music</button>
      <button onclick="loadExhibits()">🐄 Exhibits</button>
    </div>
    <div id="exploreContent"></div>
  `;
  scrollToContent();
}

async function loadFood(){
  let r = await fetch('/api/food');
  let d = await r.json();

  let h = '<h2>Food Vendors</h2>';
  d.forEach(i => {
    h += `<div class="card"><b>${i.name}</b><br>${i.description}<br>${i.location}</div>`;
  });

  document.getElementById('exploreContent').innerHTML = h;
  scrollToContent();
}

async function loadMusic(){
  let r = await fetch('/api/music');
  let d = await r.json();

  let h = '<h2>Music</h2>';
  d.forEach(i => {
    h += `<div class="card"><b>${i.name}</b><br>${i.description}<br>${i.location}<br>${i.datetime}</div>`;
  });

  document.getElementById('exploreContent').innerHTML = h;
  scrollToContent();
}

async function loadExhibits(){
  let r = await fetch('/api/exhibits');
  let d = await r.json();

  let h = '<h2>Exhibits</h2>';
  d.forEach(i => {
    h += `<div class="card"><b>${i.name}</b><br>${i.description}<br>${i.location}<br>${i.category}</div>`;
  });

  document.getElementById('exploreContent').innerHTML = h;
  scrollToContent();
}

function showMap(){

    const MAP_BOUNDS = {
      north: 43.06114,   // top edge (lat)
      south: 43.05628,   // bottom edge
      west: -77.24221,   // left edge (lon)
      east: -77.23547    // right edge
    };

    function latLonToPercent(lat, lon) {
      const x = (lon - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west);
      const y = (MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south);

      return {
        x: x * 100,
        y: y * 100
      };
    }

    function isInside(lat, lon) {
      const LAT_TOL = 0.0005;  // ~55 meters
      const LON_TOL = 0.0005;

      return (
        lat <= MAP_BOUNDS.north + LAT_TOL &&
        lat >= MAP_BOUNDS.south - LAT_TOL &&
        lon >= MAP_BOUNDS.west - LON_TOL &&
        lon <= MAP_BOUNDS.east + LON_TOL
      );
    }

    document.getElementById('content').innerHTML = `
      <div class="card">
        Pinch and spread to explore the fairgrounds<br>
        Visible dot 📍 is you. Location is approximate.
      </div>
      <div id="map"></div>
    `;

    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
//        const lat = 43.0587;
//        const lon = -77.2388;

      if (!isInside(lat, lon)) return;

      const { x, y } = latLonToPercent(lat, lon);

//    console.log("lat/lon:", lat, lon);
//    console.log("percent:", x, y);

      let pin = document.createElement('div');
      pin.className = 'pin';

      pin.style.left = x + '%';
      pin.style.top = y + '%';

      document.getElementById('map').appendChild(pin);

    }, (err) => {
      console.log("Location not available", err);
    });

  scrollToContent();
}

async function showStatic(name){
  let target = document.getElementById('moreContent') || document.getElementById('content');

  try {
    const fileMap = {
      "Restrooms": "/static/restrooms.html",
      "First Aid": "/static/firstaid.html",
      "About": "/static/about.html"
    };

    const file = fileMap[name];

    if (!file) {
      target.innerHTML = `<div class="card">Content not found</div>`;
      return;
    }

    const res = await fetch(file);
    const html = await res.text();

    target.innerHTML = `
      <h2>${name}</h2>
      <div class="card">${html}</div>
    `;
  } catch (e) {
    target.innerHTML = `<div class="card">Error loading content</div>`;
  }

  scrollToContent();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log("SW registered:", reg.scope))
    .catch(err => console.error("SW failed:", err));
}

function showMore(){
  document.getElementById('content').innerHTML = `
    <div class="row">
      <button onclick="showStatic('Restrooms')">🚻 Restrooms</button>
      <button onclick="showStatic('First Aid')">🚑 First Aid</button>
      <button onclick="showStatic('About')">ℹ️ About</button>
    </div>
    <div id="moreContent"></div>
  `;
  scrollToContent();
}

function removeAlert(index){
  let alerts = JSON.parse(localStorage.getItem('alerts') || '[]');
  alerts.splice(index, 1);
  localStorage.setItem('alerts', JSON.stringify(alerts));
  showSchedule();
}

function clearAlerts(){
  localStorage.removeItem('alerts');
  showSchedule();
}

async function loadSponsors(){
  let r = await fetch('/api/sponsors');
  let d = await r.json();

  let gold = '<h2>🥇 Gold Sponsors</h2>';
  let silver = '<h2>🥈 Silver Sponsors</h2>';

  d.forEach(s => {
    let card = `
      <div class="card sponsor">
        <img src="${s.logo}" class="sponsor-logo"/><br>
        <b class="sponsor-name">${s.name}</b><br>
        ${s.description}<br><br>
        <a href="${s.website}" target="_blank">🌐 Website</a><br>
        📞 ${s.phone}
      </div>
    `;

    if(s.tier.toLowerCase() === 'gold'){
      gold += card;
    } else {
      silver += card;
    }
  });

  document.getElementById('content').innerHTML = gold + silver;
  scrollToContent();
}

function isEventActive(start, end){
  const now = Date.now();
  const startTime = parseTime(start).getTime();
  const endTime = parseTime(end).getTime();

  return now >= startTime && now <= endTime;
}

async function registerPush(){
  if (!('serviceWorker' in navigator)) {
    alert("Service workers not supported");
    return;
  }

  const reg = await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert("Notifications denied");
    return;
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array("BPAr2_PD2PGYvI0EsANa5gCXJ6z_hupiV6Bjdt7jxMaL_0D_QFdF-PbP3wDDNBM8PNzvbWRQegM9WH0yOyDVJ00")
  });

await fetch('/api/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(sub)
});

// ✅ ONLY mark enabled AFTER full success
localStorage.setItem('notificationsEnabled', 'true');

// ✅ Hide banner immediately
const card = document.getElementById('notifyCard');
if (card) card.style.display = 'none';

alert("Notifications enabled");
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}


