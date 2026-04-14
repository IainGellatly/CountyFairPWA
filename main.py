
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
def events():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, title, description, location, start_time FROM events ORDER BY start_time")
    rows = cur.fetchall()
    conn.close()
    return [{"id":r[0],"title":r[1],"description":r[2],"location":r[3],"start_time":r[4]} for r in rows]

@app.get("/api/food")
def food():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT name, description, location FROM food")
    rows = cur.fetchall()
    conn.close()
    return [{"name":r[0],"description":r[1],"location":r[2]} for r in rows]

@app.get("/api/music")
def music():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT name, description, location, datetime FROM music ORDER BY datetime")
    rows = cur.fetchall()
    conn.close()
    return [{"name":r[0],"description":r[1],"location":r[2],"datetime":r[3]} for r in rows]

@app.get("/api/exhibits")
def exhibits():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT name, description, location, category FROM exhibits")
    rows = cur.fetchall()
    conn.close()
    return [{"name":r[0],"description":r[1],"location":r[2],"category":r[3]} for r in rows]
