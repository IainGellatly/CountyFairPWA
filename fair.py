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
import pytz

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
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {"()": "uvicorn.logging.DefaultFormatter", "fmt": "%(message)s", "use_colors": False},
    },
    "handlers": {
        "file": {"class": "logging.FileHandler", "filename": "uvicorn.log", "formatter": "default"},
    },
    "loggers": {
        "uvicorn": {"handlers": ["file"], "level": "INFO"},
    },
}

# ---------------- LOGGING ----------------
log = logging.getLogger(CLOUD_SERVICE_NAME)
logging.basicConfig(
    filename=CLOUD_LOG_FILE_NAME,
    format='%(asctime)s %(levelname)-8s %(message)s',
    level=CLOUD_LOGGING_LEVEL,
    datefmt='%Y-%m-%d %H:%M:%S'
)

def send_push_to_one(sub, message):
    endpoint, p256dh, auth = sub

    subscription_info = {
        "endpoint": endpoint,
        "keys": {
            "p256dh": p256dh,
            "auth": auth
        }
    }

    parsed = urlparse(endpoint)
    aud = f"{parsed.scheme}://{parsed.netloc}"

    vapid = Vapid.from_pem(VAPID_PRIVATE_KEY.encode())

    webpush(
        subscription_info,
        data=json.dumps({
            "title": "Upcoming Event",
            "body": message
        }),
        vapid_private_key=vapid,
        vapid_claims={
            "sub": "mailto:iagellatly@gmail.com",
            "aud": aud
        },
        content_encoding="aes128gcm",
        headers={"TTL": "60", "Urgency": "normal"}
    )


# ---------------- PUSH (NATIVE) ----------------
from urllib.parse import urlparse
from py_vapid import Vapid

def send_push(title, message):
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT endpoint, p256dh, auth FROM subscriptions")
    subs = c.fetchall()

    # ✅ Keep this — required for PEM handling
    vapid = Vapid.from_pem(VAPID_PRIVATE_KEY.encode())

    for s in subs:
        endpoint = s[0]

        subscription_info = {
            "endpoint": endpoint,
            "keys": {
                "p256dh": s[1],
                "auth": s[2]
            }
        }

        # ✅ REQUIRED: correct audience per endpoint
        parsed = urlparse(endpoint)
        aud = f"{parsed.scheme}://{parsed.netloc}"

        vapid_claims = {
            "sub": "mailto:iagellatly@gmail.com",
            "aud": aud
        }

        try:
            webpush(
                subscription_info,
                data=json.dumps({
                    "title": title,
                    "body": message
                }),
                vapid_private_key=vapid,
                vapid_claims=vapid_claims,
                content_encoding="aes128gcm",
                headers={
                    "TTL": "60",
                    "Urgency": "normal"   # ✅ keep this
                }
            )
        except WebPushException as ex:
            log.error(f"Push failed: {ex}")

            # ✅ Remove invalid subscriptions
            if ex.response and ex.response.status_code == 410:
                conn2 = get_db()
                c2 = conn2.cursor()

                c2.execute("DELETE FROM subscriptions WHERE endpoint = ?", (endpoint,))
                conn2.commit()
                conn2.close()

