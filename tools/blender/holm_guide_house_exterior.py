"""Fitted coastal porch and individually shaped overlapping roof tiles."""
import random,math
def build(B):
 mesh,prism,beam=B['mesh'],B['prism'],B['beam'];wood,stone=B['wood'],B['stone'];clay=B['roofmat']
 tilelight=B['material']('Clay tile warm face',(.43,.26,.19));tiledark=B['material']('Clay tile cool face',(.34,.20,.16))
 # Slab engages the graded approach; supports extend beneath its surface.
 prism('GroundShellPorchSlab',-2.05,2.05,-.42,.015,5.15,7.40,B['sillmat'])
 for x in [-1.8,1.8]:
  prism('GroundShellPorchFooting',x-.22,x+.22,-.48,.18,7.02,7.46,stone)
  verts=[(x+a,y,7.24+b) for y,w in [(.18,.27),(2.43,.20)] for a,b in [(-w/2,-w/2),(w/2,-w/2),(w/2,w/2),(-w/2,w/2)]]
  mesh('GroundShellPorchPost',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],wood)
  beam('GroundShellPorchBrace',(x,1.90,7.24),(x*.64,2.43,7.24),.16,.16,wood)
 beam('GroundShellPorchLintel',(-2.0,2.44,7.24),(2.0,2.44,7.24),.20,.24,wood)
 for sign in [-1,1]:
  verts=[(0,3.34,4.94),(sign*2.35,2.54,4.94),(sign*2.35,2.54,7.78),(0,3.34,7.78)]
  mesh('RoofPorch',verts,[(0,1,2,3)],clay)
  beam('RoofPorchBarge',(0,3.34,7.8),(sign*2.35,2.54,7.8),.18,.18,wood)
  beam('RoofPorchEave',(sign*2.35,2.50,4.94),(sign*2.35,2.50,7.8),.16,.18,wood)
 def height(x):return 8.1-x*1.9/4.6 if x<=4.6 else 6.2-(x-4.6)*.65/1.9
 rng=random.Random(260912);vertices=[];faces=[];ids=[]
 # Ten courses per pitch; short staggered rows have restrained width variation.
 for sign in [-1,1]:
  for row in range(10):
   a=row*.65;b=min(6.5,a+.70);z=-5.49
   while z<5.49-.02:
    end=min(5.49,z+rng.uniform(.57,.71));k=len(vertices)
    # Eight edited vertices give a raised lip and thickness to each laid tile.
    for lift in [.025,.070]:
     vertices.extend([(sign*a,height(a)+lift,z+.012),(sign*b,height(b)+lift+.018,z+.025),(sign*b,height(b)+lift+.018,end-.025),(sign*a,height(a)+lift,end-.012)])
    faces.extend([(k,k+3,k+2,k+1),(k+4,k+5,k+6,k+7),(k,k+1,k+5,k+4),(k+1,k+2,k+6,k+5),(k+2,k+3,k+7,k+6),(k+3,k,k+4,k+7)])
    shade=rng.choice([0,0,0,1,2]);ids.extend([shade]*6);z=end
 o=mesh('RoofClayTiles',vertices,faces,clay);o.data.materials.append(tilelight);o.data.materials.append(tiledark)
 for p,i in zip(o.data.polygons,ids):p.material_index=i
