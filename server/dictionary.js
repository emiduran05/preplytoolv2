import {parseDocument} from 'htmlparser2';

const cache=new Map();
const omitted=new Set(['script','style','sup','ul','ol','dl','table']);
function text(node){
 if(node.type==='text')return node.data;
 if(omitted.has(node.name))return '';
 return (node.children||[]).map(text).join('');
}
export function spanishDefinitions(html){
 const document=parseDocument(html||''),definitions=[];let spanish=false;
 function visit(node){
  if(node.name==='h2')spanish=node.attribs?.id==='Español'||text(node).trim()==='Español';
  if(spanish&&node.name==='dt'&&/^\d+$/.test(text(node).trim())){
   let next=node.next;while(next&&next.type==='text')next=next.next;
   if(next?.name==='dd'){
    const definition=text(next).replace(/\s+/g,' ').trim();
    if(definition&&!definitions.includes(definition))definitions.push(definition);
   }
  }
  for(const child of node.children||[])visit(child);
 }
 visit(document);return definitions;
}
function failure(message,status){return Object.assign(new Error(message),{status})}
export async function lookupDefinition(value,fetcher=fetch){
 if(typeof value!=='string'||!value.trim()||value.trim().length>80||!/^\p{L}[\p{L}\p{M}\s'’\-]*$/u.test(value.trim()))throw failure('Escribe una palabra o expresión en español de hasta 80 caracteres.',400);
 const word=value.trim().normalize('NFC').toLocaleLowerCase('es');
 const cached=cache.get(word);if(fetcher===fetch&&cached&&cached.expires>Date.now())return cached.value;
 const url=new URL('https://es.wiktionary.org/w/api.php');
 url.search=new URLSearchParams({action:'parse',page:word,prop:'text',redirects:'1',format:'json',formatversion:'2'}).toString();
 let data;
 try{
  const response=await fetcher(url,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json','User-Agent':'preplytool-v2/2.0 (+https://github.com/emiduran05/preplytoolv2)'}});
  if(!response.ok)throw new Error('Dictionary unavailable');data=await response.json();
 }catch{throw failure('No se pudo consultar el diccionario. Inténtalo de nuevo en un momento.',502)}
 if(data.error&&data.error.code!=='missingtitle')throw failure('El diccionario no pudo completar la consulta. Inténtalo de nuevo.',502);
 const definitions=spanishDefinitions(data.parse?.text);
 if(!definitions.length)throw failure('No se encontró una definición en español. Revisa la escritura o prueba el verbo en infinitivo o la palabra en singular.',404);
 const result={word,definition:definitions[0],source:{name:'Wikcionario',url:'https://es.wiktionary.org/wiki/'+encodeURIComponent(data.parse.title||word),license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'}};
 if(fetcher===fetch){if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(word,{value:result,expires:Date.now()+86400000})}
 return result;
}
