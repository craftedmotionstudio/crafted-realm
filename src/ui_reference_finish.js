/* Crafted Realm reference-led HUD finish.
 * Keeps the existing minimap and every gameplay handler. This final CSS layer
 * brings inventory density, panel proportions, stat orbs and chat spacing into
 * the same warm carved-stone family as the reference-led UI slices.
 */
(function(){
'use strict';
if(window.__uiReferenceFinishBooted)return;
window.__uiReferenceFinishBooted=true;
var style=document.createElement('style');style.id='ui-reference-finish';style.textContent=`
#side-panel .tab-ico{display:block;width:23px;height:23px;margin:auto;object-fit:contain;
  filter:drop-shadow(1px 2px 1px rgba(0,0,0,.75));image-rendering:auto;}
#music-btn img,#compass-btn img,#worldmap-btn img{width:21px;height:21px;display:block;margin:auto;object-fit:contain;}
.mob-toggle img{width:27px;height:27px;display:block;margin:auto;object-fit:contain;}
#side-panel #tab-bar .tab-btn{min-width:0;padding:5px 0;}
#side-panel #tab-bar-bottom .tab-btn{min-width:0;padding:5px 0;}
.social-pane{padding:13px 12px;color:#ead99f;font:12px Georgia,serif;}
.social-pane h3{margin:0 0 12px;text-align:center;color:#f0c765;font-size:16px;
  text-shadow:1px 2px #21160e;font-weight:normal;}
.ui-copy{color:#c8b98f;line-height:1.45;margin:8px 2px 14px;text-align:center;}
.ui-empty{margin:20px 4px;padding:22px 8px;text-align:center;color:#9f947b;border:1px solid #29231b;
  background:rgba(17,14,10,.28);box-shadow:inset 0 0 12px rgba(0,0,0,.32);}
.ui-list>div,.music-track{padding:8px;margin:4px 0;border:1px solid #242019;background:#41392e;color:#d8cba5;}
.ui-list span{float:right;color:#f0c765}.music-track.active{color:#70d572;border-color:#746443}.music-track.locked{color:#6f685c}
.emote-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 4px;}
.emote-grid button{height:48px;color:#ead487;font:bold 22px Georgia,serif;border:1px solid #201a13;
  background:radial-gradient(circle at 42% 35%,#716351,#393128 70%);box-shadow:inset 0 0 0 1px #74654e;}
.emote-grid button:hover{outline:1px solid #f1d36c;color:#fff4ad;}
#quest-scroll-modal{display:none;position:fixed;z-index:130;left:50%;top:50%;transform:translate(-50%,-50%);
  width:min(720px,88vw);max-height:82vh;overflow:auto;box-sizing:border-box;padding:46px 56px 34px;color:#2e281d;
  border:14px solid transparent;border-image:linear-gradient(90deg,#765932,#b3925a,#684b2b) 18;
  background:
    radial-gradient(ellipse at 30% 20%,rgba(255,255,255,.24),transparent 44%),
    repeating-linear-gradient(0deg,rgba(73,51,25,.025) 0 1px,transparent 1px 5px),
    linear-gradient(97deg,#cdbd8d,#e0d2a5 48%,#c7b27d);
  box-shadow:0 14px 38px rgba(0,0,0,.72),inset 0 0 34px rgba(93,61,26,.34);font-family:Georgia,serif;}
#quest-scroll-modal:before,#quest-scroll-modal:after{content:"";position:absolute;left:18px;right:18px;height:8px;
  background:linear-gradient(90deg,transparent,#7c5e35 8%,#b48f50 50%,#73532d 92%,transparent);opacity:.72;}
#quest-scroll-modal:before{top:14px}#quest-scroll-modal:after{bottom:14px}
.quest-scroll-close{position:absolute;right:20px;top:18px;width:38px;height:38px;border:2px solid #543b22;
  color:#5b241b;background:#d2b77b;font:bold 28px/28px Georgia,serif;cursor:pointer;box-shadow:inset 0 0 0 2px #ead79f;}
.quest-scroll-head{text-align:center;border-bottom:1px solid rgba(71,48,24,.42);padding-bottom:14px;margin-bottom:17px;}
.quest-scroll-head h2{margin:5px 44px;color:#7a241d;font:normal 30px Georgia,serif;text-shadow:0 1px #f5e8ba;}
#quest-scroll-difficulty{color:#725532;font-variant:small-caps;letter-spacing:1px}#quest-scroll-giver{font-style:italic;color:#5f513b}
#quest-scroll-modal .quest-scroll-desc{font-size:16px;line-height:1.5;margin:0 0 18px;text-align:center;color:#3e3023;}
.quest-scroll-section{margin:14px 0;padding:12px 14px;background:rgba(255,248,213,.22);border:1px solid rgba(78,54,27,.26);}
.quest-scroll-section h3{margin:0 0 8px;color:#6e241c;font:normal 19px Georgia,serif}.quest-stage{display:flex;gap:9px;margin:7px 0;line-height:1.35;}
.quest-stage-mark{width:18px;flex:0 0 18px;color:#76592f}.quest-stage.current{font-weight:bold;color:#173d6b}.quest-stage.done{text-decoration:line-through;color:#786d56}
.quest-rewards{display:flex;flex-wrap:wrap;gap:8px}.quest-reward{display:flex;align-items:center;gap:6px;padding:5px 9px;background:rgba(77,52,25,.11);}
.quest-reward img{width:28px;height:28px;object-fit:contain}.quest-scroll-foot{display:flex;align-items:center;justify-content:space-between;margin-top:18px;}
.quest-scroll-button{padding:8px 18px;border:2px solid #553b20;background:linear-gradient(#846331,#54391f);color:#f3dda0;font:bold 13px Georgia,serif;cursor:pointer;}
.quest-scroll-button.tracked{background:linear-gradient(#47633a,#2a4324)}#quest-scroll-points{color:#694623;font-weight:bold;}
@media(min-width:881px){
  #side-panel{width:246px;}
  #minimap-frame{right:272px;}
  #side-panel.steel{padding:12px 14px 13px;
    background:linear-gradient(145deg,#443d33 0%,#262119 42%,#17140f 100%);}
  #side-panel .tab-pane{min-height:305px;
    background:
      radial-gradient(ellipse at 30% 18%,rgba(255,255,255,.055),transparent 48%),
      linear-gradient(145deg,#5d584e,#444038 48%,#37332c);
    border-color:#17140f;box-shadow:inset 0 0 0 1px rgba(206,193,162,.12),inset 0 0 18px rgba(0,0,0,.42);}
  #side-panel .tab-btn{height:37px;padding:5px 0;}
  #side-panel .tab-ico{width:24px;height:24px;}

  /* Reference inventory: icons sit on one recessed stone field, not in 28
     identical modern boxes. Empty locations stay quiet; hover remains clear. */
  #pane-inv{padding:12px 10px 14px;}
  #inv-grid{grid-template-columns:repeat(4,1fr);gap:5px 7px;min-height:282px;align-content:start;}
  #inv-grid .inv-slot{height:53px;border:0;border-radius:3px;background:transparent;
    box-shadow:none;filter:drop-shadow(2px 3px 2px rgba(0,0,0,.34));}
  #inv-grid .inv-slot:hover{outline:1px solid rgba(255,224,105,.78);
    background:radial-gradient(ellipse,rgba(255,220,120,.13),transparent 70%);}
  #inv-grid .inv-slot img{width:38px;height:38px;image-rendering:pixelated;object-fit:contain;}
  #inv-grid .inv-qty{top:2px;left:1px;color:#ffff42;font-size:11px;}

  /* Tuck compact information orbs against the minimap instead of creating a
     second oversized vertical UI column. The minimap itself is untouched. */
  #orbs{right:258px;top:150px;gap:4px;}
  #orbs .orb{width:43px;height:43px;border-width:3px;font-size:8px;}
  #orbs .orb .num{font-size:14px;line-height:13px;}
  #run-orb{right:402px;top:9px;width:42px;height:34px;border-radius:50%;font-size:10px;}

  #chatbox-frame{width:548px;bottom:11px;padding-bottom:7px;}
  #chatbox{font-family:Verdana,Arial,sans-serif;font-size:12px;line-height:1.38;
    color:#13206a;background:
      repeating-linear-gradient(0deg,rgba(93,77,45,.025) 0 1px,transparent 1px 4px),
      linear-gradient(#d8c99f,#c5b487);}
  #chat-title{font-size:11px;text-transform:none;}
  #chat-tabs{margin-top:2px;gap:2px;}
  #chat-tabs .chtab{padding:4px 1px 3px;font-size:10px;}
}
`;
document.head.appendChild(style);
})();
