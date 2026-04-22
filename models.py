
import pandas as pd
from database import get_db
conn=get_db();c=conn.cursor()

c.execute("drop table if exists subscriptions;")
c.execute("""
    CREATE TABLE subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT,
        p256dh TEXT,
        auth TEXT
    );
""")

c.execute("drop table if exists alerts;")
c.execute("""
    CREATE TABLE alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        endpoint TEXT, 
        event_id INTEGER,
        sent integer default 0
    );
""")

c.execute("drop table if exists food;")
c.execute("CREATE TABLE food (name TEXT,description TEXT,location TEXT);")
food=[
("BBQ Shack","Pulled pork & ribs","Food Court"),
("Ice Cream Barn","Homemade ice cream","Back of Floral Hall"),
("Corn Dogs","Classic fair food","Midway"),
("Lemonade Stand","Fresh squeezed","Midway"),
("Pizza Wagon","Wood fired pizza","Food Court")
]
for f in food:
    c.execute("INSERT INTO food VALUES (?,?,?)", f)

c.execute("drop table if exists exhibits;")
c.execute("CREATE TABLE exhibits (name TEXT,description TEXT,location TEXT);")
ex=[
    ("Historic Palmyra","Local history exhibits","Floral Hall"),
    ("Wayne County Sheriff","Home safety information","Floral Hall"),
    ("Wayne County Social Services", "Health and family services", "Floral Hall"),
    ("Wayne County 4-H", "4-H chapter", "4-H Building")
]
for x in ex:
    c.execute("INSERT INTO exhibits VALUES (?,?,?)", x)

c.execute("drop table if exists business;")
c.execute("CREATE TABLE business (name TEXT,description TEXT,location TEXT);")
bus=[
    ("Gutter Guardian","Home improvement experts","Commercial Building 1"),
    ("Mobile Mart","Cell phones and accessories","Commercial Building 2"),
    ("Wayne Landscaping Inc.","Experience landscaping and expert care","Commercial Building 2")
]
for b in bus:
    c.execute("INSERT INTO business VALUES (?,?,?)", b)

c.execute("drop table if exists animals;")
c.execute("CREATE TABLE animals (name TEXT,description TEXT,location TEXT);")
anim=[
("Smith Dairy", "Dairy cows","Cattle Building"),
("Jones Acres", "Dairy cows", "Cattle Building"),
("Hoover Farms", "Pigs and goats", "Farm Tent"),
("Cluck Farms", "Prize chickens", "Farm Tent")
]
for a in anim:
    c.execute("INSERT INTO animals VALUES (?,?,?)", a)

c.execute("drop table if exists sponsors;")
c.execute("""
CREATE TABLE sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    tier TEXT,
    description TEXT,
    logo TEXT,
    website TEXT,
    phone TEXT
);
""")
spon = [
    ("Wayne Bank", "Gold", "Local community bank serving Wayne County",
     "/static/logos/bank.png", "https://example.com", "315-555-1234"),
    ("AgriSupply Co.", "Gold", "Farm equipment and supplies",
     "/static/logos/agri.png", "https://example.com", "315-555-5678"),
    ("Palmyra Diner", "Silver", "Family dining and breakfast specials",
     "/static/logos/diner.png", "https://example.com", "315-555-9012"),
    ("County Hardware", "Silver", "Tools and hardware supplies",
     "/static/logos/hardware.png", "https://example.com", "315-555-3456"),
]
for s in spon:
    c.execute("""
        INSERT INTO sponsors (name, tier, description, logo, website, phone)
        VALUES (?, ?, ?, ?, ?, ?)
    """, s)

c.execute("drop table if exists events;")
c.execute("""
    CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        title TEXT,
        description TEXT default '',
        location TEXT,
        price TEXT,
        start_time TEXT, 
        end_time TEXT,
        duration REAL,
        day_of_week TEXT);
""")
df = pd.read_csv('events_csv.csv')

# 'if_exists' can be 'fail', 'replace', or 'append'
df.to_sql('events', conn, if_exists='append', index=False)

#ev = [
#    ("general","Opening Ceremony","Honor guard and announcements","Main Gate","Free","2026-08-10 10:00", "2026-08-10 10:30"),
#    ("general","Kids Show","Magic and fun","Floral Hall","Free","2026-08-10 11:00", "2026-08-10 12:00"),
#    ("contest","Tractor Pull","Heavy equipment","Grandstand","$5.00","2026-08-10 13:00", "2026-08-10 15:00"),
#    ("general","Petting Zoo","Family fun","Sensory Tent","Free","2026-08-10 15:00", "2026-08-10 16:30"),
#    ("music","Live Music","The Haymakers Country Band","Entertainment Ally","Free","2026-08-10 17:00", "2026-08-10 19:00"),
#    ("music","Rock Night","Classic rock","Entertainment Alley", "Free","2026-08-10 19:30", "2026-08-10 21:30"),
#    ("music", "Bluegrass Boys","Live bluegrass","Floral Hall Back Porch", "Free", "2026-08-10 14:00", "2026-08-10 15:30"),
#    ("music", "The Haymakers","Country band","Entertainment Alley","Free", "2026-08-11 17:00", "2026-08-11 19:00"),
#    ("general","Fireworks","Night show","Fairgrounds","Free","2026-08-11 22:00", "2026-08-11 22:30")
#]
#for e in ev:
#    c.execute(
#    "INSERT INTO events (category,title,description,location,price,start_time,end_time) VALUES (?,?,?,?,?,?,?)",e)

c.execute("update events set start_time = datetime(start_time, '-112 days');")
c.execute("update events set end_time = datetime(end_time, '-112 days');")

conn.commit();conn.close()
print("DB ready")
