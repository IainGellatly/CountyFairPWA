import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.responses import FileResponse
from database import get_db
from fastapi import Request
from pywebpush import webpush
import json
import logging
import threading
import time
from datetime import datetime, timedelta, UTC

VAPID_PUBLIC_KEY = "045b6f1124daa16e3c53958e790006955e11027be85fddbcd4013e5ee90401cd722739fc83a8e7ebe282351310a852e1369e0df61524566ff5c35bc7fc7bb5ec21"
VAPID_PRIVATE_KEY = "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgGCd/4kGJdNPyP80SN1NB2aGssbYxp9mrufM9Q4TNFr6hRANCAARbbxEk2qFuPFOVjnkABpVeEQJ76F/dvNQBPl7pBAHNcic5/IOo5+vigjUTEKhS4TaeDfYVJFZv9cNbx/x7tewh"
VAPID_CLAIMS = {"sub": "mailto:iagellatly@gmail.com"}

CLOUD_SERVICE_NAME = 'fair'
CLOUD_LOGGING_LEVEL = logging.INFO
CLOUD_LOG_FILE_NAME = 'fair.log'
SERVER_HOST = '0.0.0.0'
SERVER_PORT = 8000
SERVER_TIMEOUT_KEEP_ALIVE = 300
SERVER_WORKERS = 1


log = logging.getLogger(CLOUD_SERVICE_NAME)
logging.basicConfig(
    filename=CLOUD_LOG_FILE_NAME,
    format='%(asctime)s %(levelname)-8s %(message)s',
    level=CLOUD_LOGGING_LEVEL,
    datefmt='%Y-%m-%d %H:%M:%S')

def alert_scheduler():
    while True:
        try:
            conn = get_db()
            c = conn.cursor()

            # Get events starting in 10 minutes
            now = datetime.now()
            target = now + timedelta(minutes=10)

            c.execute("""
                SELECT e.id, e.title, e.start_time, s.endpoint, s.p256dh, s.auth
                FROM events e
                JOIN alerts a ON e.id = a.event_id
                JOIN subscriptions s ON a.endpoint = s.endpoint
            """)

            rows = c.fetchall()

            for r in rows:
                event_id, title, start_time, endpoint, p256dh, auth = r

                event_time = datetime.strptime(start_time, "%Y-%m-%d %H:%M")

                diff = (event_time - now).total_seconds() / 60

                if 9 <= diff <= 10:
                    subscription_info = {
                        "endpoint": endpoint,
                        "keys": {
                            "p256dh": p256dh,
                            "auth": auth
                        }
                    }

                    webpush(
                        subscription_info,
                        data=json.dumps({
                            "title": "Upcoming Event",
                            "body": f"{title} starts in 10 minutes"
                        }),
                        vapid_private_key=VAPID_PRIVATE_KEY,
                        vapid_claims=VAPID_CLAIMS
                    )

            conn.close()

        except Exception as e:
            log.error(f"Scheduler error: {e}")

        time.sleep(60)  # check every minute

def send_push(title, message):
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT endpoint, p256dh, auth FROM subscriptions")
    rows = c.fetchall()
    conn.close()

    for r in rows:
        subscription_info = {
            "endpoint": r[0],
            "keys": {
                "p256dh": r[1],
                "auth": r[2]
            }
        }

        webpush(
            subscription_info,
            data=json.dumps({"title": title, "body": message}),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
def root():
    return FileResponse("templates/index.html")

def fetch(q):
    conn=get_db();cur=conn.cursor()
    cur.execute(q)
    rows=cur.fetchall()
    conn.close()
    return rows

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
    rows=fetch("SELECT name,description,location FROM food")
    return [{"name":r[0],"description":r[1],"location":r[2]} for r in rows]

@app.get("/api/music")
def music():
    rows=fetch("SELECT name,description,location,datetime FROM music")
    return [{"name":r[0],"description":r[1],"location":r[2],"datetime":r[3]} for r in rows]

@app.get("/api/exhibits")
def exhibits():
    rows=fetch("SELECT name,description,location,category FROM exhibits")
    return [{"name":r[0],"description":r[1],"location":r[2],"category":r[3]} for r in rows]

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

@app.post("/api/subscribe")
async def subscribe(request: Request):
    data = await request.json()

    conn = get_db()
    c = conn.cursor()

    c.execute("""
        INSERT INTO subscriptions (endpoint, p256dh, auth)
        VALUES (?, ?, ?)
    """, (
        data['endpoint'],
        data['keys']['p256dh'],
        data['keys']['auth']
    ))

    conn.commit()
    conn.close()

    return {"status": "subscribed"}

@app.get("/api/test-notify")
def test_notify():
    send_push("Fair Reminder", "Event starting soon!")
    return {"status": "sent"}

@app.get("/api/alerts")
def get_alerts():
    rows = fetch("SELECT event_id FROM alerts")
    return [r[0] for r in rows]


@app.post("/api/alerts/add/{event_id}")
async def add_alert(event_id: int, request: Request):
    data = await request.json()
    endpoint = data.get("endpoint")

    conn = get_db()
    c = conn.cursor()

    c.execute("""
        INSERT INTO alerts (endpoint, event_id)
        VALUES (?, ?)
    """, (endpoint, event_id))

    conn.commit()
    conn.close()

    return {"status": "added"}


@app.post("/api/alerts/remove/{event_id}")
async def remove_alert(event_id: int, request: Request):
    data = await request.json()
    endpoint = data.get("endpoint")

    conn = get_db()
    c = conn.cursor()

    c.execute("""
        DELETE FROM alerts 
        WHERE event_id = ? AND endpoint = ?
    """, (event_id, endpoint))

    conn.commit()
    conn.close()

    return {"status": "removed"}

if __name__ == '__main__':

    log.info('starting main program')

    threading.Thread(target=alert_scheduler, daemon=True).start()

    uvicorn.run(
        'fair:app',
        host=SERVER_HOST,
        port=SERVER_PORT,
        timeout_keep_alive=SERVER_TIMEOUT_KEEP_ALIVE,
        log_level='info',
        workers=SERVER_WORKERS
    )
