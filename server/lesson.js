import {clean} from './html.js';
import {exerciseDocument} from './exercises.js';
export function presentLesson(lesson,role){
 const document=exerciseDocument(lesson.ejercicios_leccion);
 return {...lesson,contenido_leccion:clean(lesson.contenido_leccion),exercise_document:document,
  ejercicios_leccion:role==='student'?(document.kind==='structured'?JSON.stringify(document.exercises):null):lesson.ejercicios_leccion};
}
