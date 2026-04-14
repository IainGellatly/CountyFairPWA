
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

async function loadEvents(){
 let r=await fetch('/api/events'); let d=await r.json();
 let h='<h2>Today\'s Events</h2>';
 d.forEach(e=>{
  h+=`<div class="card">
   <b>${e.title}</b><br>${e.description}<br>${e.location}<br>${e.start_time}<br>
   ${countdown(e.start_time)}<br>
   <button onclick="setAlert('${e.start_time}')">🔔 Alert</button>
  </div>`;
 });
 document.getElementById('content').innerHTML=h;
}

function setAlert(t){
 let a=JSON.parse(localStorage.getItem('alerts')||'[]');
 a.push(t); localStorage.setItem('alerts',JSON.stringify(a));
 Notification.requestPermission();
}

function showSchedule(){
 let a=JSON.parse(localStorage.getItem('alerts')||'[]');
 let h='<h2>My Schedule</h2>';
 a.forEach(t=>{
  h+=`<div class="card">${t}<br>${countdown(t)}</div>`;
 });
 document.getElementById('content').innerHTML=h;
}

function showExplore(){
 document.getElementById('content').innerHTML=`
 <div class="sub">
  <button onclick="loadFood()">🍔 Food</button>
  <button onclick="loadMusic()">🎵 Music</button>
  <button onclick="loadExhibits()">🐄 Exhibits</button>
 </div>`;
}

async function loadFood(){
 let r=await fetch('/api/food'); let d=await r.json();
 let h='<h2>Food Vendors</h2>';
 d.forEach(i=>h+=`<div class="card"><b>${i.name}</b><br>${i.description}<br>${i.location}</div>`);
 document.getElementById('content').innerHTML=h;
}

async function loadMusic(){
 let r=await fetch('/api/music'); let d=await r.json();
 let h='<h2>Music</h2>';
 d.forEach(i=>h+=`<div class="card"><b>${i.name}</b><br>${i.description}<br>${i.location}<br>${i.datetime}</div>`);
 document.getElementById('content').innerHTML=h;
}

async function loadExhibits(){
 let r=await fetch('/api/exhibits'); let d=await r.json();
 let h='<h2>Exhibits</h2>';
 d.forEach(i=>h+=`<div class="card"><b>${i.name}</b><br>${i.description}<br>${i.location}<br>${i.category}</div>`);
 document.getElementById('content').innerHTML=h;
}

function showMap(){
 document.getElementById('content').innerHTML='<div id="map"></div>';
 navigator.geolocation.getCurrentPosition(()=>{
  let pin=document.createElement('div');
  pin.className='pin';
  pin.style.left='50%';
  pin.style.top='50%';
  document.getElementById('map').appendChild(pin);
 });
}

function showStatic(name){
 document.getElementById('content').innerHTML=`<h2>${name}</h2><div class="card">Sample info for ${name}</div>`;
}

if('serviceWorker' in navigator){
 navigator.serviceWorker.register('/static/sw.js');
}
