import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {createHandler} from '../api/index.js';
import {api} from '../src/api.js';

test('API cliente explica una respuesta de hosting que no es JSON',async()=>{
 const originalFetch=globalThis.fetch,originalStorage=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:()=>null};
 globalThis.fetch=async()=>new Response('The page could not be found',{status:404});
 try{await assert.rejects(api('/config'),/HTTP 404.*\/api/)}finally{globalThis.fetch=originalFetch;globalThis.sessionStorage=originalStorage}
});

test('entrada Vercel funciona sin respaldo ni base y devuelve un error JSON',async()=>{
 process.env.VERCEL='1';process.env.DATABASE_URL='';process.env.BACKUP_PATH='./archivo-inexistente.dump';
 const {default:handler}=await import('../api/index.js');
 const server=createServer(handler).listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/config`);
  assert.equal(response.status,503);assert.match(response.headers.get('content-type'),/application\/json/);
  assert.match((await response.json()).error,/DATABASE_URL/);
 }finally{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
});

test('fallos de arranque devuelven JSON sin exponer credenciales y permiten reintentar',async()=>{
 let calls=0;
 const handler=createHandler(async()=>{
  if(++calls===1)throw Object.assign(new Error('Contraseña secreta en una URL inválida'),{code:'ERR_INVALID_URL'});
  return {default:(req,res)=>res.end(JSON.stringify({ok:true}))};
 });
 const server=createServer(handler).listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const url=`http://127.0.0.1:${server.address().port}/api/config`;
  const response=await fetch(url),body=await response.json();
  assert.equal(response.status,500);assert.equal(body.code,'API_STARTUP_FAILED');assert.equal(body.reason,'ERR_INVALID_URL');
  assert.ok(!JSON.stringify(body).includes('Contraseña secreta'));assert.deepEqual(await (await fetch(url)).json(),{ok:true});
 }finally{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
});
