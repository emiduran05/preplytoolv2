import {test,expect} from '@playwright/test';
import {readBackup} from '../../server/backup.js';
import {presentLesson} from '../../server/lesson.js';
import {parseExercises,exerciseDocument,grade} from '../../server/exercises.js';
const backup=await readBackup('preplytool_backup.dump');
const dataImage=backup.lecciones.flatMap(l=>[...(l.contenido_leccion||'').matchAll(/src="(data:image\/[^" ]+)"/g)]).map(m=>m[1])[0];
test.beforeEach(async({page})=>{
 page.on('pageerror',error=>console.log('Error del navegador de pruebas:',error.stack));
 const lessons=[{id:901,nombre:'Clase de prueba original',titulo_clase:'Clase de prueba original',etapa_id:1,contenido_leccion:`<h2>Aprendemos español</h2><p>Texto para dar formato.</p><p><img src="${dataImage}" width="300"/></p>`,ejercicios_leccion:backup.lecciones.find(l=>l.id===1).ejercicios_leccion},{id:902,nombre:'Ejercicios nuevos',etapa_id:1,contenido_leccion:'<p>Una nueva clase.</p>',ejercicios_leccion:JSON.stringify([{id:'fill',type:'fill',question:'Escribe un saludo',answer:'hola'},{id:'open',type:'open',question:'Describe tu día'}])}];
 await page.addInitScript(()=>{if(!localStorage.getItem('preplytool-library-view'))localStorage.setItem('preplytool-library-view','all');sessionStorage.setItem('session','fixture');sessionStorage.setItem('user',JSON.stringify({role:'teacher'}))});
 await page.route('**/api/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname,body=request.postDataJSON();let result;
  if(path==='/api/config')result={preview:false,authReady:true};
  else if(path==='/api/catalog')result={niveles:[{id:1,nombre:'A1'}],etapas:[{id:1,nombre:'Primeros pasos',nivel_id:1}],lecciones:lessons.map(l=>presentLesson(l,'teacher'))};
  else if(path==='/api/students')result=[];
  else if(path==='/api/exercises/preview')result=exerciseDocument(body.html);
  else if(path==='/api/exercises/check')result=grade(parseExercises(body.html),body.answers);
  else if(/^\/api\/lessons\/\d+\/check$/.test(path))result=grade(parseExercises(lessons.find(l=>l.id===Number(path.split('/')[3])).ejercicios_leccion),body.answers);
  else if(/^\/api\/lessons\/\d+$/.test(path)&&request.method()==='PUT'){const lesson=lessons.find(l=>l.id===Number(path.split('/').pop()));Object.assign(lesson,body);result=presentLesson(lesson,'teacher')}
  else throw new Error('Petición inesperada: '+request.method()+' '+path);
  await route.fulfill({json:result});
 });
 await page.goto('/');
});
test('imagen base64 aparece, se selecciona, se arrastra y conserva el tamaño al guardar',async({page})=>{
 await page.getByRole('button',{name:/Clase de prueba original/}).click();await page.getByRole('button',{name:'Editar clase'}).click();
 const image=page.locator('.document-body .image-node img').first();await expect(image).toBeVisible();await expect(image).toHaveJSProperty('complete',true);
 await image.click();await expect(page.getByText('Imagen seleccionada',{exact:true})).toBeVisible();
 const handle=page.getByRole('slider',{name:'Redimensionar imagen bottom-right'});await expect(handle).toBeVisible();await handle.scrollIntoViewIfNeeded();const before=await image.boundingBox();const rect=await handle.boundingBox();
 await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2+73,rect.y+rect.height/2+25,{steps:8});await page.mouse.up();
 const after=await image.boundingBox();expect(after.width).toBeGreaterThan(before.width+50);expect(after.width/after.height).toBeCloseTo(before.width/before.height,1);
 await page.getByRole('button',{name:'Guardar clase',exact:true}).click();await page.getByRole('button',{name:'Editar clase'}).click();const restored=await page.locator('.document-body .image-node img').first().boundingBox();expect(restored.width).toBeCloseTo(after.width,0);
 await page.screenshot({path:'test-results/editor-document.png',fullPage:true});
});
test('ejercicios originales tienen inputs y revisión para el profesor',async({page})=>{
 await page.getByRole('button',{name:/Clase de prueba original/}).click();const inputs=page.locator('input[data-gap-id]');expect(await inputs.count()).toBeGreaterThan(10);
 await inputs.nth(0).fill('él');await inputs.nth(1).fill('incorrecto');await page.getByRole('button',{name:'Revisar respuestas',exact:true}).click();await expect(inputs.nth(0)).toHaveClass('gap-correct');await expect(inputs.nth(1)).toHaveClass('gap-incorrect');
 await inputs.nth(1).fill('ella');await page.getByRole('button',{name:'Revisar respuestas',exact:true}).click();await expect(inputs.nth(1)).toHaveClass('gap-correct');
 await page.getByRole('button',{name:'Intentar de nuevo'}).click();await expect(inputs.nth(0)).toHaveValue('');await expect(inputs.nth(0)).not.toHaveClass('gap-correct');
});
test('editor conserva ejercicios originales y ofrece vista de alumno interactiva',async({page})=>{
 await page.getByRole('button',{name:/Clase de prueba original/}).click();await page.getByRole('button',{name:'Editar clase'}).click();await page.getByRole('button',{name:'Ejercicios',exact:true}).click();await expect(page.locator('.answer-token').first()).toContainText('{él}');
 await page.getByRole('button',{name:'Vista del alumno'}).click();await page.locator('input[data-gap-id]').first().fill('él');await page.getByRole('button',{name:'Revisar respuestas'}).click();await expect(page.locator('input[data-gap-id]').first()).toHaveClass('gap-correct');
 await page.getByRole('button',{name:'Volver a editar'}).click();await page.getByRole('button',{name:'Guardar clase'}).click();await expect(page.locator('input[data-gap-id]').first()).toBeVisible();
});
test('ejercicios nuevos permiten corrección individual y respuestas abiertas',async({page})=>{
 await page.getByRole('button',{name:/Ejercicios nuevos/}).click();await page.getByRole('textbox',{name:'Escribe un saludo'}).fill('hola');await page.getByRole('textbox',{name:'Describe tu día'}).fill('Bien');await page.getByRole('button',{name:'Revisar respuestas'}).click();await expect(page.getByText('✓ Correcto',{exact:true})).toBeVisible();await expect(page.getByText('Tu profesor revisará esta respuesta.')).toBeVisible();
});
test('cinta de herramientas aplica formato e inserta tablas editables',async({page})=>{
 await page.getByRole('button',{name:/Clase de prueba original/}).click();await page.getByRole('button',{name:'Editar clase'}).click();
 const paragraph=page.locator('.document-body .tiptap p').filter({hasText:'Texto para dar formato.'});await paragraph.evaluate(element=>{element.closest('[contenteditable]').focus();const range=document.createRange();range.selectNodeContents(element);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'))});await expect.poll(()=>page.evaluate(()=>window.getSelection().toString())).toBe('Texto para dar formato.');await page.getByRole('button',{name:'Negrita',exact:true}).click();await expect(paragraph.locator('strong')).toContainText('Texto');
 await page.getByRole('button',{name:'Insertar',exact:true}).click();await page.locator('.ribbon-content').getByRole('button',{name:'Tabla',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Insertar tabla'});await dialog.getByRole('spinbutton',{name:'Filas'}).fill('2');await dialog.getByRole('spinbutton',{name:'Columnas'}).fill('4');await dialog.getByRole('button',{name:'Insertar',exact:true}).click();await expect(page.locator('.document-body table')).toBeVisible();await expect(page.getByRole('button',{name:'+ Fila',exact:true})).toBeEnabled();await page.getByRole('button',{name:'+ Fila',exact:true}).click();await expect(page.locator('.document-body table tr')).toHaveCount(3);
 await page.getByRole('button',{name:'Guardar clase'}).click();await page.getByRole('button',{name:'Editar clase'}).click();await expect(page.locator('.document-body table tr')).toHaveCount(3);
});
test('subir imagen desde el equipo la incrusta y la conserva al guardar',async({page})=>{
 await page.getByRole('button',{name:/Clase de prueba original/}).click();await page.getByRole('button',{name:'Editar clase'}).click();await page.getByRole('button',{name:'Insertar',exact:true}).click();await page.getByRole('button',{name:'Imagen',exact:true}).click();const mime=dataImage.match(/^data:([^;]+)/)[1];await page.locator('input[type=file]').setInputFiles({name:'prueba.jpg',mimeType:mime,buffer:Buffer.from(dataImage.split(',')[1],'base64')});await expect(page.locator('.document-body img[alt="prueba.jpg"]')).toBeVisible();await page.getByRole('button',{name:'Guardar clase'}).click();await page.getByRole('button',{name:'Editar clase'}).click();await expect(page.locator('.document-body img[alt="prueba.jpg"]')).toBeVisible();
});

test('modo oscuro persiste y la portada local se guarda en lección y biblioteca',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});await page.reload();
 await page.getByRole('button',{name:'Activar modo oscuro'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.screenshot({path:'test-results/dark-dashboard.png',fullPage:true});
 await page.getByRole('button',{name:/Clase de prueba original/}).click();await page.getByRole('button',{name:'Editar clase'}).click();await page.getByRole('button',{name:'Detalles',exact:true}).click();
 const input=page.getByLabel('Archivo de portada');
 await input.setInputFiles({name:'portada.txt',mimeType:'text/plain',buffer:Buffer.from('No es una imagen')});await expect(page.getByRole('alert')).toContainText('Elige una imagen');
 const mime=dataImage.match(/^data:([^;]+)/)[1];await input.setInputFiles({name:'portada.jpg',mimeType:mime,buffer:Buffer.from(dataImage.split(',')[1],'base64')});
 await expect(page.locator('.inspector-cover')).toBeVisible();await expect(page.locator('.inspector-cover')).toHaveJSProperty('complete',true);
 await page.screenshot({path:'test-results/dark-editor-cover.png',fullPage:true});
 await page.getByRole('button',{name:'Guardar clase',exact:true}).click();await expect(page.getByAltText('Portada de clase')).toHaveAttribute('src',dataImage);
 await page.getByRole('button',{name:'Biblioteca de clases',exact:true}).click();await expect(page.locator('.lesson-card .card-cover img').first()).toHaveAttribute('src',dataImage);
 await page.reload();await expect(page.locator('.lesson-card .card-cover img').first()).toHaveAttribute('src',dataImage);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/dark-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Activar modo claro'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('modo oscuro cubre la lectura, pantalla completa y hoja del editor',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});await page.reload();await page.getByRole('button',{name:'Activar modo oscuro'}).click();
 await page.getByRole('button',{name:/Clase de prueba original/}).click();
 await expect(page.locator('.lesson-reading-content > .rich-content')).toHaveCSS('background-color','rgb(33, 27, 45)');
 await page.getByRole('button',{name:'Pantalla completa',exact:true}).click();await expect(page.locator('.lesson-reading-content > .rich-content')).toHaveCSS('background-color','rgb(33, 27, 45)');await page.getByRole('button',{name:'Salir de pantalla completa'}).click();
 await page.getByRole('button',{name:'Editar clase'}).click();await expect(page.locator('.document-sheet')).toHaveCSS('background-color','rgb(33, 27, 45)');await expect(page.getByRole('textbox',{name:'Título visible de la clase'})).toHaveCSS('color','rgb(238, 232, 248)');
 const body=page.locator('.document-body .tiptap');const original=await body.innerHTML();
 await page.getByRole('button',{name:'Activar modo claro'}).click();await expect(page.locator('.document-sheet')).toHaveCSS('background-color','rgb(255, 255, 255)');expect(await body.innerHTML()).toBe(original);
 await page.getByRole('button',{name:'Activar modo oscuro'}).click();await page.screenshot({path:'test-results/dark-lesson-editor.png',fullPage:true});
});

test('portada avisa de páginas de Facebook y recupera un enlace directo al reemplazar uno roto',async({page})=>{
 await page.route('https://images.example.test/**',async route=>{
  if(route.request().url().includes('broken'))return route.fulfill({status:404,body:'Not found'});
  await route.fulfill({contentType:dataImage.match(/^data:([^;]+)/)[1],body:Buffer.from(dataImage.split(',')[1],'base64')});
 });
 await page.getByRole('button',{name:/Clase de prueba original/}).click();await page.getByRole('button',{name:'Editar clase'}).click();await page.getByRole('button',{name:'Detalles',exact:true}).click();
 const input=page.getByRole('textbox',{name:'Imagen de portada',exact:true});
 await input.fill('https://www.facebook.com/CanalViralS2/posts/como-era-la-vida-antes-vs-ahora-/482906934768925/');await expect(page.locator('.cover-upload .cover-load-error')).toContainText('página de Facebook');
 await page.getByRole('button',{name:'Guardar clase'}).click();await expect(page.getByRole('alert')).toContainText('página de Facebook');await expect(page.locator('.word-editor')).toBeVisible();
 await input.fill('https://images.example.test/broken.jpg');await expect(page.locator('.cover-upload .cover-load-error')).toContainText('No se pudo cargar');
 await input.fill('  images.example.test/valid.jpg  ');await expect.poll(()=>page.locator('.inspector-cover').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Guardar clase'}).click();await expect(page.getByAltText('Portada de clase')).toHaveAttribute('src','https://images.example.test/valid.jpg');await expect(page.getByAltText('Portada de clase')).toHaveAttribute('referrerpolicy','no-referrer');
 await page.getByRole('button',{name:'Biblioteca de clases',exact:true}).click();await expect.poll(()=>page.locator('.lesson-card .card-cover img').first().evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
});



test('vocabulario crea una sola tabla, se guarda y continúa desde el editor',async({page})=>{
 await page.getByRole('button',{name:/Clase de prueba original/}).click();
 const add=async(word,definition)=>{
  await page.getByRole('button',{name:'Agregar vocabulario',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Agregar vocabulario'});
  await expect(dialog.getByRole('button',{name:'Agregar a la tabla'})).toBeDisabled();await dialog.getByRole('textbox',{name:'Palabra',exact:true}).fill(word);await dialog.getByRole('textbox',{name:'Definición',exact:true}).fill(definition);await dialog.getByRole('button',{name:'Agregar a la tabla'}).click();await expect(dialog).toHaveCount(0);
 };
 await add('saludar','Dirigir palabras de cortesía a una persona.');await add('despedirse','Decir adiós.');
 const table=page.locator('.lesson-reading-content table[data-vocabulary=true]');await expect(table).toHaveCount(1);await expect(table.locator('tr')).toHaveCount(3);await expect(table.locator('th')).toHaveText(['Palabra','Definición']);await expect(table).toContainText('Dirigir palabras');
 await page.reload();await page.getByRole('button',{name:/Clase de prueba original/}).click();await expect(table.locator('tr')).toHaveCount(3);
 await page.getByRole('button',{name:'Editar clase',exact:true}).click();await add('aprender','Adquirir conocimientos.');const editorTable=page.locator('.document-body table[data-vocabulary=true]');await expect(editorTable).toHaveCount(1);await expect(editorTable.locator('tr')).toHaveCount(4);
 await page.getByRole('button',{name:'Guardar clase',exact:true}).click();await expect(table.locator('tr')).toHaveCount(4);await expect(table).toContainText('Adquirir conocimientos.');
 await add('<script>ejemplo</script>','Texto literal <b>sin ejecutar</b>.');await expect(table).toContainText('<script>ejemplo</script>');await expect(table.locator('script')).toHaveCount(0);
 await page.getByRole('button',{name:'Activar modo oscuro'}).click();await expect(table).toBeVisible();await page.screenshot({path:'test-results/vocabulary-table.png',fullPage:true});
});
