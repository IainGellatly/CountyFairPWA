
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.responses import FileResponse
from database import get_db

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
    rows=fetch("SELECT id,title,description,location,start_time FROM events ORDER BY start_time")
    return [{"id":r[0],"title":r[1],"description":r[2],"location":r[3],"start_time":r[4]} for r in rows]

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
