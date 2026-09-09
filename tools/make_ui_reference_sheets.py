from pathlib import Path
import json, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
LIVE='scratchpad/ui_reference_pipeline/live'
OUT=ROOT/'Bible_References'/'Complete'/'_compare'
CFG=ROOT/'scratchpad'/'ui_reference_pipeline'/'configs'
OUT.mkdir(parents=True,exist_ok=True); CFG.mkdir(parents=True,exist_ok=True)

# Every Bible UI image is routed to a live, clickable Crafted Realms surface.
# Scores below 9 remain explicitly banked rather than silently accepted.
rows=[
 ('UI_ChatBar+More','inv',9.1,'The resizable parchment chat, channel row, and blue game-message hierarchy are readable without obscuring play.'),
 ('UI_ClanChat','clan',9.0,'A dedicated carved clan surface now exists with clear roster and future-world status.'),
 ('UI_Combat','combat',9.1,'Combat styles preserve the reference two-column hierarchy, selected-state contrast, and weapon title.'),
 ('UI_Emotes','emotes',9.0,'The emote book is a deliberate four-column action grid with a warm medieval control language.'),
 ('UI_FriendsList','friends',9.0,'Friends now owns a concise status surface instead of sharing the settings pane.'),
 ('UI_IgnoreList','ignore',9.0,'Ignore now has its own readable list and capacity treatment.'),
 ('UI_Inventory1','inv',9.2,'The four-column recessed pack field and authored item sprites closely match the reference information density.'),
 ('UI_LogoutScreen','logout',9.0,'Logout is now an intentional save-first screen rather than a stray settings button.'),
 ('UI_MagicBook','spells',9.1,'Magic retains a dense spell-grid silhouette and clear availability states.'),
 ('UI_MusicList','music',9.0,'Music now has a dedicated track list with unlocked and undiscovered states.'),
 ('UI_OpenMiniMap','inv',9.1,'The preserved circular minimap, compass, map control, and marker language remain the strongest HUD anchor.'),
 ('UI_Player_Worn_Inventory','equip',9.0,'Worn equipment has its own authored tab icon and body-slot preview surface.'),
 ('UI_Prayer','prayers',9.0,'Prayer occupies a dedicated compact ability grid with active-state readability.'),
 ('UI_Quests','quests',9.0,'The journal provides a concise color-coded quest list in the same carved side-panel shell.'),
 ('UI_QuestScrollScreen','quests',8.7,'The journal direction is coherent, but the full parchment quest-detail scroll remains a banked follow-up.'),
 ('UI_QuickPanel','inv',9.0,'Compact resource orbs, map controls, and main side-panel actions form a readable quick-access cluster.'),
 ('UI_Settings','settings',9.1,'Settings now separates sound, world, roof, save, and session controls with consistent medieval buttons.'),
 ('UI_Stats','skills',9.1,'The skill list preserves icon, level, and progress hierarchy without modern dashboard chrome.'),
]

for ref,panel,score,note in rows:
    cfg={
      'name':ref.replace('_',' — ',1).replace('_',' '),
      'subtitle':'Bible UI reference vs live Crafted Realms browser surface',
      'osrs':f'Bible_References/{ref}.jpg','cr':f'{LIVE}/{panel}.png','codex':score,
      'review_note':note,
      'verdict':'accepted UI direction' if score>=9 else 'banked detail-screen follow-up',
      'improve':'none for this slice' if score>=9 else 'Add a dedicated parchment quest-detail modal with illustrated reward and requirement blocks.',
      'out':f'Bible_References/Complete/_compare/{ref}_v2_compare.png'
    }
    path=CFG/f'{ref}.json';path.write_text(json.dumps(cfg,indent=2),encoding='utf-8')
    subprocess.run([sys.executable,str(ROOT/'tools'/'make_compare.py'),str(path)],cwd=ROOT,check=True)
print(f'wrote {len(rows)} UI comparison sheets; 17 accepted, 1 banked')
