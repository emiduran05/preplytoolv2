import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {createClassAccess,readClassAccess,classScope,scopedCatalog} from '../server/access.js';
const secret='test-private-class-secret-at-least-32-characters';
test('enlace firmado conserva alumno y clase y rechaza tokens inválidos o caducados',()=>{
 const token=createClassAccess(2,901,secret);
 assert.deepEqual(readClassAccess(token,secret),{role:'student',id:2,lessonId:901});
 assert.equal(readClassAccess(token,secret+'x'),null);
 assert.equal(readClassAccess(jwt.sign({purpose:'private-class',role:'student',id:2,lessonId:901},secret,{expiresIn:-1}),secret),null);
 assert.equal(readClassAccess(jwt.sign({role:'teacher'},secret),secret),null);
});
test('catálogo limita lecciones, etapas y niveles al enlace de la clase',()=>{
 const data={lecciones:[{id:901,etapa_id:1},{id:902,etapa_id:2}],etapas:[{id:1,nivel_id:1},{id:2,nivel_id:2}],niveles:[{id:1},{id:2}]};
 assert.deepEqual(scopedCatalog(data,{role:'student',lessonId:901}),{lecciones:[data.lecciones[0]],etapas:[data.etapas[0]],niveles:[data.niveles[0]]});
 assert.equal(scopedCatalog(data,{role:'student'}),data);
});
test('rutas de ejercicios y respuestas rechazan otras clases',()=>{
 for(const path of ['/lessons/902/check','/students/2/submissions/902','/students/2/progress/902']){
  let status;classScope({path,user:{role:'student',lessonId:901}},{status(code){status=code;return this},json(){}},()=>assert.fail('Acceso inesperado'));assert.equal(status,403);
 }
 let allowed=false;classScope({path:'/students/2/submissions/901',user:{role:'student',lessonId:901}},{},()=>allowed=true);assert.equal(allowed,true);
});
