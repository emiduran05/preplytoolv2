import 'dotenv/config';
import {parseExercises} from '../server/exercises.js';
const base='http://127.0.0.1:'+(process.env.PORT||3001)+'/api';
try{
 const config=await (await fetch(base+'/config')).json();
 const response=await fetch(base+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.TEACHER_EMAIL,password:process.env.TEACHER_PASSWORD})});
 const session=await response.json();
 if(!response.ok){console.log(JSON.stringify({preview:config.preview,authReady:config.authReady,login:false,status:response.status}));process.exitCode=1;}
 else{
  const response=await fetch(base+'/catalog',{headers:{Authorization:'Bearer '+session.token}});const catalog=await response.json();
  const original=catalog.lecciones?.find(l=>l.exercise_document?.kind==='legacy'&&l.exercise_document.exercises.length);
  let originalCheckStatus=null,originalCheckScore=null;
  if(original){const check=await fetch(base+`/lessons/${original.id}/check`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.token},body:JSON.stringify({answers:Object.fromEntries(parseExercises(original.ejercicios_leccion).map(e=>[e.id,e.answer]))})});originalCheckStatus=check.status;originalCheckScore=(await check.json()).score;}
  console.log(JSON.stringify({preview:config.preview,authReady:config.authReady,login:true,role:session.user.role,catalogStatus:response.status,lessons:catalog.lecciones?.length,embeddedImages:catalog.lecciones?.reduce((n,l)=>n+((l.contenido_leccion||'').match(/src="data:image\//g)?.length||0),0),originalCheckStatus,originalCheckScore}));
 }
}catch{console.log('No se pudo conectar con la API local.');process.exitCode=1;}
