from database import get_db

conn = get_db()
c = conn.cursor()

c.execute("""
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    title TEXT,
    description TEXT,
    location TEXT,
    start_time TEXT
)
""")

conn.commit()
conn.close()
print("Database initialized")
