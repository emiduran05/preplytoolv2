import {pool,query} from './db.js';
export function catalogRoutes(app,teacher){
 app.post('/api/catalog/reorder',teacher,async(req,res)=>{
  const configs={levels:['niveles','orden_nivel',null],stages:['etapas','orden_etapa','nivel_id'],lessons:['lecciones','orden_leccion','etapa_id']};
  const config=configs[req.body.kind],ids=req.body.ids,parent=Number(req.body.parent_id);
  if(!config||!Array.isArray(ids)||!ids.length||ids.some(id=>!Number.isInteger(id)||id<1)||new Set(ids).size!==ids.length||(config[2]&&(!Number.isInteger(parent)||parent<1)))return res.status(400).json({error:'Orden inválido.'});
  const [table,column,fk]=config,client=await pool.connect();
  try{
   await client.query('BEGIN');
   const {rows}=await client.query(`SELECT id FROM ${table}${fk?` WHERE ${fk}=$1`:''} ORDER BY id FOR UPDATE`,fk?[parent]:[]);
   if(rows.length!==ids.length||rows.some(row=>!ids.includes(row.id))){await client.query('ROLLBACK');return res.status(409).json({error:'La lista cambió. Actualiza la biblioteca y vuelve a ordenar.'})}
   await client.query(`UPDATE ${table} SET ${column}=ordered.position FROM unnest($1::int[]) WITH ORDINALITY AS ordered(id,position) WHERE ${table}.id=ordered.id`,[ids]);
   await client.query('COMMIT');res.json({ok:true});
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 });
 const validateStage=async(req,res,next)=>{
  const id=Number(req.body.etapa_id);
  if(!Number.isInteger(id)||id<1||!(await query('SELECT id FROM etapas WHERE id=$1',[id])).rows.length)return res.status(400).json({error:'Selecciona una etapa válida para la clase.'});
  next();
 };
 app.post('/api/lessons',teacher,validateStage);
 app.put('/api/lessons/:id',teacher,validateStage);
 for(const [route,table,parent,order] of [['levels','niveles',null,'orden_nivel'],['stages','etapas','nivel_id','orden_etapa']]){
  for(const method of ['post','put'])app[method](`/api/${route}${method==='put'?'/:id':''}`,teacher,async(req,res)=>{
   const b=req.body;
   if(typeof b.nombre!=='string'||!b.nombre.trim()||(parent&&(!Number.isInteger(Number(b[parent]))||Number(b[parent])<1)))return res.status(400).json({error:'Escribe el nombre y selecciona un nivel válido.'});
   if(parent&&!(await query('SELECT id FROM niveles WHERE id=$1',[b[parent]])).rows.length)return res.status(400).json({error:'El nivel no existe.'});
   const columns=['nombre',order,...(parent?[parent]:[])],values=[b.nombre.trim(),Number(b[order])||0,...(parent?[Number(b[parent])]:[])];
   const sql=method==='post'?`INSERT INTO ${table}(${columns.join(',')}) VALUES(${values.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`:`UPDATE ${table} SET ${columns.map((c,i)=>c+'=$'+(i+1)).join(',')} WHERE id=$${values.length+1} RETURNING *`;
   if(method==='put')values.push(req.params.id);
   const {rows}=await query(sql,values);if(!rows[0])return res.status(404).json({error:'No se encontró el elemento.'});res.json(rows[0]);
  });
  app.delete(`/api/${route}/:id`,teacher,async(req,res)=>{
   const child=parent?'lecciones':'etapas',fk=parent?'etapa_id':'nivel_id';
   const client=await pool.connect();try{
    await client.query('BEGIN');await client.query(`SELECT id FROM ${table} WHERE id=$1 FOR UPDATE`,[req.params.id]);
    if((await client.query(`SELECT id FROM ${child} WHERE ${fk}=$1 LIMIT 1`,[req.params.id])).rows.length){await client.query('ROLLBACK');return res.status(409).json({error:parent?'Mueve o elimina las lecciones de esta etapa primero.':'Mueve o elimina las etapas de este nivel primero.'})}
    const r=await client.query(`DELETE FROM ${table} WHERE id=$1 RETURNING id`,[req.params.id]);await client.query('COMMIT');res.status(r.rows.length?200:404).json(r.rows.length?{ok:true}:{error:'No se encontró el elemento.'});
   }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  });
 }
 app.patch('/api/lessons/:id/location',teacher,async(req,res)=>{
  const stage=Number(req.body.etapa_id);if(!Number.isInteger(stage)||stage<1||!(await query('SELECT id FROM etapas WHERE id=$1',[stage])).rows.length)return res.status(400).json({error:'Selecciona una etapa válida.'});
  const r=await query('UPDATE lecciones SET etapa_id=$1,orden_leccion=$2 WHERE id=$3 RETURNING id',[stage,Number(req.body.orden_leccion)||0,req.params.id]);res.status(r.rows.length?200:404).json(r.rows.length?{ok:true}:{error:'Clase no encontrada.'});
 });
 app.delete('/api/lessons/:id',teacher,async(req,res)=>{
  const client=await pool.connect();try{
   await client.query('BEGIN');
   await client.query('DELETE FROM aula_submissions WHERE lesson_id=$1',[req.params.id]);
   await client.query('DELETE FROM student_lessons WHERE lesson_id=$1',[req.params.id]);
   await client.query('DELETE FROM vocabulario_palabras WHERE leccion_id=$1',[req.params.id]);
   const r=await client.query('DELETE FROM lecciones WHERE id=$1 RETURNING id',[req.params.id]);
   await client.query('COMMIT');res.status(r.rows.length?200:404).json(r.rows.length?{ok:true}:{error:'Clase no encontrada.'});
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 });
}
