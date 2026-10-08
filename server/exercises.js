import {parseDocument} from 'htmlparser2';
import {Element,Text} from 'domhandler';
import render from 'dom-serializer';
import {clean} from './html.js';
const types=['choice','boolean','fill','open','match'];
export function structuredExercises(raw){
 try{const parsed=JSON.parse(raw);return Array.isArray(parsed)&&parsed.every(x=>x&&types.includes(x.type))?parsed:null}catch{return null}
}
// Las llaves del HTML original son respuestas. Solo se procesan nodos de texto.
export function legacyExercises(raw){
 const doc=parseDocument(clean(typeof raw==='string'?raw:''));const exercises=[];
 function walk(parent){parent.children=parent.children.flatMap(node=>{
  if(node.type!=='text'){if(node.children)walk(node);return [node]}
  const nodes=[];let offset=0;
  for(const match of node.data.matchAll(/\{([^{}]+)\}/g)){
   if(!match[1].trim())continue;
   if(match.index>offset)nodes.push(new Text(node.data.slice(offset,match.index)));
   const id='legacy-'+exercises.length;
   exercises.push({id,type:'fill',answer:match[1].trim(),question:'Completa el espacio '+(exercises.length+1)});
   nodes.push(new Element('input',{'data-gap-id':id,type:'text',autocomplete:'off','aria-label':'Respuesta '+exercises.length,placeholder:'…'}));
   offset=match.index+match[0].length;
  }
  if(!nodes.length)return [node];
  if(offset<node.data.length)nodes.push(new Text(node.data.slice(offset)));
  nodes.forEach(n=>{n.parent=parent});return nodes;
 })}
 walk(doc);return {html:render(doc),exercises};
}
export function parseExercises(raw){return structuredExercises(raw)??legacyExercises(raw).exercises}
export function exerciseDocument(raw){
 const structured=structuredExercises(raw);
 if(structured!==null)return {kind:'structured',html:'',exercises:structured.map(({answer,...e})=>e)};
 const legacy=legacyExercises(raw);return {kind:'legacy',html:legacy.html,exercises:legacy.exercises.map(({answer,...e})=>e)};
}
const normalize=value=>String(value??'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
export function grade(exercises,answers){
 let correct=0,total=0;const results={};
 for(const e of exercises){const answered=normalize(answers[e.id])!=='';
  if(e.type==='open'){results[e.id]={manual:true,answered};continue}
  total++;const expected=Array.isArray(e.answer)?e.answer:[e.answer];
  const valid=answered&&expected.some(a=>normalize(a)===normalize(answers[e.id]));
  if(valid)correct++;results[e.id]={correct:valid,answered};
 }return {score:total?Math.round(correct/total*100):0,correct,total,results};
}
export function publicExercises(raw){return exerciseDocument(raw).exercises}
