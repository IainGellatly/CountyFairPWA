window.addEventListener('beforeinstallprompt', (e)=>{
  console.log("Install prompt available ✅");
  e.preventDefault();
  deferredPrompt = e;
});

function installApp(){
  if(deferredPrompt){
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then(choiceResult => {
      if(choiceResult.outcome === 'accepted'){
        console.log('User installed the app');

        // Register push AFTER install
        registerPush();
      }
      deferredPrompt = null;
    });
  } else {
    alert("To install:\nTap the menu (⋮) in Chrome and select 'Add to Home Screen'");
  }
}

function installApp(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    registerPush();   // 👈 ADD THIS
  }
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

async function loadEvents(){
let [eventsRes, alertsRes] = await Promise.all([
  fetch('/api/events'),
  fetch('/api/alerts')
]);

let d = await eventsRes.json();
let userAlerts = new Set(await alertsRes.json());

let h = `
  <div class="card">
    📲 <b>Get Event Reminders</b><br><br>
    1. Tap the <b>Install App</b> button below<br>
    2. Add it to your home screen<br>
    3. Allow notifications when prompted<br><br>
    <button onclick="installApp()">📲 Install App</button>
  </div>
  <h2>📅 Today's Events</h2>
`;

  d.forEach(e => {
    h += `
      <div class="card">
        <b>${e.title}</b><br>
        ${e.description}<br>
        ${e.location}<br>
        ${e.start_time}<br>
        ${countdown(e.start_time) ? countdown(e.start_time) + '<br><br>' : '<br>'}
        <button
          class="alert-btn"
          data-event-id="${e.id}"
          data-title="${e.title}"
          data-time="${e.start_time}"
        >
          🔔 Alert Me
        </button>

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
      if (!isActive) {
        await fetch(`/api/alerts/add/${eventId}`, { method: "POST" });

        button.classList.add("active");
        button.textContent = "Remove Alert";
      } else {
        await fetch(`/api/alerts/remove/${eventId}`, { method: "POST" });

        button.classList.remove("active");
        button.textContent = "🔔 Alert Me";
      }
    } catch (err) {
      console.error("Toggle failed", err);
    }
  });
});


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
  document.getElementById('content').innerHTML = '<div id="map"></div>';

  navigator.geolocation.getCurrentPosition(()=>{
    let pin = document.createElement('div');
    pin.className = 'pin';
    pin.style.left = '50%';
    pin.style.top = '50%';
    document.getElementById('map').appendChild(pin);
  });

  scrollToContent();
}

function showStatic(name){
  let target = document.getElementById('moreContent') || document.getElementById('content');

  target.innerHTML = `
    <h2>${name}</h2>
    <div class="card">Sample info for ${name}</div>
  `;

  scrollToContent();
}

if('serviceWorker' in navigator){
 navigator.serviceWorker.register('/static/sw.js');
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

async function registerPush(){
  if (!('serviceWorker' in navigator)) return;

  const reg = await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array('PASTE_PUBLIC_KEY')
  });

  await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub)
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

