from pathlib import Path
from PIL import Image, ImageDraw
import json, math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "icons" / "ui" / "tabs"
PROOF = ROOT / "scratchpad" / "ui_reference_pipeline"
OUT.mkdir(parents=True, exist_ok=True); PROOF.mkdir(parents=True, exist_ok=True)
S=4; W=32*S
INK=(42,31,20,255); GOLD=(218,171,79,255); LIGHT=(247,220,141,255)
RED=(132,48,37,255); BLUE=(57,94,118,255); GREEN=(65,105,59,255); GREY=(120,117,105,255)

def sc(points): return [(int(x*S),int(y*S)) for x,y in points]
def icon(name, painter):
    im=Image.new('RGBA',(W,W),(0,0,0,0)); d=ImageDraw.Draw(im)
    painter(d)
    im.resize((32,32),Image.Resampling.LANCZOS).save(OUT/f'{name}.png')

def line(d, pts, fill=INK, width=2): d.line(sc(pts),fill=fill,width=width*S,joint='curve')
def poly(d, pts, fill, outline=INK, width=1):
    d.polygon(sc(pts),fill=fill)
    if outline: d.line(sc(pts+[pts[0]]),fill=outline,width=width*S,joint='curve')
def ell(d, box, fill, outline=INK, width=1):
    b=tuple(int(v*S) for v in box); d.ellipse(b,fill=fill,outline=outline,width=width*S)
def rect(d, box, fill, outline=INK, width=1):
    b=tuple(int(v*S) for v in box); d.rounded_rectangle(b,radius=2*S,fill=fill,outline=outline,width=width*S)

def sword(d):
    line(d,[(7,25),(24,7)],LIGHT,4); line(d,[(7,25),(24,7)],INK,2)
    poly(d,[(22,5),(27,4),(26,9)],GOLD); line(d,[(8,19),(13,24)],GOLD,3); line(d,[(6,26),(10,22)],RED,3)
def bag(d):
    poly(d,[(8,10),(12,6),(20,6),(24,10),(25,25),(7,25)],(117,72,39,255)); line(d,[(9,12),(23,12)],GOLD,2); ell(d,(13,14,19,20),GOLD)
def shield(d): poly(d,[(16,4),(26,8),(24,21),(16,28),(8,21),(6,8)],GREY); poly(d,[(16,7),(22,10),(21,19),(16,24)],BLUE,None)
def bars(d):
    for i,(h,c) in enumerate([(10,RED),(16,GREEN),(22,BLUE)]): rect(d,(6+i*7,27-h,11+i*7,27),c)
    line(d,[(5,27),(27,27)],GOLD,2)
def star(d):
    pts=[]
    for i in range(10):
        a=-math.pi/2+i*math.pi/5; r=12 if i%2==0 else 5
        pts.append((16+math.cos(a)*r,16+math.sin(a)*r))
    poly(d,pts,GOLD)
def prayer(d):
    ell(d,(12,4,20,12),LIGHT); poly(d,[(11,13),(16,17),(21,13),(23,26),(9,26)],BLUE); line(d,[(9,16),(4,22)],LIGHT,3); line(d,[(23,16),(28,22)],LIGHT,3)
def magic(d):
    line(d,[(7,26),(22,8)],(116,74,39,255),4); ell(d,(18,3,29,14),BLUE); star_small=[(23,5),(25,9),(29,10),(25,12),(23,16),(21,12),(17,10),(21,9)]; poly(d,star_small,LIGHT)
def book(d):
    poly(d,[(4,7),(15,9),(15,26),(4,23)],(126,74,39,255)); poly(d,[(28,7),(17,9),(17,26),(28,23)],(151,91,45,255)); line(d,[(16,9),(16,26)],GOLD,2)
def gear(d):
    ell(d,(7,7,25,25),GREY); ell(d,(12,12,20,20),(34,31,25,255));
    for a in range(0,360,45):
        x=16+math.cos(math.radians(a))*11; y=16+math.sin(math.radians(a))*11; ell(d,(x-2,y-2,x+2,y+2),GREY)
def people(d,n=2):
    xs=[11,21] if n==2 else [8,16,24]
    for x in xs: ell(d,(x-4,6,x+4,14),LIGHT); poly(d,[(x-6,27),(x-5,17),(x,14),(x+5,17),(x+6,27)],BLUE if x%2 else GREEN)
