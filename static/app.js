
function show(name){
 if(name==='home'){
  document.getElementById('content').innerHTML = '<h2>Welcome to the Fair</h2>';
 }
 if(name==='schedule'){
  let alerts = JSON.parse(localStorage.getItem('alerts')||'[]');
  document.getElementById('content').innerHTML = '<h2>My Alerts</h2>'+alerts.join('<br>');
 }
}

async function loadEvents(){
 const res = await fetch('/api/events');
 const data = await res.json();
 let html='<h2>Today\'s Events</h2>';
 data.forEach(e=>{
  html+=`<div class="card">
   <b>${e.title}</b><br>${e.description}<br>${e.location}<br>${e.start_time}
   <br><button onclick="setAlert(${e.id})">🔔 Alert Me</button>
  </div>`;
 });
 document.getElementById('content').innerHTML=html;
}

function setAlert(id){
 let a=JSON.parse(localStorage.getItem('alerts')||'[]');
 a.push(id); localStorage.setItem('alerts',JSON.stringify(a));
 alert('Install app to get reminders!');
}

function showExplore(){
 document.getElementById('content').innerHTML=`
 <button onclick="loadFood()">Food</button>
 <button onclick="loadMusic()">Music</button>
 <button onclick="loadExhibits()">Exhibits</button>`;
}

async function loadFood(){
 const r=await fetch('/api/food'); const d=await r.json();
 let h='<h2>Food</h2>';
 d.forEach(i=>h+=`<div class="card"><b>${i.name}</b><br>${i.description}<br>${i.location}</div>`);
 document.getElementById('content').innerHTML=h;
}

async function loadMusic(){
 const r=await fetch('/api/music'); const d=await r.json();
 let h='<h2>Music</h2>';
 d.forEach(i=>h+=`<div class="card"><b>${i.name}</b><br>${i.description}<br>${i.location}<br>${i.datetime}</div>`);
 document.getElementById('content').innerHTML=h;
}

async function loadExhibits(){
 const r=await fetch('/api/exhibits'); const d=await r.json();
 let h='<h2>Exhibits</h2>';
 d.forEach(i=>h+=`<div class="card"><b>${i.name}</b><br>${i.description}<br>${i.location}<br>${i.category}</div>`);
 document.getElementById('content').innerHTML=h;
}

if('serviceWorker' in navigator){
 navigator.serviceWorker.register('/static/sw.js');
}
