if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    console.log("SW registered");

//    if (!navigator.serviceWorker.controller) {
//      window.location.reload();
//    }
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
      <button onclick="loadAnimals()">🐄 Animals</button>
    </div>
    <div class="row">
      <button onclick="loadOrganizations()">🏛️ Organizations</button>
      <button onclick="loadCommercial()">🛍️ Commercial</button>
      <button onclick="loadDerby()">🚗 Demolition Derby</button>
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

async function loadAnimals(){
  let r = await fetch('/api/animals');
  let d = await r.json();

  let h = '<h2>Animals</h2>';
  d.forEach(i => {
    h += `<div class="card"><b>${i.name}</b><br>${i.description}<br>${i.location}</div>`;
  });

  document.getElementById('exploreContent').innerHTML = h;
  scrollToContent();
}

async function loadOrganizations(){
  let r = await fetch('/api/organizations');
  let d = await r.json();

  let h = '<h2>Organizations</h2>';
  d.forEach(i => {
    h += `<div class="card"><b>${i.name}</b><br>${i.description}<br>${i.location}</div>`;
  });

  document.getElementById('exploreContent').innerHTML = h;
  scrollToContent();
}

async function loadCommercial(){
  let r = await fetch('/api/commercial');
  let d = await r.json();

  let h = '<h2>Commercial Vendors</h2>';
  d.forEach(i => {
    h += `<div class="card"><b>${i.name}</b><br>${i.description}<br>${i.location}</div>`;
  });

  document.getElementById('exploreContent').innerHTML = h;
  scrollToContent();
}

async function loadDerby(){
  const res = await fetch('/static/derby.html');
  const html = await res.text();

  document.getElementById('exploreContent').innerHTML = `
    <h2>Demolition Derby</h2>
    <div class="card">${html}</div>
  `;

  scrollToContent();
}

