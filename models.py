
from database import get_db
conn=get_db();c=conn.cursor()

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

c.execute("CREATE TABLE IF NOT EXISTS alerts (event_id INTEGER PRIMARY KEY);")

c.execute("DELETE FROM events");c.execute("DELETE FROM food");c.execute("DELETE FROM music");c.execute("DELETE FROM exhibits")

events=[
("Opening Ceremony","Kickoff parade","Main Gate","10:00 AM", "11:00 AM"),
("Kids Show","Magic and fun","Tent A","11:00 AM", "12:00 PM"),
("Tractor Pull","Heavy equipment","Arena","1:00 PM", "3:00 PM"),
("Petting Zoo","Family fun","Barn","3:00 PM", "4:30 PM"),
("Live Music","Country band","Main Stage","5:00 PM", "8:00 PM"),
("Fireworks","Night show","Fairgrounds","9:00 PM", "9:30 PM")
]
for e in events: c.execute("INSERT INTO events (title,description,location,start_time, end_time) VALUES (?,?,?,?,?)",e)

food=[
("BBQ Shack","Pulled pork & ribs","Food Court"),
("Ice Cream Barn","Homemade ice cream","North Lot"),
("Corn Dogs","Classic fair food","Midway"),
("Lemonade Stand","Fresh squeezed","Main Path"),
("Pizza Wagon","Wood fired pizza","South End")
]
for f in food: c.execute("INSERT INTO food VALUES (?,?,?)",f)

music=[
("The Haymakers","Country band","Main Stage","6:00 PM"),
("Bluegrass Boys","Live bluegrass","Barn Stage","2:00 PM"),
("Rock Night","Classic rock","Main Stage","8:00 PM")
]
for m in music: c.execute("INSERT INTO music VALUES (?,?,?,?)",m)

ex=[
("Dairy Cows","Prize cattle","Barn A","Animals"),
("4H Club","Youth exhibits","Hall B","Organization"),
("Quilting","Handmade quilts","Hall C","Home Arts"),
("Photography","Local artists","Hall D","Arts")
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
