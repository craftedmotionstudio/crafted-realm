'use strict';

const LEVELS=new Set(['light','full','swarm']);
const ROLES=new Set(['functional','adversarial','visual','persistence','performance']);

function validate(s){
  const errors=[];
  if(!s||s.schemaVersion!==1)errors.push('schemaVersion must be 1');
  if(!/^[a-z0-9][a-z0-9_-]+$/.test((s&&s.id)||''))errors.push('id must be a stable slug');
  if(!s||!LEVELS.has(s.level))errors.push('level must be light, full, or swarm');
  if(!s||!Array.isArray(s.steps)||!s.steps.length)errors.push('ordered steps are required');
  else s.steps.forEach((step,index)=>{
    if(step.order!==index+1)errors.push(`step ${index+1} order`);
    if(step.realInteraction!==true)errors.push(`step ${index+1} must require real interaction`);
    if(!step.action||!step.expected)errors.push(`step ${index+1} action/expected`);
  });
  if(s&&s.level!=='light'){
    if(!s.negativeCases||!s.negativeCases.length)errors.push('negative cases required');
    if(!s.persistence||!s.persistence.length)errors.push('persistence required');
    if(!s.performance||s.performance.foregroundSmoke!==true)errors.push('foreground smoke required');
  }
  const roles=(s&&s.roles)||[];
  if(new Set(roles).size!==roles.length||roles.some(role=>!ROLES.has(role)))errors.push('invalid or duplicate roles');
  if(s&&s.level==='swarm'&&roles.length!==ROLES.size)errors.push('swarm requires all five roles');
  if(!s||!s.acceptance||s.acceptance.allRequired!==true||s.acceptance.integratorSignoff!==true)errors.push('all-required integrator signoff required');
  return errors;
}

function evidenceRoot(scenario,build,role,run){
  const clean=value=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'_');
  return `scratchpad/qa/${clean(scenario.id)}/${clean(build)}/${clean(role)}/${clean(run)}`;
}

module.exports={validate,evidenceRoot,LEVELS,ROLES};
