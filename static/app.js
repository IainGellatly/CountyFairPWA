
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
 e.preventDefault();
 deferredPrompt = e;
 document.getElementById('installBanner').style.display='block';
});

function installApp(){
 if(deferredPrompt){
  deferredPrompt.prompt();
 }
}

function showHome(){
 document.getElementById('content').innerHTML='<h2>Welcome</h2>';
}

async function loadEvents(){
 const res = await fetch('/api/events');
 const data = await res.json();
 let html='<h2>Events</h2>';
 data.forEach(e=>{
  html+=`<div class="card">
   <b>${e.title}</b><br>${e.description}<br>${e.location}<br>${e.start_time}
   <br><button onclick="setAlert(${e.id}, '${e.start_time}')">🔔 Alert</button>
  </div>`;
 });
 document.getElementById('content').innerHTML=html;
}

function setAlert(id,time){
 let a=JSON.parse(localStorage.getItem('alerts')||'[]');
 a.push({id,time});
 localStorage.setItem('alerts',JSON.stringify(a));
 Notification.requestPermission().then(p=>{
  if(p==='granted'){
    new Notification('Reminder set!');
  }
 });
}

function showSchedule(){
 let a=JSON.parse(localStorage.getItem('alerts')||'[]');
 let html='<h2>My Schedule</h2>';
 a.forEach(i=>{
  html+=`<div class="card">Event ${i.id} at ${i.time} - ${countdown(i.time)}</div>`;
 });
 document.getElementById('content').innerHTML=html;
}

function countdown(time){
 return 'Soon'; // simplified
}

function showMap(){
 document.getElementById('content').innerHTML='<div id="map">Loading map...</div>';
 navigator.geolocation.getCurrentPosition(pos=>{
  document.getElementById('map').innerHTML='You are here (approx)';
 });
}

if('serviceWorker' in navigator){
 navigator.serviceWorker.register('/static/sw.js');
}
