import pandas as pd
import sqlite3

df = pd.read_csv('../events_csv.csv')
conn = sqlite3.connect('test.db')

conn.execute("drop table if exists events;")
conn.execute("""
    CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        title TEXT,
        description TEXT,
        location TEXT,
        price TEXT,
        start_time TEXT, 
        end_time TEXT,
        duration REAL,
        day_of_week TEXT);
""")

# 'if_exists' can be 'fail', 'replace', or 'append'
df.to_sql('events', conn, if_exists='append', index=False)

conn.close()
