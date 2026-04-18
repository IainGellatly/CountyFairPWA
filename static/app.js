if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    console.log("SW registered");

    if (!navigator.serviceWorker.controller) {
      window.location.reload();
    }
  });
}

function notificationsEnabled(){
  return Notification.permission === 'granted';
}

// ✅ FIXED: Always ensure endpoint exists (auto-recover subscription)
async function getEndpoint(){
  if (!('serviceWorker' in navigator)) return null;

  const reg = await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();

  // 🔴 AUTO-RECOVER subscription if missing
  if (!sub){
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return null;

      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array("BPAr2_PD2PGYvI0EsANa5gCXJ6z_hupiV6Bjdt7jxMaL_0D_QFdF-PbP3wDDNBM8PNzvbWRQegM9WH0yOyDVJ00")
      });

      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      });

      console.log("Auto-subscribed");

    } catch (err){
      console.error("Auto-subscribe failed", err);
      return null;
    }
  }

  return sub.endpoint;
}

function parseTime(t){
  let [h, m] = t.split(':').map(Number);
  let d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatTime12(t){
  let [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2,'0')} ${ampm}`;
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

  if (now >= startTime){
    return '';
  }

  return `
    <button
      class="alert-btn"
      data-event-id="${e.id}"
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

  let events = await eventsRes.json();
  let userAlerts = new Set();

  try {
    const alertData = await alertsRes.json();
    if (Array.isArray(alertData)) {
      userAlerts = new Set(alertData);
    }
  } catch (e) {}

  let h = '';

  // ✅ ORIGINAL BANNER RESTORED
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

events.forEach(e => {
  const activeClass = isEventActive(e.start_time, e.end_time) ? "active-event" : "";

  h += `
    <div class="card ${activeClass}">
      <b>${e.title}</b><br>
      ${e.description}<br>
      ${e.location}<br>
      ${formatTime12(e.start_time)} - ${formatTime12(e.end_time)}<br>
      ${getEventStatus(e.start_time, e.end_time)}<br><br>
      ${renderAlertButton(e)}
    </div>
  `;
});

  document.getElementById('content').innerHTML = h;

  scrollToContent();

  document.querySelectorAll(".alert-btn").forEach(button => {
    const eventId = parseInt(button.dataset.eventId);

    if (userAlerts.has(eventId)) {
      button.classList.add("active");
      button.textContent = "Remove Alert";
    }

    button.addEventListener("click", async () => {

      const isActive = button.classList.contains("active");

      try {
        const endpoint = await getEndpoint();

        if (!endpoint){
          alert("Enable notifications to use alerts");
          return;
        }

        const url = isActive
          ? `/api/alerts/remove/${eventId}`
          : `/api/alerts/add/${eventId}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint })
        });

        if (!res.ok) throw new Error("Request failed");

        // ✅ Update UI AFTER success (but same behavior)
        if (!isActive) {
          button.classList.add("active");
          button.textContent = "Remove Alert";
        } else {
          button.classList.remove("active");
          button.textContent = "🔔 Alert Me";
        }

      } catch (err) {
        console.error(err);
        alert("Error updating alert");
      }
    });
  });
}

function installApp(){
  registerPush();
}

async function registerPush(){
  const reg = await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array("BPAr2_PD2PGYvI0EsANa5gCXJ6z_hupiV6Bjdt7jxMaL_0D_QFdF-PbP3wDDNBM8PNzvbWRQegM9WH0yOyDVJ00")
  });

  await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub)
  });

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

function getEventStatus(start, end){
  const now = Date.now();
  const startTime = parseTime(start).getTime();
  const endTime = parseTime(end).getTime();

  if (now < startTime){
    const min = Math.floor((startTime - now) / 60000);

    if (min <= 120){
      return `<b>Starts in ${min} min</b>`;
    }
    return '';
  }

  if (now >= startTime && now <= endTime){
    return `<b>Happening Now</b>`;
  }

  return `<b>Ended</b>`;
}

function isEventActive(start, end){
  const now = Date.now();
  const startTime = parseTime(start).getTime();
  const endTime = parseTime(end).getTime();

  return now >= startTime && now <= endTime;
}


// ---------------- EXPLORE ----------------
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

// ---------------- MAP ----------------
function showMap(){

  document.getElementById('content').innerHTML = `
    <div class="card">
      Pinch and spread to explore the Fair.<br>
      Red dot 📍 is your current location.
    </div>
    <div id="map"></div>
  `;

  scrollToContent();

  const MAP_BOUNDS = {
    north: 43.06114,
    south: 43.05628,
    west: -77.24221,
    east: -77.23547
  };

  const LAT_TOL = 0.0005;
  const LON_TOL = 0.0005;

  function isInside(lat, lon) {
    return (
      lat <= MAP_BOUNDS.north + LAT_TOL &&
      lat >= MAP_BOUNDS.south - LAT_TOL &&
      lon >= MAP_BOUNDS.west - LON_TOL &&
      lon <= MAP_BOUNDS.east + LON_TOL
    );
  }

  function latLonToPercent(lat, lon) {
    const x = (lon - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west);
    const y = (MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south);
    return { x: x * 100, y: y * 100 };
  }

  // ---------------- SMOOTHING ----------------
  let positionHistory = [];

  function smoothPosition(lat, lon) {
    positionHistory.push({ lat, lon });

    if (positionHistory.length > 5) {
      positionHistory.shift();
    }

    let avgLat = positionHistory.reduce((sum, p) => sum + p.lat, 0) / positionHistory.length;
    let avgLon = positionHistory.reduce((sum, p) => sum + p.lon, 0) / positionHistory.length;

    return { lat: avgLat, lon: avgLon };
  }

  // ---------------- MOVEMENT FILTER ----------------
  let lastLat = null;
  let lastLon = null;

  function hasMovedEnough(lat, lon) {
    if (!lastLat) return true;

    const dist = Math.sqrt(
      Math.pow(lat - lastLat, 2) +
      Math.pow(lon - lastLon, 2)
    );

    return dist > 0.00005; // ~5 meters
  }

  const mapEl = document.getElementById('map');

  let pin = document.createElement('div');
  pin.className = 'pin';
  mapEl.appendChild(pin);

  function updateUserPosition(pos) {

    const accuracy = pos.coords.accuracy;

    if (accuracy > 40) {
      return;
    }

    let lat = pos.coords.latitude;
    let lon = pos.coords.longitude;

    const smoothed = smoothPosition(lat, lon);

    if (!hasMovedEnough(smoothed.lat, smoothed.lon)) return;

    lastLat = smoothed.lat;
    lastLon = smoothed.lon;

    if (!isInside(smoothed.lat, smoothed.lon)) {
      pin.style.display = 'none';
      return;
    }

    const { x, y } = latLonToPercent(smoothed.lat, smoothed.lon);

    const clampedX = Math.min(100, Math.max(0, x));
    const clampedY = Math.min(100, Math.max(0, y));

    pin.style.display = 'block';
    pin.style.left = clampedX + '%';
    pin.style.top = clampedY + '%';

    // 🔴 Accuracy halo
    const haloSize = Math.min(accuracy * 2, 60);
    pin.style.boxShadow = `0 0 ${haloSize}px rgba(255,0,0,0.5)`;
  }

  if (!navigator.geolocation) {
    alert("Location not supported");
    return;
  }

  navigator.geolocation.watchPosition(
    updateUserPosition,
    (err) => console.log(err),
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  );
}

// ---------------- MORE ----------------
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

async function showStatic(name){
  let target = document.getElementById('moreContent') || document.getElementById('content');

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

  scrollToContent();
}

// ---------------- SPONSORS ----------------
async function loadSponsors(){
  let r = await fetch('/api/sponsors');
  let d = await r.json();

  let gold = '<h2>🥇 Gold Sponsors</h2>';
  let silver = '<h2>🥈 Silver Sponsors</h2>';

  d.forEach(s => {
    let card = `
      <div class="card sponsor">
        <img src="${s.logo}" class="sponsor-logo"/><br>
        <b>${s.name}</b><br>
        ${s.description}<br>
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

