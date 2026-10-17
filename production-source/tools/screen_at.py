import sys, json, pyte
import record
class FakeChild:
    def send(self, d): pass
    def isalive(self): return True
cast, t_end = sys.argv[1], float(sys.argv[2])
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 120
rows = int(sys.argv[4]) if len(sys.argv) > 4 else 30
screen = record.RecorderScreen(cols, rows)
stream = pyte.ByteStream(screen)
with open(cast, encoding="utf-8") as fh:
    fh.readline()
    for line in fh:
        ev = json.loads(line)
        if ev[0] > t_end: break
        if ev[1] == "o":
            stream.feed(ev[2].encode("utf-8"))
try:
    lines = screen.display
except Exception:
    lines = ["".join((screen.buffer[y][x].data or " ") for x in range(cols)) for y in range(rows)]
print("\n".join(l.rstrip() for l in lines if l.strip()))
