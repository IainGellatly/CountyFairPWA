
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e)=>{
 e.preventDefault(); deferredPrompt=e;
 document.getElementById('installBanner').style.display='block';
});

function installApp(){ if(deferredPrompt) deferredPrompt.prompt(); }

function parseTime(t){
 let [time,ampm]=t.split(' ');
 let [h,m]=time.split(':');
 h=parseInt(h);
 if(ampm==='PM'&&h<12)h+=12;
 let d=new Date(); d.setHours(h,m,0,0);
 return d;
}

function countdown(t){
 let diff=parseTime(t)-Date.now();
 let min=Math.floor(diff/60000);
 return min>0?`Starts in ${min} min`:'Started';
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
 let r=await fetch('/api/events'); let d=await r.json();
 let h='<h2>Today\'s Events</h2>';
 d.forEach(e=>{
  h+=`<div class="card">
   <b>${e.title}</b><br>${e.description}<br>${e.location}<br>${e.start_time}<br>
   ${countdown(e.start_time)}<br>
   <button onclick="setAlert(${e.id}, '${e.title}', '${e.start_time}')">🔔 Alert</button>
  </div>`;
 });
document.getElementById('content').innerHTML = h;
scrollToContent();
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
        <img src="${s.logo}" class="sponsor-logo"/>
        <b>${s.name}</b><br>
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
