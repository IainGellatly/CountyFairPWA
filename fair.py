import uvicorn
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from database import get_db
import logging
import threading
import time
from datetime import datetime, timedelta
import requests

# ---------------- CONFIG ----------------
ONESIGNAL_APP_ID = "1d4ae603-9a1f-419c-85b7-c26008c471fe"
ONESIGNAL_API_KEY = "os_v2_app_dvfoma42d5azzbnxyjqarrdr7yialrrjkxhe325eygfqfmnmgax75unh3uyicbdlr5lpslhmpfcelj6rbqcqluhef7sjtwsndklf7ai"

CLOUD_SERVICE_NAME = 'fair'
CLOUD_LOGGING_LEVEL = logging.INFO
CLOUD_LOG_FILE_NAME = 'fair.log'
SERVER_HOST = '0.0.0.0'
SERVER_PORT = 8000

# ---------------- LOGGING ----------------
log = logging.getLogger(CLOUD_SERVICE_NAME)
logging.basicConfig(
    filename=CLOUD_LOG_FILE_NAME,
    format='%(asctime)s %(levelname)-8s %(message)s',
    level=CLOUD_LOGGING_LEVEL,
    datefmt='%Y-%m-%d %H:%M:%S'
)

# ---------------- PUSH (ONESIGNAL) ----------------
def send_push(title, message):
    headers = {
        "Authorization": f"Basic {ONESIGNAL_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "app_id": ONESIGNAL_APP_ID,
        "included_segments": ["All"],
        "headings": {"en": title},
        "contents": {"en": message}
    }

    try:
        r = requests.post(
            "https://onesignal.com/api/v1/notifications",
            headers=headers,
            json=payload
        )
        log.info(f"OneSignal response: {r.status_code} {r.text}")
    except Exception as e:
        log.error(f"Push error: {e}")

# ---------------- SCHEDULER ----------------
def alert_scheduler():
    while True:
        try:
            conn = get_db()
            c = conn.cursor()

            now = datetime.now()

            c.execute("""
                SELECT e.id, e.title, e.start_time
                FROM events e
                JOIN alerts a ON e.id = a.event_id
            """)

            rows = c.fetchall()

            for r in rows:
                event_id, title, start_time = r

                event_time = datetime.strptime(start_time, "%I:%M %p")
                event_time = event_time.replace(
                    year=now.year,
                    month=now.month,
                    day=now.day
                )

                diff = (event_time - now).total_seconds() / 60

                if 9 <= diff <= 10:
                    send_push(
                        "Upcoming Event",
                        f"{title} starts in 10 minutes"
                    )

            conn.close()

        except Exception as e:
            log.error(f"Scheduler error: {e}")

        time.sleep(60)

# ---------------- APP ----------------
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
def root():
    return FileResponse("templates/index.html")

# ---------------- HELPERS ----------------
def fetch(q):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(q)
    rows = cur.fetchall()
    conn.close()
    return rows

# ---------------- API ROUTES ----------------
@app.get("/api/events")
def events():
    rows = fetch("SELECT id,title,description,location,start_time,end_time FROM events ORDER BY start_time")
    return [
        {
            "id": r[0],
            "title": r[1],
            "description": r[2],
            "location": r[3],
            "start_time": r[4],
            "end_time": r[5]
        }
        for r in rows
    ]

@app.get("/api/food")
def food():
    rows = fetch("SELECT name,description,location FROM food")
    return [{"name": r[0], "description": r[1], "location": r[2]} for r in rows]

@app.get("/api/music")
def music():
    rows = fetch("SELECT name,description,location,datetime FROM music")
    return [{"name": r[0], "description": r[1], "location": r[2], "datetime": r[3]} for r in rows]

@app.get("/api/exhibits")
def exhibits():
    rows = fetch("SELECT name,description,location,category FROM exhibits")
    return [{"name": r[0], "description": r[1], "location": r[2], "category": r[3]} for r in rows]

@app.get("/api/sponsors")
def sponsors():
    rows = fetch("SELECT name, tier, description, logo, website, phone FROM sponsors")
    return [
        {
            "name": r[0],
            "tier": r[1],
            "description": r[2],
            "logo": r[3],
            "website": r[4],
            "phone": r[5]
        }
        for r in rows
    ]

# ---------------- ALERTS ----------------
@app.get("/api/alerts")
def get_alerts():
    rows = fetch("SELECT event_id FROM alerts")
    return [r[0] for r in rows]

@app.post("/api/alerts/add/{event_id}")
async def add_alert(event_id: int, request: Request):
    conn = get_db()
    c = conn.cursor()

    c.execute("INSERT INTO alerts (event_id) VALUES (?)", (event_id,))

    conn.commit()
    conn.close()

    return {"status": "added"}

@app.post("/api/alerts/remove/{event_id}")
async def remove_alert(event_id: int):
    conn = get_db()
    c = conn.cursor()

    c.execute("DELETE FROM alerts WHERE event_id = ?", (event_id,))

    conn.commit()
    conn.close()

    return {"status": "removed"}

# ---------------- TEST PUSH ----------------
@app.get("/api/test-notify")
def test_notify():
    send_push("Fair Reminder", "Event starting soon!")
    return {"status": "sent"}

# ---------------- MAIN ----------------
if __name__ == '__main__':
    log.info('Starting Fair App')

    threading.Thread(target=alert_scheduler, daemon=True).start()

    uvicorn.run(
        'fair:app',
        host=SERVER_HOST,
        port=SERVER_PORT,
        log_level='info'
    )