// ---------------- MAP ----------------
function showMap(){

  document.getElementById('content').innerHTML = `
    <div class="card">
      Pinch and spread to explore. Red dot is your location. Tap yellow ? for info.
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

// ---------------- POI ZONES ----------------
const POIS = [
  { id: "entertainment", left: 32.39, top: 17.61, width: 11.42, height: 9.35, text: "Beer tent, main stage and seating area" },
  { id: "grandstand", left: 38.58, top: 47.00, width: 12.24, height: 17.46, text: "Bleacher seating for demolition derby and track events" },
  { id: "midway", left: 33.06, top: 28.87, width: 12.24, height: 16.06, text: "Rides, games and more food" },
  { id: "food", left: 48.92, top: 23.19, width: 16.74, height: 5.17, text: "Snack, drinks and meals with bench seating" },
  { id: "entrance", left: 54.60, top: 6.61, width: 11.21, height: 14.77, text: "Flag pole seating area, Floral Hall and 4-H Building" },
  { id: "commercial", left: 44.89, top: 14.67, width: 8.73, height: 8.11, text: "Two buildings of commercial and organization information" },
  { id: "agriculture", left: 66.58, top: 16.22, width: 13.07, height: 13.38, text: "Livestock displays, judging and events" },
  { id: "stable", left: 73.14, top: 32.75, width: 9.81, height: 23.50, text: "Horse stables and track event preparation area" }
];

// Create invisible clickable zones
POIS.forEach(poi => {
  const z = document.createElement('div');
  z.className = 'zone';

  z.style.left = poi.left + '%';
  z.style.top = poi.top + '%';
  z.style.width = poi.width + '%';
  z.style.height = poi.height + '%';

  z.addEventListener('click', (e) => showPOIPopup(poi, e));

  mapEl.appendChild(z);
});

// Popup function
function showPOIPopup(poi, event){

  // Remove any existing popup first
  const existing = document.querySelector('.poi-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.className = 'poi-popup';

  const content = document.createElement('div');
  content.className = 'poi-content';

  content.innerHTML = `
    <h3>${poi.id.toUpperCase()}</h3>
    <p>${poi.text}</p>
  `;

  popup.appendChild(content);
  document.body.appendChild(popup);

  // 👉 Position near tap
  const x = event.clientX;
  const y = event.clientY;

  content.style.position = 'absolute';
  content.style.left = x + 'px';
  content.style.top = y + 'px';
  content.style.transform = 'translate(-50%, -110%)'; // above finger

  // 👉 Keep inside screen bounds
  const rect = content.getBoundingClientRect();

  if (rect.left < 10) content.style.left = '10px';
  if (rect.right > window.innerWidth - 10)
    content.style.left = (window.innerWidth - rect.width - 10) + 'px';

  if (rect.top < 10)
    content.style.top = (y + 20) + 'px'; // flip below if too high

  // 👉 Tap anywhere closes
  popup.addEventListener('click', () => popup.remove());

  // 👉 Prevent immediate close when tapping content
  content.addEventListener('click', (e) => e.stopPropagation());
}

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

document.querySelectorAll(".icon-card").forEach(card => {

  const page = card.dataset.page;
  if (!page) return;

  card.addEventListener("click", () => loadPage(page));
});

async function loadPage(page){

  const content = document.getElementById("content");

    if (page === "calendar"){
      loadEventsCalendar();
      return;
    }

    if (page === "fun"){
      loadMusicEvents();
      return;
    }

    if (page === "explore"){
      showExploreMap();
      return;
    }

  // 🔴 DYNAMIC DATA PAGES
  if (["food","exhibits","business","animals","sponsors"].includes(page)){

    loadDynamic(page);
    return;
  }

  // 🔴 STATIC PAGES (unchanged)
  try {
    const res = await fetch(`/static/${page}.html`);
    const html = await res.text();

    content.innerHTML = `<div class="card">${html}</div>`;
    content.scrollIntoView({ behavior: "smooth" });

  } catch {
    content.innerHTML = `<div class="card">Content not available</div>`;
  }
}

async function loadDynamic(type){

  const content = document.getElementById("content");

  // ---------------- SPONSORS (SPECIAL CASE)
  if (type === "sponsors"){

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

      if (s.tier.toLowerCase() === 'gold'){
        gold += card;
      } else {
        silver += card;
      }
    });

    content.innerHTML = gold + silver;
    content.scrollIntoView({ behavior: "smooth" });

    return;
  }

  // ---------------- STANDARD LISTS
  let r = await fetch(`/api/${type}`);
  let data = await r.json();

  let titleMap = {
    food: "Food Vendors",
    exhibits: "Exhibits",
    business: "Business",
    animals: "Animals"
  };

  let h = `<h2>${titleMap[type]}</h2>`;

  data.forEach(i => {
    h += `
      <div class="card">
        <b>${i.name}</b><br>
        ${i.description}<br>
        ${i.location}
      </div>
    `;
  });

  content.innerHTML = h;
  content.scrollIntoView({ behavior: "smooth" });
}

function showExploreMap(){
  showMap();   // reuse EXACT existing logic
}

function formatTime12(dt){
  const d = new Date(dt);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2,'0');
  const ampm = h >= 12 ? 'PM' : 'AM';

  h = h % 12;
  if (h === 0) h = 12;

  return `${h}:${m} ${ampm}`;
}

function formatDayHeader(dt){
  const d = new Date(dt);

  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

async function loadEventsCalendar(){

  const content = document.getElementById("content");

  let r = await fetch('/api/events');
  let data = await r.json();

  let h = '';

  let currentDay = '';

  data.forEach(e => {

    const day = e.start_time.split(' ')[0]; // YYYY-MM-DD

    if (day !== currentDay){
      currentDay = day;

      h += `<h2>${formatDayHeader(e.start_time)}</h2>`;
    }

    h += `
      <div class="card">
        <b>${e.title}</b><br>
        ${e.description}<br>
        ${e.location}<br>
        ${e.price ? e.price + '<br>' : ''}
        ${formatTime12(e.start_time)} - ${formatTime12(e.end_time)}
      </div>
    `;
  });

  content.innerHTML = h;
  content.scrollIntoView({ behavior: "smooth" });
}

async function loadMusicEvents(){

  const content = document.getElementById("content");

  let r = await fetch('/api/events/music');
  let data = await r.json();

  let h = '';

  let currentDay = '';

  data.forEach(e => {

    const day = e.start_time.split(' ')[0];

    if (day !== currentDay){
      currentDay = day;

      h += `<h2>${formatDayHeader(e.start_time)}</h2>`;
    }

    h += `
      <div class="card">
        <b>${e.title}</b><br>
        ${e.description}<br>
        ${e.location}<br>
        ${formatTime12(e.start_time)} - ${formatTime12(e.end_time)}
      </div>
    `;
  });

  content.innerHTML = h;
  content.scrollIntoView({ behavior: "smooth" });
}

// Disable long-press context menu globally
document.addEventListener("contextmenu", e => e.preventDefault());
