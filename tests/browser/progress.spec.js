import {test,expect} from '@playwright/test';
import {readBackup} from '../../server/backup.js';
import {presentLesson} from '../../server/lesson.js';
import {parseExercises,grade} from '../../server/exercises.js';
const backup=await readBackup('preplytool_backup.dump');
const photo=backup.lecciones.flatMap(l=>[...(l.contenido_leccion||'').matchAll(/src="(data:image\/[^" ]+)"/g)]).map(m=>m[1])[0];
const lesson={id:901,nombre:'Clase de progreso',titulo_clase:'Clase de progreso',etapa_id:1,contenido_leccion:'<p>Esta es nuestra clase.</p>',ejercicios_leccion:JSON.stringify([{id:'hello',type:'fill',question:'Un saludo',answer:'hola'}])};

for(const role of ['teacher','student'])test(`portal permite buscar y navegar lecciones como ${role}`,async({page})=>{
 if(role==='student'){await page.evaluate(()=>sessionStorage.setItem('user',JSON.stringify({role:'student',id:1})));await page.reload()}
 await page.getByRole('button',{name:role==='teacher'?'Mis alumnos':'Mi progreso',exact:true}).click();
 if(role==='teacher')await page.getByRole('combobox',{name:/^Alumno/}).selectOption('1');
 await expect(page.getByRole('button',{name:'Por niveles',exact:true})).toHaveAttribute('aria-pressed','true');
 const search=page.getByRole('searchbox',{name:'Buscar lecciones'});
 await search.fill('PROGRESO');await expect(page.locator('.lesson-card')).toHaveCount(1);
 await search.fill('sin coincidencias');await expect(page.locator('.lesson-card')).toHaveCount(0);
 await search.fill('');await page.locator('.library-group-card').filter({hasText:'A1'}).click();await page.locator('.library-group-card').filter({hasText:'Primera etapa'}).click();
 await page.getByRole('button',{name:/Clase de progreso/}).click();if(role==='teacher')await expect(page.locator('.lesson-student-context')).toContainText('Ana');else await expect(page.getByRole('textbox',{name:'Un saludo'})).toBeVisible();
 await page.getByRole('button',{name:role==='teacher'?'Mis alumnos':'Mi progreso',exact:true}).click();
 await page.getByRole('button',{name:'Todas las lecciones',exact:true}).click();await expect(page.locator('.lesson-card')).toHaveCount(1);
 await search.fill('progreso');await expect(page.locator('.lesson-card')).toHaveCount(1);
 await page.reload();await page.getByRole('button',{name:role==='teacher'?'Mis alumnos':'Mi progreso',exact:true}).click();
 if(role==='teacher')await page.getByRole('combobox',{name:/^Alumno/}).selectOption('1');
 await expect(page.getByRole('button',{name:'Todas las lecciones',exact:true})).toHaveAttribute('aria-pressed','true');
});
test.beforeEach(async({page})=>{
 const rows=new Map(),submissions=new Map();
 const students=[{id:1,nombre:'Ana',foto_url:photo},{id:2,nombre:'Bruno'}];
 await page.addInitScript(()=>{if(!localStorage.getItem('preplytool-library-view'))localStorage.setItem('preplytool-library-view','all');if(!sessionStorage.getItem('user')){sessionStorage.setItem('session','fixture');sessionStorage.setItem('user',JSON.stringify({role:'teacher'}))}});
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,body=req.postDataJSON();let value;
  const role=JSON.parse(await page.evaluate(()=>sessionStorage.getItem('user')))?.role||'teacher';
  if(path==='/api/config')value={preview:false,authReady:true};
  else if(path==='/api/catalog')value={niveles:[{id:1,nombre:'A1'}],etapas:[{id:1,nombre:'Primera etapa',nivel_id:1}],lecciones:[presentLesson(lesson,role)]};
  else if(path==='/api/students')value=role==='student'?[students[0]]:students;
  else if(path==='/api/students/1/access')value={token:'private-class-fixture',lessonId:body.lessonId};
  else if(/^\/api\/students\/\d+\/progress$/.test(path))value=[...rows.values()].filter(row=>row.student_id===Number(path.split('/')[3]));
  else if(/^\/api\/students\/\d+\/progress\/\d+$/.test(path)&&req.method()==='PUT'){
   const id=Number(path.split('/')[3]),lessonId=Number(path.split('/')[5]);value={id:rows.size+1,student_id:id,lesson_id:lessonId,completed:body.completed,notes:body.notes,updated_at:new Date().toISOString()};rows.set(id+'-'+lessonId,value);
  }else if(/^\/api\/students\/\d+\/submissions\/\d+$/.test(path)){
   const key=path.split('/')[3]+'-'+path.split('/')[5];if(req.method()==='POST'){const result=grade(parseExercises(lesson.ejercicios_leccion),body.answers);submissions.set(key,{answers:body.answers,score:result.score,result});value=result}else value=submissions.get(key)||null;
  }else if(/^\/api\/lessons\/\d+\/check$/.test(path))value=grade(parseExercises(lesson.ejercicios_leccion),body.answers);
  else throw new Error('Ruta inesperada: '+req.method()+' '+path);
  await route.fulfill({json:value});
 });
 await page.goto('/');
});
test('progreso pertenece al alumno y la biblioteca no conserva su selección',async({page})=>{
 const openStudent=async id=>{await page.getByRole('button',{name:'Mis alumnos',exact:true}).click();await page.getByRole('combobox',{name:/^Alumno/}).selectOption(id);await page.getByRole('button',{name:'Todas las lecciones',exact:true}).click();await page.getByRole('button',{name:/Clase de progreso/}).click()};
 await expect(page.getByRole('button',{name:'Nueva lección'})).toHaveCount(0);
 await openStudent('1');await expect(page.getByRole('combobox',{name:'Alumno de esta clase'})).toHaveCount(0);
 const completed=page.getByRole('checkbox',{name:/Clase completada/});await expect(completed).toBeEnabled();await completed.check();await expect(page.getByRole('status')).toContainText('Progreso y notas guardados.');
 await page.getByRole('textbox',{name:'Notas de clase'}).fill('Practicamos los saludos.');await page.getByRole('button',{name:'Guardar progreso y notas'}).click();await expect(page.getByRole('status')).toContainText('Progreso y notas guardados.');
 await page.getByRole('button',{name:'Editar en biblioteca'}).click();await expect(page.locator('.word-editor')).toBeVisible();await page.getByRole('button',{name:'Biblioteca de clases',exact:true}).click();
 await expect(page.getByRole('button',{name:'Nueva lección'})).toBeVisible();await page.locator('.lesson-card').first().click();await expect(page.locator('.note-editor')).toHaveCount(0);await expect(page.locator('.lesson-student-context')).toHaveCount(0);
 await openStudent('2');await expect(completed).not.toBeChecked();await expect(page.getByRole('textbox',{name:'Notas de clase'})).toHaveValue('');
 await openStudent('1');await expect(completed).toBeChecked();await expect(page.getByRole('textbox',{name:'Notas de clase'})).toHaveValue('Practicamos los saludos.');
 await page.reload();await page.getByRole('button',{name:/Clase de progreso/}).click();await expect(page.locator('.note-editor')).toHaveCount(0);
});
test('avatar conserva forma circular y foto recortada sin estirarse',async({page})=>{
 await page.getByRole('button',{name:'Mis alumnos',exact:true}).click();await page.getByRole('button',{name:/Ana/}).click();const avatar=page.locator('.student-summary .student-avatar');await expect(avatar).toBeVisible();const dimensions=await avatar.boundingBox();expect(dimensions.width).toBeCloseTo(65,0);expect(dimensions.height).toBeCloseTo(65,0);await expect(avatar.locator('img')).toHaveCSS('object-fit','cover');await expect(avatar).toHaveCSS('border-radius','50%');
});

