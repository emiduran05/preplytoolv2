import React,{useEffect,useRef,useState} from 'react';
import {CheckCircle2,RotateCcw,Send} from 'lucide-react';
import {api} from './api.js';

function InlineExercises({html,answers,onAnswer,result}){
 const container=useRef(null);
 useEffect(()=>{
  container.current?.querySelectorAll('input[data-gap-id]').forEach(input=>{
   const id=input.dataset.gapId;if(input.value!==(answers[id]||''))input.value=answers[id]||'';
   const feedback=result?.results?.[id];
   input.className=feedback?(feedback.correct?'gap-correct':'gap-incorrect'):'';
   input.setAttribute('aria-invalid',feedback&&!feedback.correct?'true':'false');
   input.title=feedback?(feedback.correct?'Correcto':feedback.answered?'Revisa tu respuesta':'Falta completar este espacio'):'Completa este espacio';
  });
 },[html,answers,result]);
 return <div ref={container} className="rich-content inline-exercises" onInput={event=>{const id=event.target.dataset.gapId;if(id)onAnswer(id,event.target.value)}} dangerouslySetInnerHTML={{__html:html}}/>;
}
export function LessonExercises({lesson,student,teacher,preview,checkHandler}){
 const document=lesson.exercise_document||{kind:'structured',html:'',exercises:[]};
 const [answers,setAnswers]=useState({}),[result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
 useEffect(()=>{
  let active=true;setAnswers({});setResult(null);setError('');setSaved(false);
 if(student&&!preview&&lesson.id)api(`/students/${student.id}/submissions/${lesson.id}`).then(value=>{if(active&&value){setAnswers(value.answers);setResult(value.result);setSaved(true)}}).catch(e=>{if(active)setError(e.message)});
  return ()=>{active=false};
 },[student?.id,lesson.id,preview]);
 const answer=(id,value)=>{setAnswers(old=>({...old,[id]:value}));setResult(null);setSaved(false)};
 async function check(persist=false){
  setBusy(true);setError('');try{
   const path=persist?`/students/${student.id}/submissions/${lesson.id}`:`/lessons/${lesson.id}/check`;
   setResult(checkHandler?await checkHandler(answers):await api(path,{method:'POST',body:{answers}}));setSaved(persist);
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 if(!document.exercises.length&&!document.html.replace(/<[^>]*>/g,'').trim()&&!document.html.includes('<img'))return null;
 return <section className="exercise-section"><div className="section-title"><div><div className="eyebrow">APRENDE HACIENDO</div><h2>Ponlo en práctica.</h2></div>{document.exercises.length>0&&<span className="exercise-count">{document.exercises.length} respuestas</span>}</div>
 {document.kind==='legacy'?<InlineExercises html={document.html} answers={answers} onAnswer={answer} result={result}/>:document.exercises.map((exercise,index)=>{
  const feedback=result?.results?.[exercise.id];return <div className="exercise" key={exercise.id}><span className="eyebrow">EJERCICIO {index+1} · {exercise.type==='open'?'RESPUESTA ABIERTA':exercise.type==='match'?'RELACIONAR':exercise.type==='fill'?'COMPLETAR':'SELECCIONAR'}</span><h3>{exercise.question}</h3>
  {['choice','boolean','match'].includes(exercise.type)?(exercise.type==='boolean'?['Verdadero','Falso']:exercise.options||[]).map((option,i)=><label className="option" key={i}><input type="radio" name={exercise.id} checked={answers[exercise.id]===option} onChange={()=>answer(exercise.id,option)}/>{option}</label>):exercise.type==='open'?<textarea aria-label={exercise.question} placeholder="Escribe tu respuesta…" value={answers[exercise.id]||''} onChange={event=>answer(exercise.id,event.target.value)}/>:<input className="fill-answer" aria-label={exercise.question} placeholder="Tu respuesta…" value={answers[exercise.id]||''} onChange={event=>answer(exercise.id,event.target.value)}/>}
  {feedback&&<p className={'answer-feedback '+(feedback.manual?'manual':feedback.correct?'correct':'incorrect')}>{feedback.manual?'Tu profesor revisará esta respuesta.':feedback.correct?'✓ Correcto':feedback.answered?'Revisa tu respuesta.':'Completa este ejercicio.'}</p>}
  </div>;
 })}
 {!!document.exercises.length&&<><div className="exercise-actions"><button type="button" className="primary" disabled={busy} onClick={()=>check(!teacher&&!preview&&Boolean(student))}><CheckCircle2 size={17}/>{busy?'Revisando…':'Revisar respuestas'}</button>{!teacher&&!preview&&student&&<button type="button" disabled={busy} onClick={()=>check(true)}><Send size={16}/>Guardar mis respuestas</button>}<button type="button" disabled={busy} onClick={()=>{setAnswers({});setResult(null);setSaved(false)}}><RotateCcw size={16}/>Intentar de nuevo</button></div>
 <div aria-live="polite">{result&&<div className="exercise-result"><strong>{result.total?`${result.correct} de ${result.total} correctas · ${result.score}%`:'Respuestas listas para revisión del profesor'}</strong><p>{result.total&&result.correct<result.total?'Los campos por revisar están marcados en rojo. Puedes corregirlos y volver a revisar.':result.total?'¡Muy bien! Completaste los ejercicios.':'Las preguntas abiertas se revisan manualmente.'}{saved?' Tus respuestas quedaron guardadas.':''}</p></div>}</div></>}
 {error&&<div className="error" role="alert">{error}</div>}
 </section>;
}
