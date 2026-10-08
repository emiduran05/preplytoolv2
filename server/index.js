import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import {clean} from './html.js';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {connected,snapshot,query} from './db.js';
import {parseExercises,exerciseDocument,grade} from './exercises.js';
import {presentLesson} from './lesson.js';
import {catalogRoutes} from './catalog-routes.js';
import {lookupDefinition} from './dictionary.js';
const app=express();app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'12mb'}));
app.use('/api',(req,res,next)=>{
 if(!connected&&!snapshot)return res.status(503).json({error:'Configura DATABASE_URL con una base PostgreSQL accesible desde el servidor. En Vercel no se utiliza el respaldo local.'});
 next();
});
const hash=v=>createHash('sha256').update(v).digest('hex');
const storedExercises=raw=>{try{const value=JSON.parse(raw);if(Array.isArray(value)&&value.every(e=>['choice','boolean','fill','open','match'].includes(e.type)))return JSON.stringify(value)}catch{}return typeof raw==='string'?raw:'[]'};
const ready=()=>process.env.JWT_SECRET?.length>=32&&!process.env.JWT_SECRET.startsWith('REEMPLAZAR')&&process.env.TEACHER_PASSWORD&&!process.env.TEACHER_PASSWORD.startsWith('REEMPLAZAR');
function auth(req,res,next){if(!connected){req.user={role:'preview'};return next()}try{req.user=jwt.verify(req.headers.authorization?.replace(/^Bearer /,''),process.env.JWT_SECRET);next()}catch{res.status(401).json({error:'Inicia sesión para continuar.'})}}
function teacher(req,res,next){if(req.user.role!=='teacher')return res.status(403).json({error:'Solo el profesor puede realizar esta acción. La vista del respaldo es de lectura.'});next()}
function studentScope(req,res,next){if(req.user.role==='student'&&req.user.id!==Number(req.params.id))return res.status(403).json({error:'Acceso denegado.'});next()}
app.get('/api/config',(req,res)=>res.json({preview:!connected,authReady:ready()}));
app.post('/api/login',rateLimit({windowMs:15*60*1000,limit:30}),async(req,res)=>{if(!connected||!ready())return res.status(503).json({error:'Configura PostgreSQL y las credenciales en .env.'});const {email,password,token}=req.body;let user;if(token){const {rows}=await query('SELECT student_id FROM aula_student_access WHERE token_hash=$1',[hash(token)]);if(rows[0])user={role:'student',id:rows[0].student_id}}else if(typeof password==='string'&&email===process.env.TEACHER_EMAIL&&timingSafeEqual(Buffer.from(hash(password)),Buffer.from(hash(process.env.TEACHER_PASSWORD))))user={role:'teacher'};if(!user)return res.status(401).json({error:'Credenciales incorrectas.'});res.json({token:jwt.sign(user,process.env.JWT_SECRET,{expiresIn:'8h'}),user})});
app.use('/api',auth);
catalogRoutes(app,teacher);
app.post('/api/vocabulary/definition',teacher,async(req,res)=>{
 try{res.json(await lookupDefinition(req.body.word))}catch(error){res.status(error.status||502).json({error:error.message})}
});
app.post('/api/exercises/preview',teacher,(req,res)=>res.json(exerciseDocument(req.body.html||'')));
app.post('/api/exercises/check',teacher,(req,res)=>res.json(grade(parseExercises(req.body.html||''),req.body.answers||{})));
app.get('/api/catalog',async(req,res)=>{const data=connected?Object.fromEntries(await Promise.all(['niveles','etapas','lecciones'].map(async name=>[name,(await query(`SELECT * FROM ${name}`)).rows]))):{niveles:snapshot.niveles,etapas:snapshot.etapas,lecciones:snapshot.lecciones};res.json({...data,lecciones:data.lecciones.map(l=>presentLesson(l,req.user.role))})});
app.get('/api/students',async(req,res)=>{if(req.user.role==='student')return res.json((await query('SELECT * FROM alumnos WHERE id=$1',[req.user.id])).rows);res.json(connected?(await query('SELECT * FROM alumnos ORDER BY nombre')).rows:snapshot.alumnos)});
app.post('/api/students',teacher,async(req,res)=>{if(!req.body.nombre?.trim())return res.status(400).json({error:'Escribe un nombre.'});res.json((await query('INSERT INTO alumnos(nombre) VALUES($1) RETURNING *',[req.body.nombre.trim()])).rows[0])});
app.post('/api/students/:id/access',teacher,async(req,res)=>{const token=randomBytes(32).toString('hex');await query('INSERT INTO aula_student_access(student_id,token_hash) VALUES($1,$2) ON CONFLICT(student_id) DO UPDATE SET token_hash=excluded.token_hash',[req.params.id,hash(token)]);res.json({token})});
app.get('/api/students/:id/progress',studentScope,async(req,res)=>res.json(connected?(await query('SELECT * FROM student_lessons WHERE student_id=$1',[req.params.id])).rows:snapshot.student_lessons.filter(p=>p.student_id===Number(req.params.id))));
app.put('/api/students/:id/progress/:lessonId',studentScope,teacher,async(req,res)=>{const {completed,notes}=req.body;if(typeof completed!=='boolean'||typeof notes!=='string')return res.status(400).json({error:'Datos de progreso inválidos.'});res.json((await query('INSERT INTO student_lessons(student_id,lesson_id,completed,notes) VALUES($1,$2,$3,$4) ON CONFLICT(student_id,lesson_id) DO UPDATE SET completed=excluded.completed,notes=excluded.notes,updated_at=now() RETURNING *',[req.params.id,req.params.lessonId,completed,notes])).rows[0])});
app.post('/api/lessons',teacher,async(req,res)=>{const b=req.body;if(!b.nombre?.trim()||!Number.isInteger(Number(b.etapa_id)))return res.status(400).json({error:'Nombre y etapa son obligatorios.'});const {rows}=await query('INSERT INTO lecciones(nombre,etapa_id,titulo_clase,contenido_leccion,ejercicios_leccion,img_banner,orden_leccion) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[b.nombre,b.etapa_id,b.titulo_clase||b.nombre,clean(b.contenido_leccion),storedExercises(b.ejercicios_leccion),b.img_banner||'',Number(b.orden_leccion)||0]);res.json(presentLesson(rows[0],req.user.role))});
app.put('/api/lessons/:id',teacher,async(req,res)=>{const b=req.body;if(!b.nombre?.trim())return res.status(400).json({error:'El título es obligatorio.'});const r=await query('UPDATE lecciones SET nombre=$1,etapa_id=$2,titulo_clase=$3,contenido_leccion=$4,ejercicios_leccion=$5,img_banner=$6,orden_leccion=$7 WHERE id=$8 RETURNING *',[b.nombre,b.etapa_id,b.titulo_clase||b.nombre,clean(b.contenido_leccion),storedExercises(b.ejercicios_leccion),b.img_banner||'',Number(b.orden_leccion)||0,req.params.id]);if(!r.rows[0])return res.status(404).json({error:'Clase no encontrada.'});res.json(presentLesson(r.rows[0],req.user.role))});
app.post('/api/lessons/:id/check',async(req,res)=>{
 const lesson=connected?(await query('SELECT ejercicios_leccion FROM lecciones WHERE id=$1',[req.params.id])).rows[0]:snapshot.lecciones.find(l=>l.id===Number(req.params.id));
 if(!lesson)return res.status(404).json({error:'Clase no encontrada.'});
 res.json(grade(parseExercises(lesson.ejercicios_leccion),req.body.answers||{}));
});
app.get('/api/students/:id/submissions/:lessonId',studentScope,async(req,res)=>{
 if(!connected)return res.json(null);
 const submission=(await query('SELECT s.*,l.ejercicios_leccion FROM aula_submissions s JOIN lecciones l ON l.id=s.lesson_id WHERE student_id=$1 AND lesson_id=$2',[req.params.id,req.params.lessonId])).rows[0];
 if(!submission)return res.json(null);
 const {ejercicios_leccion,...rest}=submission;res.json({...rest,result:grade(parseExercises(ejercicios_leccion),rest.answers)});
});
app.post('/api/students/:id/submissions/:lessonId',studentScope,async(req,res)=>{if(req.user.role!=='student')return res.status(403).json({error:'Solo el alumno puede enviar respuestas.'});const {rows}=await query('SELECT ejercicios_leccion FROM lecciones WHERE id=$1',[req.params.lessonId]);if(!rows[0])return res.status(404).json({error:'Clase no encontrada.'});const answers=req.body.answers||{};const result=grade(parseExercises(rows[0].ejercicios_leccion),answers);await query('INSERT INTO aula_submissions(student_id,lesson_id,answers,score) VALUES($1,$2,$3,$4) ON CONFLICT(student_id,lesson_id) DO UPDATE SET answers=excluded.answers,score=excluded.score,updated_at=now()',[req.params.id,req.params.lessonId,answers,result.score]);res.json(result)});
app.use('/api',(req,res)=>res.status(404).json({error:'Ruta de API no encontrada.'}));
if(!process.env.VERCEL&&existsSync('dist')){app.use(express.static(resolve('dist')));app.get('/{*path}',(req,res)=>res.sendFile(resolve('dist/index.html')))}
app.use((err,req,res,next)=>{console.error(err.message);res.status(500).json({error:'No se pudo completar la operación. Revisa la conexión y ejecuta las migraciones.'})});
export default app;
if(!process.env.VERCEL&&process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 app.listen(Number(process.env.PORT)||3001,'127.0.0.1',()=>console.log(`Aula API: http://127.0.0.1:${process.env.PORT||3001} · ${connected?'PostgreSQL':'respaldo / solo lectura'}`));
}



