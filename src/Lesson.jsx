import React,{useEffect,useRef,useState} from 'react';
import {Maximize2,Minimize2,CheckCircle2} from 'lucide-react';
import {LessonExercises} from './LessonExercises.jsx';
import {StudentAvatar} from './StudentAvatar.jsx';
import {CoverImage} from './CoverImage.jsx';
export function Lesson({lesson,student,teacher,preview,progress,progressLoading=false,onProgress,onEdit,onBack,busy}){
 const root=useRef(null);
 const [expanded,setExpanded]=useState(false),[saveStatus,setSaveStatus]=useState(''),[saveError,setSaveError]=useState('');
 const current=progress.find(x=>x.lesson_id===lesson.id);
 const [notes,setNotes]=useState(current?.notes||''),[completed,setCompleted]=useState(current?.completed||false);
 useEffect(()=>{setNotes(current?.notes||'');setCompleted(current?.completed||false)},[current,lesson.id,student?.id]);
 useEffect(()=>{setSaveStatus('');setSaveError('')},[lesson.id,student?.id]);
 useEffect(()=>{const sync=()=>setExpanded(document.fullscreenElement===root.current);document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync)},[]);
 useEffect(()=>{if(!expanded)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';const escape=event=>{if(event.key==='Escape'&&!document.fullscreenElement)setExpanded(false)};window.addEventListener('keydown',escape);return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',escape)}},[expanded]);
 async function fullscreen(){if(expanded){if(document.fullscreenElement===root.current)await document.exitFullscreen();setExpanded(false)}else{try{await root.current.requestFullscreen?.()}catch{}setExpanded(true)}}
 async function leave(callback){if(document.fullscreenElement===root.current)await document.exitFullscreen();setExpanded(false);callback()}
 async function save(value){setSaveError('');setSaveStatus('Guardando…');try{await onProgress(value);setSaveStatus('Progreso y notas guardados.')}catch(error){setCompleted(current?.completed||false);setSaveStatus('');setSaveError(error.message)}}
 return <div ref={root} className={'lesson-view '+(expanded?'lesson-fullscreen':'')}><div className="lesson-actions"><button onClick={()=>leave(onBack)}>← Volver</button><div><button onClick={fullscreen}>{expanded?<Minimize2 size={17}/>:<Maximize2 size={17}/>} {expanded?'Salir de pantalla completa':'Pantalla completa'}</button>{teacher&&<button className="primary" onClick={()=>leave(onEdit)}>{student?'Editar en biblioteca':'Editar clase'}</button>}</div></div>
 {teacher&&student&&<div className="lesson-student-context"><StudentAvatar student={student}/><strong>Progreso de {student.nombre}</strong><span>{progressLoading?'Cargando progreso…':'Lección de la biblioteca · notas y avance de este alumno.'}</span></div>}
 <div className="lesson-reading-content"><div className="eyebrow">TU ESPACIO DE APRENDIZAJE</div><h1>{lesson.titulo_clase||lesson.nombre}</h1>
 <CoverImage source={lesson.img_banner} className="lesson-banner" alt="Portada de clase"/>
 <article className="rich-content" dangerouslySetInnerHTML={{__html:lesson.contenido_leccion||'<p>Esta clase todavía no tiene contenido.</p>'}}/>
 {lesson.presentacion_apoyo&&/^https?:\/\//.test(lesson.presentacion_apoyo)&&<a href={lesson.presentacion_apoyo} target="_blank" rel="noreferrer">Abrir presentación de apoyo ↗</a>}
 {lesson.ruta_pdf&&/^https?:\/\//.test(lesson.ruta_pdf)&&<a href={lesson.ruta_pdf} target="_blank" rel="noreferrer">Abrir PDF ↗</a>}
 <LessonExercises key={lesson.id} lesson={lesson} student={student} teacher={teacher} preview={preview}/>
 {student&&<section className="note-editor"><h2>Notas de clase · {student.nombre}</h2>{teacher?<><label className="option"><input type="checkbox" disabled={busy||progressLoading} checked={completed} onChange={event=>{const next=event.target.checked;setCompleted(next);save({completed:next,notes})}}/>Clase completada <small>Se guarda automáticamente al cambiar</small></label><textarea aria-label="Notas de clase" disabled={busy||progressLoading} value={notes} onChange={event=>{setNotes(event.target.value);setSaveStatus('Notas sin guardar.')}} placeholder="Lo que vimos, dudas y próximos pasos…"/><button className="primary" disabled={busy||progressLoading} onClick={()=>save({completed,notes})}>Guardar progreso y notas</button><div className="progress-save-status" role="status">{saveStatus==='Progreso y notas guardados.'&&<CheckCircle2 size={16}/>} {saveStatus}</div>{saveError&&<div className="error" role="alert">{saveError}</div>}</>:<><p>{progressLoading?'Cargando progreso…':completed?'✓ Clase completada':'Clase pendiente'}</p><p className="note-text">{notes||'Tu profesor aún no ha agregado notas.'}</p></>}</section>}
 </div></div>;
}


