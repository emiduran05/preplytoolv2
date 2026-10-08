import jwt from 'jsonwebtoken';

export function createClassAccess(studentId,lessonId,secret){
 return jwt.sign({purpose:'private-class',role:'student',id:studentId,lessonId},secret,{expiresIn:'30d'});
}
export function readClassAccess(token,secret){
 try{const value=jwt.verify(token,secret);if(value.purpose==='private-class'&&value.role==='student'&&Number.isInteger(value.id)&&Number.isInteger(value.lessonId))return {role:'student',id:value.id,lessonId:value.lessonId}}catch{}
 return null;
}
export function classScope(req,res,next){
 if(req.user.role==='student'&&req.user.lessonId){
  const match=req.path.match(/^\/lessons\/(\d+)/)||req.path.match(/^\/students\/\d+\/(?:submissions|progress)\/(\d+)/);
  if(match&&Number(match[1])!==req.user.lessonId)return res.status(403).json({error:'Este enlace solo permite acceder a la clase compartida.'});
 }
 next();
}
export function scopedCatalog(data,user){
 if(user.role!=='student'||!user.lessonId)return data;
 const lecciones=data.lecciones.filter(l=>l.id===user.lessonId);
 const etapas=data.etapas.filter(s=>lecciones.some(l=>l.etapa_id===s.id));
 return {lecciones,etapas,niveles:data.niveles.filter(n=>etapas.some(s=>s.nivel_id===n.id))};
}
