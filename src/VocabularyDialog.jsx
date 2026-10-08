import React,{useState} from 'react';

export function VocabularyDialog({onAdd,onClose,saveImmediately=false}){
 const [word,setWord]=useState(''),[definition,setDefinition]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event){
  event.preventDefault();if(busy||!word.trim()||!definition.trim())return;
  setBusy(true);setError('');try{await onAdd(word.trim(),definition.trim());onClose()}catch(e){setError(e.message||'No se pudo agregar el vocabulario.')}finally{setBusy(false)}
 }
 return <div className="editor-dialog-backdrop"><section className="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="vocabulary-dialog-title" onKeyDown={e=>{if(e.key==='Escape'&&!busy){e.stopPropagation();onClose()}if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();e.stopPropagation();submit(e)}}}>
  <h2 id="vocabulary-dialog-title">Agregar vocabulario</h2>
  <p>La palabra y su definición se añaden a una tabla al final de la lección. {saveImmediately?'Se guarda en la biblioteca para todos los alumnos.':'Los cambios se conservan al guardar la clase.'}</p>
  <label>Palabra<input autoFocus required maxLength={200} disabled={busy} value={word} onChange={e=>setWord(e.target.value)}/></label>
  <label>Definición<textarea required maxLength={3000} disabled={busy} value={definition} onChange={e=>setDefinition(e.target.value)}/></label>
  {error&&<p className="error" role="alert">{error}</p>}
  <div className="dialog-actions"><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button type="button" className="primary" disabled={busy||!word.trim()||!definition.trim()} onClick={submit}>{busy?'Guardando…':'Agregar a la tabla'}</button></div>
 </section></div>;
}
