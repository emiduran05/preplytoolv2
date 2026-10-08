import React,{useState} from 'react';
import {api} from './api.js';

export function VocabularyDialog({onAdd,onClose,saveImmediately=false}){
 const [word,setWord]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event){
  event.preventDefault();if(busy||!word.trim())return;
  setBusy(true);setError('');try{const result=await api('/vocabulary/definition',{method:'POST',body:{word:word.trim()}});await onAdd(word.trim(),result.definition,result.source);onClose()}catch(e){setError(e.message||'No se pudo agregar el vocabulario.')}finally{setBusy(false)}
 }
 return <div className="editor-dialog-backdrop"><section className="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="vocabulary-dialog-title" onKeyDown={e=>{if(e.key==='Escape'&&!busy){e.stopPropagation();onClose()}if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();e.stopPropagation();submit(e)}}}>
  <h2 id="vocabulary-dialog-title">Agregar vocabulario</h2>
  <p>Escribe la palabra. Su primera definición en español se consulta automáticamente en Wikcionario y se añade a la tabla. {saveImmediately?'Se guarda en la biblioteca para todos los alumnos.':'Los cambios se conservan al guardar la clase.'}</p>
  <label>Palabra<input autoFocus required maxLength={80} disabled={busy} value={word} onChange={e=>setWord(e.target.value)}/></label>
  {error&&<p className="error" role="alert">{error}</p>}
  {busy&&<p role="status">Buscando la definición y agregando la palabra…</p>}
  <div className="dialog-actions"><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button type="button" className="primary" disabled={busy||!word.trim()} onClick={submit}>{busy?'Buscando definición…':'Agregar a la tabla'}</button></div>
 </section></div>;
}
