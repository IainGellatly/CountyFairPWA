
from database import get_db
conn=get_db();c=conn.cursor()

c.execute(
    "CREATE TABLE IF NOT EXISTS commercial (name TEXT,description TEXT,location TEXT)")
comm=[
    ("Gutter Guardian","Home improvement experts","Commercial Building 1"),
    ("Mobile Mart","Cell phones and accessories","Commercial Building 2"),
    ("Wayne Landscaping Inc.","Landscaping and expert care","Commercial Building 2")
]
for x in comm: c.execute(
    "INSERT INTO commercial VALUES (?,?,?)",x)

c.execute(
    "CREATE TABLE IF NOT EXISTS organization (name TEXT,description TEXT,location TEXT)")
org=[
    ("Historic Palmyra","Local history exhibits","Floral Hall"),
    ("Wayne County Sheriff","Home safety information","Floral Hall"),
    ("American Legion Post 120","Veteran services organization","Floral Hall")
]
for x in org: c.execute(
    "INSERT INTO organization VALUES (?,?,?)",x)

c.execute("""
    CREATE TABLE IF NOT EXISTS calendar (
        id INTEGER PRIMARY KEY,
        category TEXT,
        title TEXT,
        description TEXT,
        location TEXT,
        price TEXT,
        start_time TEXT, 
        end_time TEXT)
""")
cal = [
    ("general","Opening Ceremony","Honor guard and announcements","Main Gate","Free","2026-08-10 10:00", "2026-08-10 10:30"),
    ("general","Kids Show","Magic and fun","Floral Hall","Free","2026-08-10 11:00", "2026-08-10 12:00"),
    ("contest","Tractor Pull","Heavy equipment","Grandstand","$5.00","2026-08-10 13:00", "2026-08-10 15:00"),
    ("general","Petting Zoo","Family fun","Sensory Tent","Free","2026-08-10 15:00", "2026-08-10 16:30"),
    ("music","Live Music","The Haymakers Country Band","Entertainment Ally","Free","2026-08-10 17:00", "2026-08-10 19:00"),
    ("music","Rock Night","Classic rock","Entertainment Alley", "Free","2026-08-10 19:30", "2026-08-10 21:30"),
    ("general","Fireworks","Night show","Fairgrounds","Free","2026-08-11 22:00", "2026-08-11 22:30")
]
for e in cal: c.execute(
    "INSERT INTO calendar (category,title,description,location,price,start_time,end_time) VALUES (?,?,?,?,?,?,?)",e)





c.execute("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY,title TEXT,description TEXT,location TEXT,start_time TEXT, end_time text)")
c.execute("CREATE TABLE IF NOT EXISTS food (name TEXT,description TEXT,location TEXT)")
c.execute("CREATE TABLE IF NOT EXISTS music (name TEXT,description TEXT,location TEXT,datetime TEXT)")
c.execute("CREATE TABLE IF NOT EXISTS exhibits (name TEXT,description TEXT,location TEXT,category TEXT)")
# Sponsors table
c.execute("""
CREATE TABLE IF NOT EXISTS sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    tier TEXT,
    description TEXT,
    logo TEXT,
    website TEXT,
    phone TEXT
)
""")

c.execute("""
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT,
    p256dh TEXT,
    auth TEXT
)
""")

c.execute("CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT, event_id INTEGER,up sent integer default 0);")

c.execute("DELETE FROM events");c.execute("DELETE FROM food");c.execute("DELETE FROM music");c.execute("DELETE FROM exhibits")

events=[
("Opening Ceremony","Honor guard and announcements","Main Gate","10:00", "10:30"),
("Kids Show","Magic and fun","Floral Hall","11:00", "12:00"),
("Tractor Pull","Heavy equipment","Grandstand","13:00", "15:00"),
("Petting Zoo","Family fun","Sensory Tent","15:00", "16:30"),
("Live Music","The Haymakers Country Band","Entertainment Ally","17:00", "19:00"),
("Rock Night","Classic rock","Entertainment Alley", "19:30", "21:30"),
("Fireworks","Night show","Fairgrounds","22:00", "22:30")
]
for e in events: c.execute("INSERT INTO events (title,description,location,start_time, end_time) VALUES (?,?,?,?,?)",e)

food=[
("BBQ Shack","Pulled pork & ribs","Food Court"),
("Ice Cream Barn","Homemade ice cream","Back of Floral Hall"),
("Corn Dogs","Classic fair food","Midway"),
("Lemonade Stand","Fresh squeezed","Midway"),
("Pizza Wagon","Wood fired pizza","Food Court")
]
for f in food: c.execute("INSERT INTO food VALUES (?,?,?)",f)

music=[
("Bluegrass Boys","Live bluegrass","Floral Hall Back Porch","2:00-3:30 PM"),
("The Haymakers","Country band","Entertainment Alley","5:00-7:00 PM"),
("Rock Night","Classic rock","Entertainment Alley","7:30-9:30 PM")
]
for m in music: c.execute("INSERT INTO music VALUES (?,?,?,?)",m)

ex=[
("Dairy Cows","Prize cattle","Cattle Building","Animals"),
("4H Club","Youth exhibits","4-H Building","Organization"),
("Quilting","Handmade quilts","Floral Hall","Home Arts"),
("Photography","Local artists","Floral Hall","Arts")
]
for x in ex: c.execute("INSERT INTO exhibits VALUES (?,?,?,?)",x)

c.execute("DELETE FROM sponsors")

sponsors = [
    ("Wayne Bank", "Gold", "Local community bank serving Wayne County",
     "/static/logos/bank.png", "https://example.com", "315-555-1234"),

    ("AgriSupply Co.", "Gold", "Farm equipment and supplies",
     "/static/logos/agri.png", "https://example.com", "315-555-5678"),

    ("Palmyra Diner", "Silver", "Family dining and breakfast specials",
     "/static/logos/diner.png", "https://example.com", "315-555-9012"),

    ("County Hardware", "Silver", "Tools and hardware supplies",
     "/static/logos/hardware.png", "https://example.com", "315-555-3456"),
]

for s in sponsors:
    c.execute("""
        INSERT INTO sponsors (name, tier, description, logo, website, phone)
        VALUES (?, ?, ?, ?, ?, ?)
    """, s)

conn.commit();conn.close()
print("DB ready")
