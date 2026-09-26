"""Walked distances over the plan's road graph (8-direction movement: a segment costs max(|dx|,|dz|) tiles).
Lower bound (no walls/doors); real roads add ~5-15%. Output feeds WORLD_CONTENT_PLAN.md section 1."""
import heapq, itertools
N = {
 'well':(0,0),'Ngate':(0,26),'Wgate':(-26,0),'Egate':(26,0),'brook':(30,0),'keep':(45,2),'quay':(0,-18),'bridgeS':(12,-24),
 'eastA':(36,18),'quarry':(74,20),'palmgateT':(98,6),'palmA':(110,-6),'palmgate':(128,-12),'pmine':(132,35),'proving':(130,-68),
 'saltreach':(185,-95),'crafters':(165,-78),'nomad':(184,-36),'heat':(205,-20),
 'mill':(-34,-42),'fenA':(-10,-60),'reedwick':(-18,-98),'fenlord':(-70,-170),'caves':(-40,-140),
 'edge':(-62,2),'logcamp':(-70,20),'spire':(-72,-26),'westB':(-100,-16),'emberford':(-138,-10),'blackbriar':(-140,45),'lodge':(-100,70),
 'watch':(0,62),'inn':(8,100),'Sgate':(0,150),'alder':(0,200),'AW':(-60,205),'AE':(60,195),'ANgate':(0,250),'nA':(-10,262),
 'frontier':(-30,276),'plank':(-46,300),'causeway':(-14,300),'monastery':(-80,282),
 'brynstead':(-105,192),'hl1':(-160,215),'whitmoor':(-200,228),'fr1':(120,215),'fr2':(180,235),'brynholt':(235,250),
 'of1':(-128,60),'of2':(-112,140),'guildhall':(-72,160),'cooks':(-88,205),
}
E = [('well','Ngate'),('Ngate','watch'),('watch','inn'),('inn','Sgate'),('Sgate','alder'),('alder','ANgate'),('ANgate','nA'),('nA','frontier'),
 ('frontier','plank'),('frontier','causeway'),('frontier','monastery'),
 ('well','Wgate'),('Wgate','edge'),('edge','spire'),('spire','westB'),('westB','emberford'),('emberford','blackbriar'),('edge','logcamp'),('logcamp','lodge'),
 ('well','Egate'),('Egate','brook'),('brook','keep'),('brook','eastA'),('eastA','quarry'),('quarry','palmgateT'),('palmgateT','palmA'),('palmA','palmgate'),
 ('palmgate','pmine'),('palmgate','proving'),('proving','crafters'),('crafters','saltreach'),('palmgate','nomad'),('nomad','heat'),
 ('well','quay'),('quay','bridgeS'),('bridgeS','fenA'),('fenA','reedwick'),('bridgeS','mill'),('reedwick','caves'),('caves','fenlord'),
 ('alder','AW'),('AW','cooks'),('cooks','brynstead'),('brynstead','hl1'),('hl1','whitmoor'),('alder','AE'),('AE','fr1'),('fr1','fr2'),('fr2','brynholt'),
 ('emberford','of1'),('of1','of2'),('of2','brynstead'),('Sgate','guildhall'),('AW','guildhall'),
]
G = {k:[] for k in N}
for a,b in E:
    (ax,az),(bx,bz)=N[a],N[b]; w=max(abs(ax-bx),abs(az-bz)); G[a].append((b,w)); G[b].append((a,w))
def dist(s):
    d={s:0}; pq=[(0,s)]
    while pq:
        c,u=heapq.heappop(pq)
        if c>d[u]: continue
        for v,w in G[u]:
            if c+w<d.get(v,1e9): d[v]=c+w; heapq.heappush(pq,(c+w,v))
    return d
pairs=[('well','keep'),('well','quay'),('well','quarry'),('well','mill'),('well','spire'),('well','emberford'),('well','reedwick'),
 ('well','palmgateT'),('well','palmgate'),('well','watch'),('well','inn'),('well','Sgate'),('well','alder'),('well','frontier'),('well','causeway'),
 ('alder','frontier'),('frontier','causeway'),('alder','brynstead'),('alder','whitmoor'),('alder','brynholt'),('brynstead','whitmoor'),
 ('emberford','blackbriar'),('emberford','spire'),('emberford','brynstead'),('quarry','palmgate'),('palmgate','proving'),('palmgate','saltreach'),
 ('proving','saltreach'),('palmgate','heat'),('reedwick','fenlord'),('well','saltreach'),('alder','guildhall'),('frontier','monastery'),('well','lodge'),('emberford','lodge')]
for a,b in pairs:
    t=dist(a)[b]; print(f"{a:10s} -> {b:10s} {t:4d} tiles  walk {t*0.6:5.0f}s  run {t*0.3:4.0f}s")
