import {readFile} from 'node:fs/promises';
export function decodeCopy(value) {
  if(value==='\\N') return null;
  return value.replace(/\\([0-7]{1,3}|x[0-9a-f]{1,2}|.)/gi,(_,v)=>({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','\\':'\\'}[v] ?? (v.startsWith('x')?String.fromCharCode(parseInt(v.slice(1),16)):/^[0-7]+$/.test(v)?String.fromCharCode(parseInt(v,8)):v)));
}
export async function readBackup(path){
 const sql=await readFile(path,'utf8'); const result={};
 for(const match of sql.matchAll(/COPY public\.(\w+) \(([^)]+)\) FROM stdin;\r?\n([\s\S]*?)\r?\n\\\./g)){
  const keys=match[2].split(', ');result[match[1]]=match[3].split(/\r?\n/).filter(Boolean).map(line=>Object.fromEntries(line.split('\t').map((v,i)=>{let value=decodeCopy(v);if(value!==null && (keys[i]==='id'||keys[i].endsWith('_id')||keys[i].startsWith('orden_')))value=Number(value);if(keys[i]==='completed')value=v==='t';return [keys[i],value]})));
 }return result;
}
