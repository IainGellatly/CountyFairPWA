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
from pywebpush import webpush, WebPushException
import json

# ---------------- CONFIG ----------------
ONESIGNAL_APP_ID = "1d4ae603-9a1f-419c-85b7-c26008c471fe"
ONESIGNAL_API_KEY = "os_v2_app_dvfoma42d5azzbnxyjqarrdr7yialrrjkxhe325eygfqfmnmgax75unh3uyicbdlr5lpslhmpfcelj6rbqcqluhef7sjtwsndklf7ai"

VAPID_PUBLIC_KEY = "BPAr2_PD2PGYvI0EsANa5gCXJ6z_hupiV6Bjdt7jxMaL_0D_QFdF-PbP3wDDNBM8PNzvbWRQegM9WH0yOyDVJ00"
VAPID_PRIVATE_KEY = """-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg6J1mHsv5+E4rogT1
qi2JH1OhO9g8ge8kNF681hqnEBahRANCAATwK9vzw9jxmLyNBLADWuYAlyes/4bq
YlegY3be48TGi/9A/0BXRfj2z98AwzQTPDzc721kUHoDPVh9Mjsg1SdN
-----END PRIVATE KEY-----
"""

VAPID_CLAIMS = {
    "sub": "mailto:iagellatly@gmail.com"
}

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

# ---------------- PUSH (NATIVE) ----------------
def send_push(title, message):
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT endpoint, p256dh, auth FROM subscriptions")
    subs = c.fetchall()

    for s in subs:
        subscription_info = {
            "endpoint": s[0],
            "keys": {
                "p256dh": s[1],
                "auth": s[2]
            }
        }

        try:

            from cryptography.hazmat.primitives import serialization

            print("LEN:", len(VAPID_PRIVATE_KEY))
            print("START:", VAPID_PRIVATE_KEY[:30])
            print("END:", VAPID_PRIVATE_KEY[-30:])

            # Try to parse the key explicitly
            serialization.load_pem_private_key(
                VAPID_PRIVATE_KEY.encode(),
                password=None
            )

            print("PEM PARSE OK")

            from py_vapid import Vapid

            vapid = Vapid.from_pem(VAPID_PRIVATE_KEY.encode())

            webpush(
                subscription_info,
                data=json.dumps({
                    "title": title,
                    "body": message
                }),
                vapid_private_key=vapid,
                vapid_claims=VAPID_CLAIMS,
                content_encoding="aes128gcm",
                headers = {
                    "TTL": "60",
                    "Urgency": "normal"
                }
            )

        except WebPushException as ex:
            log.error(f"Push failed: {ex}")

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

@app.post("/api/subscribe")
async def subscribe(request: Request):
    data = await request.json()

    conn = get_db()
    c = conn.cursor()

    c.execute("""
        INSERT INTO subscriptions (endpoint, p256dh, auth)
        VALUES (?, ?, ?)
    """, (
        data["endpoint"],
        data["keys"]["p256dh"],
        data["keys"]["auth"]
    ))

    conn.commit()
    conn.close()

    return {"status": "subscribed"}

@app.get("/sw.js")
def sw():
    return FileResponse("sw.js", media_type="application/javascript")

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