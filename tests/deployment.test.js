import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {api} from '../src/api.js';

test('API cliente explica una respuesta de hosting que no es JSON',async()=>{
 const originalFetch=globalThis.fetch,originalStorage=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:()=>null};
 globalThis.fetch=async()=>new Response('The page could not be found',{status:404});
 try{await assert.rejects(api('/config'),/HTTP 404.*\/api/)}finally{globalThis.fetch=originalFetch;globalThis.sessionStorage=originalStorage}
});

test('entrada Vercel funciona sin respaldo ni base y devuelve un error JSON',async()=>{
 process.env.VERCEL='1';process.env.DATABASE_URL='';process.env.BACKUP_PATH='./archivo-inexistente.dump';
 const {default:app}=await import('../api/index.js');
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/config`);
  assert.equal(response.status,503);assert.match(response.headers.get('content-type'),/application\/json/);
  assert.match((await response.json()).error,/DATABASE_URL/);
 }finally{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
});
