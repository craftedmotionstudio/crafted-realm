# before/after sheets for the UI pass
import os
from PIL import Image, ImageDraw, ImageFont
R=r'C:\Users\iQwaZ\OneDrive\Desktop\CraftedRealms-UI\scratchpad\holm_ui_v1'
B,A,O=os.path.join(R,'before'),os.path.join(R,'after'),os.path.join(R,'sheets')
os.makedirs(O,exist_ok=True)
try: F=ImageFont.truetype('arialbd.ttf',22)
except: F=ImageFont.load_default()
def pair(name,out,scale=1.0,label=None):
  ims=[]
  for d,t in ((B,'BEFORE'),(A,'AFTER')):
    p=os.path.join(d,name)
    if not os.path.exists(p): continue
    im=Image.open(p).convert('RGB')
    if scale!=1: im=im.resize((int(im.width*scale),int(im.height*scale)))
    ims.append((t,im))
  if not ims: return
  w=sum(i.width for _,i in ims)+10*(len(ims)-1);h=max(i.height for _,i in ims)+34
  s=Image.new('RGB',(w,h),(20,17,12));d=ImageDraw.Draw(s);x=0
  for t,im in ims:
    s.paste(im,(x,34));d.text((x+8,6),t+'  '+(label or name),fill=(255,210,74),font=F);x+=im.width+10
  s.save(os.path.join(O,out))
pair('01_login.png','01_login.png',0.6,'login')
pair('01b_login_create.png','01b_login_create.png',0.6,'new adventurer')
pair('02_hud.png','02_hud.png',0.6,'in-game HUD')
pair('05b_minimap_route.png','04_minimap_route.png',1.6,'minimap after a world click')
pair('06_minimap_click_route.png','05_minimap_click.png',1.6,'minimap click (before: no walk on the island)')
pair('07_chat_overhead.png','06_chat_overhead.png',0.6,'chat + overhead text')
pair('07b_chatbox.png','07_chatbox.png',1.0,'chat box')
pair('08_char_creator.png','08_char_creator.png',0.6,'character creator')
pair('03_tab_equip.png','09_equipment.png',1.0,'worn equipment')
pair('09_equip_worn.png','09b_equipment_worn.png',1.0,'worn equipment (hatchet wielded)')
pair('10_dialogue.png','10_dialogue.png',0.6,'dialogue')
t=['combat','skills','quests','inv','equip','prayers','spells','drops','clan','friends','ignore','logout','settings','emotes','music']
for d,tag in ((B,'before'),(A,'after')):
  ims=[Image.open(os.path.join(d,'03_tab_%s.png'%x)).convert('RGB') for x in t if os.path.exists(os.path.join(d,'03_tab_%s.png'%x))]
  if not ims: continue
  w=max(i.width for i in ims);h=max(i.height for i in ims)
  s=Image.new('RGB',(w*8,h*2+34),(20,17,12));dr=ImageDraw.Draw(s);dr.text((8,6),tag.upper()+'  side tabs: '+', '.join(t),fill=(255,210,74),font=F)
  for i,im in enumerate(ims): s.paste(im,((i%8)*w,34+(i//8)*h))
  s.save(os.path.join(O,'03_tabs_%s.png'%tag))
print(sorted(os.listdir(O)))