# ---------------- SCHEDULER ----------------
def alert_scheduler():
    import pytz
    from datetime import datetime
    from urllib.parse import urlparse

    tz = pytz.timezone("America/New_York")

    while True:
        try:
            conn = get_db()
            c = conn.cursor()

            # ✅ Get ONLY unsent alerts with endpoint
            c.execute("""
                SELECT e.id, e.title, e.start_time, a.endpoint, a.id
                FROM events e
                JOIN alerts a ON e.id = a.event_id
                WHERE a.sent = 0
            """)
            rows = c.fetchall()

            for r in rows:
                event_id, title, start_time, endpoint, alert_id = r

                # ✅ Current time (correct timezone)
                now = datetime.now(tz)

                # ✅ Create naive datetime
                event_time = datetime.combine(
                    now.date(),
                    datetime.strptime(start_time, "%H:%M").time()
                )

                # ✅ Properly localize ONCE
                event_time = tz.localize(event_time)

                # ✅ Calculate minutes difference
                print_now = now.strftime("%Y-%m-%d %H:%M:%S")
                print_event_time = event_time.strftime("%Y-%m-%d %H:%M:%S")
                diff = int((event_time - now).total_seconds() / 60)

                log.info(f"event_id: {event_id}, event_time: {print_event_time}, min_countdown: {diff}")

                # ✅ Trigger window (wider to avoid misses)
                if 8 <= diff <= 12:

                    # 🔴 Get ONLY this user's subscription
                    c.execute("""
                        SELECT endpoint, p256dh, auth
                        FROM subscriptions
                        WHERE endpoint = ?
                    """, (endpoint,))

                    sub = c.fetchone()

                    if sub:
                        try:
                            # 🔴 Send ONLY to this user
                            send_push_to_one(
                                sub,
                                f"{title} starts in 10 minutes"
                            )

                            # ✅ Mark as sent (prevents repeats)
                            c.execute("""
                                UPDATE alerts SET sent = 1 WHERE id = ?
                            """, (alert_id,))
                            conn.commit()

                            log.info(f"Alert sent for event {event_id} to {endpoint}")

                        except Exception as e:
                            log.error(f"Send error: {e}")

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
    rows = fetch("""
        SELECT id, category, title, description, location, price, start_time, end_time
        FROM events
        ORDER BY start_time
    """)

    return [
        {
            "id": r[0],
            "category": r[1],
            "title": r[2],
            "description": r[3],
            "location": r[4],
            "price": r[5],
            "start_time": r[6],
            "end_time": r[7]
        }
        for r in rows
    ]

@app.get("/api/events/music")
def events_music():
    rows = fetch("""
        SELECT id, category, title, description, location, price, start_time, end_time
        FROM events
        WHERE category = 'music'
        ORDER BY start_time
    """)

    return [
        {
            "id": r[0],
            "category": r[1],
            "title": r[2],
            "description": r[3],
            "location": r[4],
            "price": r[5],
            "start_time": r[6],
            "end_time": r[7]
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

@app.get("/api/animals")
def animals():
    rows = fetch("SELECT name,description,location FROM animals")
    return [{"name": r[0], "description": r[1], "location": r[2]} for r in rows]

@app.get("/api/organizations")
def organizations():
    rows = fetch("SELECT name,description,location FROM organizations")
    return [{"name": r[0], "description": r[1], "location": r[2]} for r in rows]

@app.get("/api/commercial")
def commercial():
    rows = fetch("SELECT name,description,location FROM commercial")
    return [{"name": r[0], "description": r[1], "location": r[2]} for r in rows]

@app.get("/api/exhibits")
def exhibits():
    rows = fetch("SELECT name,description,location FROM exhibits")
    return [{"name": r[0], "description": r[1], "location": r[2]} for r in rows]


@app.get("/api/business")
def business():
    rows = fetch("SELECT name,description,location FROM business")
    return [{"name": r[0], "description": r[1], "location": r[2]} for r in rows]

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
    data = await request.json()
    endpoint = data.get("endpoint")
    if endpoint:
        endpoint = endpoint.strip()
    log.info(f"ADD endpoint: {endpoint}")

    conn = get_db()
    c = conn.cursor()

    c.execute("""
        SELECT 1 FROM alerts
        WHERE endpoint = ? AND event_id = ?
    """, (endpoint, event_id))

    exists = c.fetchone()

    if not exists:
        c.execute("""
            INSERT INTO alerts (endpoint, event_id, sent)
            VALUES (?, ?, 0)
        """, (endpoint, event_id))

    conn.commit()
    conn.close()

    return {"status": "added"}

@app.post("/api/alerts/remove/{event_id}")
async def remove_alert(event_id: int, request: Request):
    data = await request.json()
    endpoint = data.get("endpoint")
    if endpoint:
        endpoint = endpoint.strip()
    log.info(f"REMOVE endpoint: {endpoint}")

    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT endpoint FROM alerts WHERE event_id = ?", (event_id,))
    rows = c.fetchall()
    log.info(f"DB endpoints for event {event_id}: {rows}")

    # ✅ Remove ONLY this user's alert for this event
    c.execute("""
        DELETE FROM alerts
        WHERE event_id = ? AND endpoint = ?
    """, (event_id, endpoint))

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
        log_config=LOGGING_CONFIG
    )