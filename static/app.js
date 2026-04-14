async function loadEvents() {
  const res = await fetch('/api/events');
  const data = await res.json();

  let html = '<h2>Today\'s Events</h2>';

  data.forEach(e => {
    html += `
      <div class="event">
        <b>${e.title}</b><br>
        ${e.description}<br>
        ${e.location}<br>
        ${e.start_time}<br>
        <button onclick="setAlert(${e.id})">🔔 Alert Me</button>
      </div>
    `;
  });

  document.getElementById('content').innerHTML = html;
}

function setAlert(id) {
  let alerts = JSON.parse(localStorage.getItem('alerts') || '[]');
  alerts.push(id);
  localStorage.setItem('alerts', JSON.stringify(alerts));

  alert('Reminder set! Install app for notifications.');
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/static/sw.js');
}
