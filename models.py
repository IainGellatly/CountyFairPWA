
from database import get_db
conn = get_db()
c = conn.cursor()

c.execute("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, title TEXT, description TEXT, location TEXT, start_time TEXT)")
c.execute("CREATE TABLE IF NOT EXISTS food (name TEXT, description TEXT, location TEXT)")
c.execute("CREATE TABLE IF NOT EXISTS music (name TEXT, description TEXT, location TEXT, datetime TEXT)")
c.execute("CREATE TABLE IF NOT EXISTS exhibits (name TEXT, description TEXT, location TEXT, category TEXT)")

c.execute("DELETE FROM events")
c.execute("DELETE FROM food")
c.execute("DELETE FROM music")
c.execute("DELETE FROM exhibits")

events = [
("Opening Ceremony","Kickoff parade","Main Gate","10:00 AM"),
("Tractor Pull","Heavy equipment show","Arena","1:00 PM"),
("Fireworks","Night show","Fairgrounds","9:00 PM")
]

for e in events:
    c.execute("INSERT INTO events (title,description,location,start_time) VALUES (?,?,?,?)", e)

food = [
("BBQ Shack","Pulled pork and ribs","Food Court"),
("Ice Cream Barn","Homemade ice cream","North Lot"),
("Corn Dogs","Classic fair food","Midway")
]

for f in food:
    c.execute("INSERT INTO food VALUES (?,?,?)", f)

music = [
("The Haymakers","Country band","Main Stage","6:00 PM"),
("Bluegrass Boys","Live bluegrass","Barn Stage","2:00 PM")
]

for m in music:
    c.execute("INSERT INTO music VALUES (?,?,?,?)", m)

exhibits = [
("Dairy Cows","Prize cattle","Barn A","Animals"),
("4H Club","Youth projects","Hall B","Organization"),
("Quilting","Handmade quilts","Hall C","Home Arts")
]

for ex in exhibits:
    c.execute("INSERT INTO exhibits VALUES (?,?,?,?)", ex)

conn.commit()
conn.close()
print("Database ready")