def faceban(d): people(d,1); line(d,[(5,27),(27,5)],RED,4)
def music(d): line(d,[(11,7),(24,4),(24,21)],GOLD,3); line(d,[(11,7),(11,24)],GOLD,3); ell(d,(5,20,13,27),RED); ell(d,(18,17,26,24),BLUE)
def emote(d): ell(d,(5,5,27,27),GOLD); ell(d,(10,11,13,14),INK,None); ell(d,(19,11,22,14),INK,None); line(d,[(10,20),(14,23),(19,23),(23,19)],INK,2)
def logout(d): rect(d,(5,5,20,27),GREY); line(d,[(15,16),(29,16)],GOLD,3); poly(d,[(24,11),(29,16),(24,21)],GOLD)
def chat(d): poly(d,[(4,6),(28,6),(28,22),(17,22),(11,27),(12,22),(4,22)],BLUE); line(d,[(8,11),(24,11)],LIGHT,2); line(d,[(8,16),(20,16)],LIGHT,2)
def mapicon(d): poly(d,[(4,7),(11,4),(21,8),(28,5),(28,25),(21,28),(11,24),(4,27)],GREEN); line(d,[(11,4),(11,24),(21,28),(21,8)],GOLD,1); ell(d,(14,12,19,17),RED)
def compass(d): ell(d,(4,4,28,28),GREY); poly(d,[(16,5),(20,16),(16,27),(12,16)],RED); ell(d,(14,14,18,18),GOLD)
def quick(d):
    for x,y,c in [(10,10,RED),(22,10,BLUE),(10,22,GREEN),(22,22,GOLD)]: ell(d,(x-5,y-5,x+5,y+5),c)
def helm(d): poly(d,[(7,25),(7,13),(11,6),(21,6),(25,13),(25,25),(20,25),(20,16),(12,16),(12,25)],GREY); line(d,[(11,11),(21,11)],GOLD,2)

painters={'combat':sword,'inventory':bag,'equipment':shield,'skills':bars,'quests':star,'prayer':prayer,'magic':magic,'bestiary':book,'settings':gear,
          'clan':lambda d:people(d,3),'friends':lambda d:people(d,2),'ignore':faceban,'emotes':emote,'music':music,'logout':logout,'chat':chat,'map':mapicon,'compass':compass,'quickpanel':quick,'worn':helm}
for name,p in painters.items(): icon(name,p)

refs=['UI_ChatBar+More','UI_ClanChat','UI_Combat','UI_Emotes','UI_FriendsList','UI_IgnoreList','UI_Inventory1','UI_LogoutScreen','UI_MagicBook','UI_MusicList','UI_OpenMiniMap','UI_Player_Worn_Inventory','UI_Prayer','UI_Quests','UI_QuestScrollScreen','UI_QuickPanel','UI_Settings','UI_Stats']
mapping={'UI_ChatBar+More':'chat','UI_ClanChat':'clan','UI_Combat':'combat','UI_Emotes':'emotes','UI_FriendsList':'friends','UI_IgnoreList':'ignore','UI_Inventory1':'inventory','UI_LogoutScreen':'logout','UI_MagicBook':'magic','UI_MusicList':'music','UI_OpenMiniMap':'map','UI_Player_Worn_Inventory':'worn','UI_Prayer':'prayer','UI_Quests':'quests','UI_QuestScrollScreen':'quests','UI_QuickPanel':'quickpanel','UI_Settings':'settings','UI_Stats':'skills'}
atlas=Image.new('RGB',(5*144,4*144),(43,38,31)); ad=ImageDraw.Draw(atlas)
for i,name in enumerate(painters):
    x=(i%5)*144; y=(i//5)*144
    im=Image.open(OUT/f'{name}.png').resize((80,80),Image.Resampling.NEAREST)
    atlas.paste(im,(x+32,y+14),im); ad.text((x+8,y+104),name,fill=(236,210,143))
atlas.save(PROOF/'icon_atlas.png')
(PROOF/'coverage.json').write_text(json.dumps({'schemaVersion':1,'references':[{'reference':r+'.jpg','surface':mapping[r],'status':'authored'} for r in refs]},indent=2))
print(f'wrote {len(painters)} icons and {len(refs)} reference mappings')
