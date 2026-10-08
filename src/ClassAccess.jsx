import React,{useState} from 'react';
import {api} from './api.js';

export function ClassAccess({student,lesson}){
 const [link,setLink]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);
 async function create(){setBusy(true);setError('');setCopied(false);try{const result=await api(`/students/${student.id}/access`,{method:'POST',body:{lessonId:lesson.id}});setLink(`${location.origin}/?access=${result.token}`)}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className="class-access"><button disabled={busy} onClick={create}>{busy?'Creando enlace…':'Crear acceso privado a esta clase'}</button>{link&&<div className="access-box"><strong>Solo esta clase · {student.nombre} · válido por 30 días</strong><input aria-label="Enlace privado de la clase" readOnly value={link} onFocus={e=>e.target.select()}/><button onClick={async()=>{try{await navigator.clipboard.writeText(link);setCopied(true)}catch{setError('Selecciona y copia el enlace del campo.')}}}>{copied?'Enlace copiado':'Copiar enlace'}</button></div>}{error&&<p className="error" role="alert">{error}</p>}</section>;
}

