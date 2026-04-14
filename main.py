from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from database import get_db

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
def root():
    with open("templates/index.html") as f:
        return f.read()

@app.get("/api/events")
def get_events():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, description, location, start_time FROM events ORDER BY start_time")
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r[0],
            "title": r[1],
            "description": r[2],
            "location": r[3],
            "start_time": r[4]
        } for r in rows
    ]