test('profesor crea enlace para una clase y alumno entra directamente',async({page})=>{
 await page.getByRole('button',{name:'Mis alumnos',exact:true}).click();await page.getByRole('combobox',{name:/^Alumno/}).selectOption('1');
 await page.getByRole('button',{name:'Todas las lecciones',exact:true}).click();await page.getByRole('button',{name:/Clase de progreso/}).click();
 const request=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/students/1/access');
 await page.getByRole('button',{name:'Crear acceso privado a esta clase'}).click();expect((await request).postDataJSON()).toEqual({lessonId:901});
 await expect(page.getByRole('textbox',{name:'Enlace privado de la clase'})).toHaveValue(/access=private-class-fixture/);
 await page.route('**/api/login',route=>route.fulfill({json:{token:'session-class',user:{role:'student',id:1,lessonId:901}}}));
 await page.goto('/?access=private-class-fixture');await expect(page.getByRole('heading',{name:'Clase de progreso',exact:true})).toBeVisible();await expect(page.getByRole('textbox',{name:'Un saludo'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Editar clase',exact:true})).toHaveCount(0);
});
test('lección entra en pantalla completa y sale sin perder respuestas',async({page})=>{
 await page.getByRole('button',{name:/Clase de progreso/}).click();await page.getByRole('textbox',{name:'Un saludo'}).fill('hola');await page.getByRole('button',{name:'Pantalla completa',exact:true}).click();await expect(page.locator('.lesson-view')).toHaveClass(/lesson-fullscreen/);await expect(page.getByRole('button',{name:'Salir de pantalla completa'})).toBeVisible();await expect(page.getByRole('textbox',{name:'Un saludo'})).toHaveValue('hola');await page.getByRole('button',{name:'Salir de pantalla completa'}).click();await expect(page.locator('.lesson-view')).not.toHaveClass(/lesson-fullscreen/);await expect(page.getByRole('textbox',{name:'Un saludo'})).toHaveValue('hola');
});
test('alumno guarda respuestas al revisarlas y las recupera al volver a entrar',async({page})=>{
 await page.evaluate(()=>sessionStorage.setItem('user',JSON.stringify({role:'student',id:1})));await page.reload();await page.getByRole('button',{name:/Clase de progreso/}).click();await page.getByRole('textbox',{name:'Un saludo'}).fill('hola');await page.getByRole('button',{name:'Revisar respuestas'}).click();await expect(page.getByText(/Tus respuestas quedaron guardadas/)).toBeVisible();await page.reload();await page.getByRole('button',{name:/Clase de progreso/}).click();await expect(page.getByRole('textbox',{name:'Un saludo'})).toHaveValue('hola');await expect(page.getByText('✓ Correcto',{exact:true})).toBeVisible();
});



