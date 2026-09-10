#!/usr/bin/env node
'use strict';
const path=require('path');
const W=require('./studio_workspace.js');

function usage(){
  console.log('Crafted Realm Studio Safe Publish');
  console.log('  init <id> <target...>');
  console.log('  stage <id> <target> <candidate.json>');
  console.log('  status <id>');
  console.log('  export <id>');
  console.log('  plan <id> [exportId]');
  console.log('  apply <id> [exportId]');
  console.log('  recover <id>');
  console.log('  rollback <id>');
}
function print(value){console.log(JSON.stringify(value,null,2));}
const [command,id,...args]=process.argv.slice(2),root=path.resolve(__dirname,'..');
try{
  if(!command||command==='help'||command==='--help'){usage();process.exit(0);}
  if(!id)throw new Error('workspace id is required');
  if(command==='init'){if(!args.length)throw new Error('at least one target path is required');print(W.init(root,id,args));}
  else if(command==='stage'){if(args.length!==2)throw new Error('stage needs a registered target and candidate file');print(W.stage(root,id,args[0],args[1]));}
  else if(command==='status')print(W.status(root,id));
  else if(command==='export')print(W.exportWorkspace(root,id));
  else if(command==='plan')print(W.plan(root,id,args[0]));
  else if(command==='apply')print(W.apply(root,id,args[0]));
  else if(command==='recover')print(W.recover(root,id));
  else if(command==='rollback')print(W.rollback(root,id));
  else throw new Error('unknown command: '+command);
}catch(error){console.error('[STUDIO SAFE PUBLISH] '+error.message);process.exit(1);}
