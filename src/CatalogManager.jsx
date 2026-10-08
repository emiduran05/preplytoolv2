import React,{useState,useRef} from 'react';
import {Pencil,Trash2,MoveRight,GripVertical,Plus} from 'lucide-react';
import {api} from './api.js';
import './catalog.css';
const sort=(rows,key)=>[...rows].sort((a,b)=>(a[key]||0)-(b[key]||0)||a.id-b.id);
function IconButton({icon:Icon,label,onClick,disabled}){return <button type="button" className="catalog-icon" title={label} aria-label={label} disabled={disabled} onClick={onClick}><Icon size={17}/></button>}
export function CatalogManager({data,teacher,onRefresh,onOpen,onCreate}){
 const [level,setLevel]=useState(''),[stage,setStage]=useState(''),[dialog,setDialog]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const drag=useRef(null),[over,setOver]=useState(null),[status,setStatus]=useState('');
 const levels=sort(data.niveles,'orden_nivel'),selected=levels.find(n=>n.id===Number(level))||levels[0];
 const stages=sort(data.etapas.filter(e=>e.nivel_id===selected?.id),'orden_etapa'),active=stages.find(e=>e.id===Number(stage))||stages[0];
 const lessons=sort(data.lecciones.filter(l=>l.etapa_id===active?.id),'orden_leccion');
 async function reorder(kind,from,to){
  if(busy||from===to)return;
  const rows=kind==='levels'?levels:kind==='stages'?stages:lessons,ids=rows.map(r=>r.id),index=ids.indexOf(from),target=ids.indexOf(to);
  if(index<0||target<0)return;ids.splice(index,1);ids.splice(target,0,from);
  setBusy(true);setError('');setStatus('Guardando orden…');try{await api('/catalog/reorder',{method:'POST',body:{kind,ids,parent_id:kind==='stages'?selected.id:kind==='lessons'?active.id:undefined}});await onRefresh();setStatus('Orden guardado.')}catch(e){setError(e.message);setStatus('')}finally{setBusy(false);setOver(null);drag.current=null}
 }
 function dropProps(kind,id){return {onDragOver:e=>{if(!busy&&drag.current?.kind===kind){e.preventDefault();e.dataTransfer.dropEffect='move';setOver(kind+id)}},onDrop:e=>{e.preventDefault();const source=drag.current;setOver(null);if(source?.kind===kind)reorder(kind,source.id,id)}}}
 function handle(kind,row){return teacher&&<button type="button" className="catalog-grip" aria-label={'Arrastrar '+row.nombre} title="Arrastra para ordenar · Usa las flechas del teclado" draggable={!busy} disabled={busy} onClick={e=>e.stopPropagation()} onDragStart={e=>{drag.current={kind,id:row.id};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(row.id));setStatus('Suelta sobre otro elemento para cambiar el orden.')}} onDragEnd={()=>{drag.current=null;setOver(null)}} onKeyDown={e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const rows=kind==='levels'?levels:kind==='stages'?stages:lessons,index=rows.findIndex(r=>r.id===row.id),next=rows[index+(['ArrowUp','ArrowLeft'].includes(e.key)?-1:1)];if(next)reorder(kind,row.id,next.id)}}><GripVertical size={18}/></button>}
 const field=(key,value)=>setDialog(d=>({...d,[key]:value}));
 async function save(e){e.preventDefault();setBusy(true);setError('');try{
  const {kind,id,remove,...body}=dialog;
  await api(`/${kind}${id?'/'+id:''}${kind==='lessons'&&!remove?'/location':''}`,{method:remove?'DELETE':kind==='lessons'?'PATCH':id?'PUT':'POST',body:remove?undefined:body});
  await onRefresh();setDialog(null);
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 const edit=(kind,row)=>{setError('');setDialog({kind,...row})};
 const remove=(kind,row)=>{setError('');setDialog({kind,id:row.id,nombre:row.nombre,remove:true})};
 return <section className="catalog-manager" aria-busy={busy}><div className="section-title"><h2>Niveles y etapas</h2>{teacher&&<button disabled={busy} onClick={()=>edit('levels',{nombre:'',orden_nivel:levels.length+1})}><Plus size={16}/> Nuevo nivel</button>}</div>
  {teacher&&<p className="catalog-drag-hint"><GripVertical size={16}/> Arrastra el asa para ordenar niveles, etapas o clases.</p>}{teacher&&<p className="catalog-sort-status" role="status">{status}</p>}{error&&!dialog&&<p role="alert" className="error">{error}</p>}
  <div className="catalog-levels">{levels.map(n=><div key={n.id} data-sort-id={n.id} className={'catalog-sortable '+(over==='levels'+n.id?'drop-target':'')} {...dropProps('levels',n.id)}>{handle('levels',n)}<button className={n.id===selected?.id?'selected':''} onClick={()=>{setLevel(String(n.id));setStage('')}}><strong>{n.nombre}</strong><small>{data.etapas.filter(e=>e.nivel_id===n.id).length} etapas</small></button></div>)}</div>
  {selected?<><div className="section-title"><h3>{selected.nombre}</h3>{teacher&&<div className="catalog-actions"><IconButton icon={Pencil} label="Editar nivel" disabled={busy} onClick={()=>edit('levels',selected)}/><IconButton icon={Trash2} label="Borrar nivel" disabled={busy} onClick={()=>remove('levels',selected)}/><button disabled={busy} onClick={()=>edit('stages',{nombre:'',nivel_id:selected.id,orden_etapa:stages.length+1})}><Plus size={16}/> Nueva etapa</button></div>}</div>
  <div className="catalog-columns"><div className="catalog-stages">{stages.map(s=><div key={s.id} data-sort-id={s.id} className={'catalog-sortable '+(over==='stages'+s.id?'drop-target':'')} {...dropProps('stages',s.id)}>{handle('stages',s)}<button className={s.id===active?.id?'selected':''} onClick={()=>setStage(String(s.id))}><strong>{s.nombre}</strong><small>{data.lecciones.filter(l=>l.etapa_id===s.id).length} clases</small></button></div>)}{!stages.length&&<p>No hay etapas en este nivel.</p>}</div>
   <div>{active&&<><div className="section-title"><h3>{active.nombre}</h3>{teacher&&<div className="catalog-actions"><IconButton icon={Pencil} label="Editar / mover etapa" disabled={busy} onClick={()=>edit('stages',active)}/><IconButton icon={Trash2} label="Borrar etapa" disabled={busy} onClick={()=>remove('stages',active)}/><button disabled={busy} onClick={()=>onCreate(active.id)}><Plus size={16}/> Clase en esta etapa</button></div>}</div>
    {lessons.map(l=><article className={'catalog-lesson '+(over==='lessons'+l.id?'drop-target':'')} data-sort-id={l.id} {...dropProps('lessons',l.id)} key={l.id}>{handle('lessons',l)}<button onClick={()=>onOpen(l)}><strong>{l.nombre}</strong><small>Orden: {l.orden_leccion||0}</small></button>{teacher&&<div className="catalog-actions"><IconButton icon={Pencil} label="Editar clase" disabled={busy} onClick={()=>onOpen(l,true)}/><IconButton icon={MoveRight} label="Mover clase" disabled={busy} onClick={()=>edit('lessons',{...l,nivel_id:selected.id})}/><IconButton icon={Trash2} label="Borrar clase" disabled={busy} onClick={()=>remove('lessons',l)}/></div>}</article>)}{!lessons.length&&<p>Esta etapa todavía no tiene clases.</p>}</>}
   </div></div></>:<p>Crea un nivel para comenzar a organizar tus clases.</p>}
  {dialog&&<div className="editor-dialog-backdrop"><form className="editor-dialog" role="dialog" aria-modal="true" aria-label={dialog.remove?'Confirmar eliminación':'Organizar contenido'} onSubmit={save}>
   <h2>{dialog.remove?'Borrar':dialog.id?'Editar / mover':'Crear'} {dialog.kind==='levels'?'nivel':dialog.kind==='stages'?'etapa':'clase'}</h2>
   {dialog.remove?<p>¿Borrar “{dialog.nombre}”? {dialog.kind==='lessons'?'Se eliminarán también las respuestas, el progreso, las notas y el vocabulario asociados a esta clase. Esta acción no se puede deshacer.':'Solo se puede borrar si está vacío.'}</p>:<>
    {dialog.kind!=='lessons'&&<label>Nombre<input required value={dialog.nombre} onChange={e=>field('nombre',e.target.value)}/></label>}
    {dialog.kind!=='levels'&&<label>Nivel<select aria-label="Nivel de destino" required value={dialog.nivel_id||''} onChange={e=>setDialog(d=>({...d,nivel_id:Number(e.target.value),...(d.kind==='lessons'?{etapa_id:''}:{})}))}><option value="">Selecciona un nivel</option>{levels.map(n=><option key={n.id} value={n.id}>{n.nombre}</option>)}</select></label>}
    {dialog.kind==='lessons'&&<label>Etapa<select aria-label="Etapa de destino" required value={dialog.etapa_id||''} onChange={e=>field('etapa_id',Number(e.target.value))}><option value="">Selecciona una etapa</option>{sort(data.etapas.filter(s=>s.nivel_id===Number(dialog.nivel_id)),'orden_etapa').map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>}
    <label>Orden<input type="number" value={dialog[dialog.kind==='levels'?'orden_nivel':dialog.kind==='stages'?'orden_etapa':'orden_leccion']||0} onChange={e=>field(dialog.kind==='levels'?'orden_nivel':dialog.kind==='stages'?'orden_etapa':'orden_leccion',Number(e.target.value))}/></label>
   </>}{error&&<p role="alert" className="error">{error}</p>}<div className="dialog-actions"><button type="button" disabled={busy} onClick={()=>setDialog(null)}>Cancelar</button><button className="primary" disabled={busy}>{busy?'Guardando…':dialog.remove?'Borrar definitivamente':'Guardar cambios'}</button></div>
  </form></div>}
 </section>;
}

