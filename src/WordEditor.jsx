import React,{useEffect,useRef,useState} from 'react';
import {useEditor,useEditorState,EditorContent} from '@tiptap/react';
import {AlignLeft,AlignCenter,AlignRight,AlignJustify,Bold,Italic,Underline,Strikethrough,List,ListOrdered,Undo2,Redo2,ImagePlus,Video,Table2,Link2,Highlighter,RemoveFormatting,Save,Settings2,Plus,Trash2,TextCursorInput,Eye,FileText,ChevronsUpDown} from 'lucide-react';
import {extensions} from './editor/extensions.js';
import {LegacyGaps} from './editor/LegacyGaps.js';
import {videoAttributes} from './editor/Video.jsx';
import {api} from './api.js';
import {LessonExercises} from './LessonExercises.jsx';
import {CoverImage} from './CoverImage.jsx';
import {coverSource,coverIssue} from './cover-image.js';
import {VocabularyDialog} from './VocabularyDialog.jsx';
import {insertVocabulary} from './vocabulary.js';

const exerciseTypes=['choice','boolean','fill','open','match'];
function structured(raw){try{const value=JSON.parse(raw);return Array.isArray(value)&&value.every(e=>exerciseTypes.includes(e.type))?value:null}catch{return null}}
function Tool({icon:Icon,label,run,active,disabled,large}){
 return <button type="button" title={label} aria-label={label} aria-pressed={Boolean(active)} disabled={disabled} className={'ribbon-tool '+(active?'is-active ':'')+(large?'large-tool':'')} onMouseDown={e=>e.preventDefault()} onClick={run}><Icon size={large?23:17}/>{large&&<span>{label}</span>}</button>;
}
export function Editor({lesson,stages,levels=[],onSave,onCancel,disabled}){
 const original=structured(lesson.ejercicios_leccion);
 const [form,setForm]=useState(lesson),[exercises,setExercises]=useState(original||[]),[mode,setMode]=useState(original===null&&lesson.ejercicios_leccion?'legacy':'structured');
 const [section,setSection]=useState('content'),[ribbon,setRibbon]=useState('Inicio'),[settings,setSettings]=useState(false),[dialog,setDialog]=useState(null),[message,setMessage]=useState(''),[dirty,setDirty]=useState(false),[zoom,setZoom]=useState(100),[preview,setPreview]=useState(false),[previewDocument,setPreviewDocument]=useState(null);
 const file=useRef(null),coverFile=useRef(null);
 const [vocabularyOpen,setVocabularyOpen]=useState(false);
 const [coverBusy,setCoverBusy]=useState(false),[coverError,setCoverError]=useState('');
 const content=useEditor({immediatelyRender:false,extensions,content:lesson.contenido_leccion||'<p></p>',onUpdate:()=>setDirty(true)});
 const legacy=useEditor({immediatelyRender:false,extensions:[...extensions,LegacyGaps],content:original===null?lesson.ejercicios_leccion||'<p></p>':'<p></p>',onUpdate:()=>setDirty(true)});
 const active=section==='exercises'&&mode==='legacy'?legacy:content;
 const format=useEditorState({editor:active,selector:({editor})=>editor&&!editor.isDestroyed&&editor.schema?{bold:editor.isActive('bold'),italic:editor.isActive('italic'),underline:editor.isActive('underline'),strike:editor.isActive('strike'),bullet:editor.isActive('bulletList'),ordered:editor.isActive('orderedList'),align:editor.getAttributes('paragraph').textAlign||editor.getAttributes('heading').textAlign||'left',font:editor.getAttributes('textStyle').fontFamily||'Arial',size:parseInt(editor.getAttributes('textStyle').fontSize)||16,color:editor.getAttributes('textStyle').color||'#263c36',heading:editor.isActive('heading')?editor.getAttributes('heading').level:0,image:editor.isActive('image'),imageAttrs:editor.getAttributes('image'),table:editor.isActive('table'),tableBorder:editor.getAttributes('table').borderColor,words:editor.getText().trim().split(/\s+/).filter(Boolean).length}:null});
 useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty]);
 const field=(key,value)=>{setForm(old=>({...old,[key]:value}));setDirty(true)};
 const currentLevel=stages.find(s=>s.id===Number(form.etapa_id))?.nivel_id;
 const [chosenLevel,setChosenLevel]=useState(()=>stages.find(s=>s.id===Number(lesson.etapa_id))?.nivel_id||'');
 const execute=callback=>{if(active){callback(active.chain().focus());setMessage('')}};
 const openDialog=type=>setDialog({type,url:'',text:'',answer:'',rows:3,cols:3});
 const updateDialog=(key,value)=>setDialog(old=>({...old,[key]:value}));
 function insertDialog(){
  if(dialog.type==='image'){
   if(!/^https?:\/\//.test(dialog.url)){setMessage('Introduce una URL http o https. También puedes subir una imagen desde tu equipo.');return}
   active.chain().focus().setImage({src:dialog.url,alt:dialog.text}).run();
  }else if(dialog.type==='video'){
   const attrs=videoAttributes(dialog.url);if(!attrs){setMessage('Introduce un enlace válido de YouTube o un archivo de video.');return}
   active.chain().focus().insertContent({type:'classVideo',attrs}).run();
  }else if(dialog.type==='link'){
   if(!/^https?:\/\//.test(dialog.url)){setMessage('Introduce un enlace http o https.');return}
   active.chain().focus().extendMarkRange('link').setLink({href:dialog.url}).run();
  }else if(dialog.type==='table'){
   if(!Number.isInteger(Number(dialog.rows))||!Number.isInteger(Number(dialog.cols))||dialog.rows<1||dialog.rows>20||dialog.cols<1||dialog.cols>12){setMessage('Elige entre 1 y 20 filas y entre 1 y 12 columnas.');return}
   active.chain().focus().insertTable({rows:Number(dialog.rows),cols:Number(dialog.cols),withHeaderRow:true}).run();setRibbon('Tabla');
  }else if(dialog.type==='gap'){
   if(!dialog.answer.trim()){setMessage('Escribe la respuesta correcta del espacio.');return}
   legacy.chain().focus().insertContent('{'+dialog.answer.trim().replace(/[{}]/g,'')+'}').run();
  }else if(dialog.type==='alt')active.chain().focus().updateAttributes('image',{alt:dialog.text}).run();
  setDialog(null);setMessage('');setDirty(true);
 }
 async function upload(event){
  const image=event.target.files?.[0];event.target.value='';if(!image)return;
  if(!/^image\/(png|jpe?g|gif|webp|avif|bmp)$/.test(image.type)){setMessage('Elige una imagen PNG, JPG, WEBP, GIF, AVIF o BMP.');return}
  if(image.size>6*1024*1024){setMessage('La imagen debe pesar menos de 6 MB.');return}
  try{const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(image)});active.chain().focus().setImage({src,alt:image.name}).run();setDirty(true);setDialog(null)}catch{setMessage('No se pudo leer la imagen.')}
 }
 async function uploadCover(event){
  const image=event.target.files?.[0];event.target.value='';if(!image)return;
  setCoverError('');
  if(!/^image\/(png|jpe?g|gif|webp|avif|bmp)$/.test(image.type)){setCoverError('Elige una imagen PNG, JPG, WEBP, GIF, AVIF o BMP.');return}
  if(image.size>6*1024*1024){setCoverError('La portada debe pesar menos de 6 MB.');return}
  setCoverBusy(true);
  try{
   const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(image)});
   await new Promise((resolve,reject)=>{const preview=new window.Image();preview.onload=resolve;preview.onerror=reject;preview.src=src});
   field('img_banner',src);
  }catch{setCoverError('No se pudo leer la imagen. Prueba con otro archivo.')}finally{setCoverBusy(false)}
 }
 function addExercise(type='choice'){setExercises(old=>[...old,{id:crypto.randomUUID(),type,question:'',options:['Opción 1','Opción 2'],answer:type==='boolean'?'Verdadero':''}]);setDirty(true)}
 async function togglePreview(){if(preview){setPreview(false);return}try{setPreviewDocument(await api('/exercises/preview',{method:'POST',body:{html:legacy.getHTML()}}));setPreview(true)}catch(e){setMessage(e.message)}}
 function updateExercise(index,key,value){setExercises(old=>old.map((e,i)=>i===index?{...e,[key]:value}:e));setDirty(true)}
 function save(event){
  event.preventDefault();if(coverBusy)return;if(!form.nombre?.trim()){setMessage('Escribe el nombre de la clase.');return}
  if(!stages.some(s=>s.id===Number(form.etapa_id))){setMessage('Selecciona el nivel y la etapa de la clase antes de guardar.');return}
  if(mode==='structured'&&exercises.some(e=>!e.question?.trim()||e.type!=='open'&&!String(e.answer||'').trim()||['choice','match'].includes(e.type)&&!e.options?.includes(e.answer))){setSection('exercises');setMessage('Completa las preguntas y selecciona su respuesta correcta antes de guardar.');return}
  const issue=coverIssue(form.img_banner);if(issue){setSettings(true);setCoverError(issue);return}
  setMessage('');onSave({...form,img_banner:coverSource(form.img_banner),contenido_leccion:content?.getHTML()||'',ejercicios_leccion:mode==='legacy'?legacy?.getHTML()||'':JSON.stringify(exercises)});
 }
 if(!content||!legacy||content.isDestroyed||legacy.isDestroyed)return <div className="loading">Abriendo documento…</div>;
 return <form className="word-editor" onSubmit={save}>
  <div className="document-header"><div><button type="button" className="document-back" onClick={onCancel}>← Volver</button><div className="document-name"><FileText size={19}/><input aria-label="Nombre de la clase" placeholder="Nombre de la clase" value={form.nombre} onChange={e=>field('nombre',e.target.value)}/></div><small>{dirty?'Cambios sin guardar':'Documento de clase'} · {section==='content'?'Contenido':'Ejercicios'}</small></div><div className="document-header-actions"><button type="button" onClick={()=>setSettings(!settings)} aria-pressed={settings}><Settings2 size={17}/>Detalles</button><button className="primary" disabled={disabled}><Save size={17}/>{disabled?'Guardando…':'Guardar clase'}</button></div></div>
  <div className="lesson-location"><label>Nivel<select aria-label="Nivel de la clase" value={currentLevel||chosenLevel} onChange={e=>{setChosenLevel(Number(e.target.value));field('etapa_id','')}}><option value="">Selecciona un nivel</option>{[...levels].sort((a,b)=>(a.orden_nivel||0)-(b.orden_nivel||0)).map(n=><option key={n.id} value={n.id}>{n.nombre}</option>)}</select></label><label>Etapa<select aria-label="Etapa de la clase" value={form.etapa_id||''} onChange={e=>field('etapa_id',Number(e.target.value))}><option value="">Selecciona una etapa</option>{stages.filter(s=>s.nivel_id===(currentLevel||chosenLevel)).sort((a,b)=>(a.orden_etapa||0)-(b.orden_etapa||0)).map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label></div>
  <div className="document-navigation"><button type="button" className={section==='content'?'selected':''} onClick={()=>{setSection('content');setPreview(false)}}>Contenido de la clase</button><button type="button" className={section==='exercises'?'selected':''} onClick={()=>{setSection('exercises');setPreview(false)}}>Ejercicios</button><button type="button" onClick={()=>setVocabularyOpen(true)}>Agregar vocabulario</button><span>Selecciona texto para darle formato · Haz clic en una imagen para ajustarla</span></div>
  <div className="word-ribbon"><div className="ribbon-tabs">{['Inicio','Insertar','Tabla'].map(tab=><button type="button" key={tab} className={ribbon===tab?'selected':''} onClick={()=>setRibbon(tab)}>{tab}</button>)}<div className="ribbon-history"><Tool icon={Undo2} label="Deshacer" run={()=>execute(c=>c.undo().run())} disabled={!active.can().undo()}/><Tool icon={Redo2} label="Rehacer" run={()=>execute(c=>c.redo().run())} disabled={!active.can().redo()}/></div></div>
   <div className="ribbon-content">
    {ribbon==='Inicio'&&<><div className="ribbon-group"><div className="ribbon-controls"><select aria-label="Fuente" value={format?.font||'Arial'} onChange={e=>execute(c=>c.setFontFamily(e.target.value).run())}>{['Arial','Georgia','Verdana','Times New Roman','Courier New','Manrope'].map(font=><option key={font}>{font}</option>)}</select><input className="font-size-input" type="number" min={8} max={96} aria-label="Tamaño de texto" value={format?.size||16} onChange={e=>{const size=Number(e.target.value);if(size>=8&&size<=96)execute(c=>c.setFontSize(size+'px').run())}}/></div><div className="ribbon-controls"><Tool icon={Bold} label="Negrita" active={format?.bold} run={()=>execute(c=>c.toggleBold().run())}/><Tool icon={Italic} label="Cursiva" active={format?.italic} run={()=>execute(c=>c.toggleItalic().run())}/><Tool icon={Underline} label="Subrayado" active={format?.underline} run={()=>execute(c=>c.toggleUnderline().run())}/><Tool icon={Strikethrough} label="Tachado" active={format?.strike} run={()=>execute(c=>c.toggleStrike().run())}/><label className="color-control" title="Color del texto"><span>A</span><input aria-label="Color del texto" type="color" defaultValue="#263c36" onChange={e=>execute(c=>c.setColor(e.target.value).run())}/></label><label className="color-control" title="Resaltar texto"><Highlighter size={16}/><input aria-label="Resaltar texto" type="color" defaultValue="#fff3a3" onChange={e=>execute(c=>c.setBackgroundColor(e.target.value).run())}/></label><Tool icon={RemoveFormatting} label="Quitar formato" run={()=>execute(c=>c.unsetAllMarks().clearNodes().run())}/></div><small>Fuente y formato</small></div>
    <div className="ribbon-group"><div className="ribbon-controls"><Tool icon={List} label="Lista con viñetas" active={format?.bullet} run={()=>execute(c=>c.toggleBulletList().run())}/><Tool icon={ListOrdered} label="Lista numerada" active={format?.ordered} run={()=>execute(c=>c.toggleOrderedList().run())}/><select aria-label="Interlineado" defaultValue="1.6" onChange={e=>execute(c=>c.setLineHeight(e.target.value).run())}><option value="1">1</option><option value="1.3">1.3</option><option value="1.6">1.6</option><option value="2">2</option></select></div><div className="ribbon-controls">{[[AlignLeft,'left','Alinear a la izquierda'],[AlignCenter,'center','Centrar'],[AlignRight,'right','Alinear a la derecha'],[AlignJustify,'justify','Justificar']].map(([icon,align,label])=><Tool key={align} icon={icon} label={label} active={format?.align===align} run={()=>execute(c=>c.setTextAlign(align).run())}/>)}</div><small>Párrafo</small></div>
    <div className="ribbon-group"><div className="ribbon-style-options">{[[0,'Normal'],[1,'Título'],[2,'Subtítulo'],[3,'Encabezado']].map(([value,name])=><button type="button" key={value} className={format?.heading===value?'selected':''} onMouseDown={e=>e.preventDefault()} onClick={()=>execute(c=>value?c.setHeading({level:value}).run():c.setParagraph().run())}>{name}</button>)}</div><small>Estilos</small></div></>}
    {ribbon==='Insertar'&&<><div className="ribbon-group"><div className="ribbon-controls"><Tool icon={ImagePlus} label="Imagen" large run={()=>openDialog('image')}/><Tool icon={Video} label="Video" large run={()=>openDialog('video')}/></div><small>Multimedia</small></div><div className="ribbon-group"><div className="ribbon-controls"><Tool icon={Table2} label="Tabla" large run={()=>openDialog('table')}/><Tool icon={Link2} label="Enlace" large run={()=>openDialog('link')}/></div><small>Contenido</small></div>{section==='exercises'&&mode==='legacy'&&<div className="ribbon-group"><Tool icon={TextCursorInput} label="Espacio para completar" large run={()=>openDialog('gap')}/><small>Respuesta en el texto</small></div>}</>}
    {ribbon==='Tabla'&&<><div className="ribbon-group"><Tool icon={Table2} label="Insertar tabla" large run={()=>openDialog('table')}/><small>Tabla</small></div><div className="ribbon-group"><div className="ribbon-controls"><button type="button" disabled={!format?.table} onClick={()=>execute(c=>c.addRowAfter().run())}>+ Fila</button><button type="button" disabled={!format?.table} onClick={()=>execute(c=>c.addColumnAfter().run())}>+ Columna</button></div><div className="ribbon-controls"><button type="button" disabled={!format?.table} onClick={()=>execute(c=>c.deleteRow().run())}>− Fila</button><button type="button" disabled={!format?.table} onClick={()=>execute(c=>c.deleteColumn().run())}>− Columna</button></div><small>Filas y columnas</small></div><div className="ribbon-group"><div className="ribbon-controls"><button type="button" disabled={!format?.table} onClick={()=>execute(c=>c.mergeCells().run())}>Combinar</button><button type="button" disabled={!format?.table} onClick={()=>execute(c=>c.splitCell().run())}>Dividir</button><button type="button" disabled={!format?.table} onClick={()=>execute(c=>c.toggleHeaderRow().run())}>Encabezado</button></div><div className="ribbon-controls"><label className="cell-color">Borde de tabla <input aria-label="Color del borde de tabla" type="color" value={/^#[0-9a-f]{6}$/i.test(format?.tableBorder||'')?format.tableBorder:'#d9cdee'} disabled={!format?.table} onChange={e=>execute(c=>c.updateAttributes('table',{borderColor:e.target.value}).run())}/></label><label className="cell-color">Fondo de celda <input aria-label="Color de celda" type="color" disabled={!format?.table} onChange={e=>execute(c=>c.setCellAttribute('background',e.target.value).run())}/></label><Tool icon={Trash2} label="Quitar tabla" disabled={!format?.table} run={()=>execute(c=>c.deleteTable().run())}/></div><small>Diseño · arrastra los bordes para ajustar columnas</small></div></>}
   </div>
   {format?.image&&<div className="image-context"><ImagePlus size={17}/><strong>Imagen seleccionada</strong><span>Arrastra las esquinas del borde azul.</span><button type="button" onClick={()=>execute(c=>c.updateAttributes('image',{width:null,height:null}).run())}>Tamaño original</button><button type="button" onClick={()=>setDialog({type:'alt',text:format.imageAttrs.alt||''})}>Descripción</button><Tool icon={Trash2} label="Eliminar imagen" run={()=>execute(c=>c.deleteSelection().run())}/></div>}
  </div>
  {message&&<div className="editor-message" role="status">{message}</div>}
  <div className={'document-workspace '+(settings?'with-inspector':'')}>
   <div className="document-area">
    {section==='content'?<><div className="page-ruler"><span>0</span><span>5</span><span>10</span><span>15</span><span>20</span></div><div className="document-sheet" style={{zoom:zoom/100}}><input className="document-class-title" aria-label="Título visible de la clase" placeholder="Título de la clase" value={form.titulo_clase||form.nombre||''} onChange={e=>field('titulo_clase',e.target.value)}/><EditorContent editor={content} className="document-body"/></div></>:
    <><div className="exercise-author-header"><div><strong>{mode==='legacy'?'Ejercicios dentro del documento':'Tarjetas de ejercicios'}</strong><p>{mode==='legacy'?'Los textos entre llaves son las respuestas correctas. Al abrir la clase se convierten en campos para escribir.':'Cada tarjeta define una pregunta y su respuesta correcta.'}</p></div>{mode==='legacy'&&<button type="button" onClick={togglePreview}><Eye size={16}/>{preview?'Volver a editar':'Vista del alumno'}</button>}</div>
    {mode==='legacy'?<div className="document-sheet exercise-document" style={{zoom:zoom/100}}>{preview?<LessonExercises lesson={{id:null,exercise_document:previewDocument}} teacher preview checkHandler={answers=>api('/exercises/check',{method:'POST',body:{html:legacy.getHTML(),answers}})}/>:<EditorContent editor={legacy} className="document-body"/>}<button type="button" className="insert-gap-button" onClick={()=>openDialog('gap')}><TextCursorInput size={17}/>Insertar espacio para completar</button></div>:
    <div className="exercise-cards-editor">{exercises.map((e,index)=><div className="exercise-builder" key={e.id}><div className="section-title"><strong>Ejercicio {index+1}</strong><button type="button" aria-label={'Eliminar ejercicio '+(index+1)} onClick={()=>{setExercises(old=>old.filter((_,i)=>i!==index));setDirty(true)}}><Trash2 size={16}/></button></div><select aria-label={'Tipo de ejercicio '+(index+1)} value={e.type} onChange={event=>updateExercise(index,'type',event.target.value)}><option value="choice">Opción múltiple</option><option value="boolean">Verdadero / falso</option><option value="fill">Completar palabra o frase</option><option value="open">Respuesta abierta</option><option value="match">Relacionar concepto con definición</option></select><label>Pregunta o concepto<input value={e.question} onChange={event=>updateExercise(index,'question',event.target.value)}/></label>{['choice','match'].includes(e.type)&&<label>Opciones (una por línea)<textarea value={(e.options||[]).join('\n')} onChange={event=>updateExercise(index,'options',event.target.value.split('\n'))}/></label>}{e.type!=='open'&&<label>Respuesta correcta{['choice','match','boolean'].includes(e.type)?<select value={e.answer} onChange={event=>updateExercise(index,'answer',event.target.value)}><option value="">Selecciona la respuesta…</option>{(e.type==='boolean'?['Verdadero','Falso']:e.options||[]).map((v,i)=><option key={i}>{v}</option>)}</select>:<input value={e.answer} onChange={event=>updateExercise(index,'answer',event.target.value)}/>}</label>}</div>)}<button type="button" className="add-exercise-button" onClick={()=>addExercise()}><Plus size={20}/>Añadir ejercicio</button>{!exercises.length&&<button type="button" onClick={()=>{setMode('legacy');setDirty(true)}}><FileText size={17}/>Crear ejercicios dentro de un documento</button>}</div>}
    </>}
   </div>
   {settings&&<aside className="document-inspector"><h3>Detalles de la clase</h3><div className="cover-upload"><label>Imagen de portada<input value={form.img_banner?.startsWith('data:')?'':form.img_banner||''} onChange={e=>{setCoverError('');field('img_banner',e.target.value)}} placeholder={form.img_banner?.startsWith('data:')?'Imagen subida desde tu equipo':'URL de la imagen'} disabled={disabled||coverBusy}/></label><input ref={coverFile} aria-label="Archivo de portada" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp" hidden onChange={uploadCover}/><button type="button" disabled={disabled||coverBusy} onClick={()=>coverFile.current.click()}><ImagePlus size={17}/>{coverBusy?'Cargando portada…':'Subir portada desde mi equipo'}</button><small>PNG, JPG, WEBP, GIF, AVIF o BMP · Máximo 6 MB</small>{form.img_banner&&<><CoverImage source={form.img_banner} className="inspector-cover" alt="Portada"/><button type="button" disabled={disabled||coverBusy} onClick={()=>{field('img_banner','');setCoverError('')}}>Quitar portada</button></>}{coverError&&<p className="error" role="alert">{coverError}</p>}</div><label>Orden en la biblioteca<input type="number" value={form.orden_leccion||0} onChange={e=>field('orden_leccion',Number(e.target.value))}/></label><p>Los cambios se aplican al guardar la clase.</p></aside>}
  </div>
  <div className="document-status"><span>{format?.words||0} palabras · Español</span><span>Ctrl+B negrita · Ctrl+Z deshacer</span><label>Vista <input type="range" aria-label="Zoom del documento" min={75} max={125} step={5} value={zoom} onChange={e=>setZoom(Number(e.target.value))}/>{zoom}%</label></div>
  {vocabularyOpen&&<VocabularyDialog onClose={()=>setVocabularyOpen(false)} onAdd={(word,definition,source)=>{if(!insertVocabulary(content,word,definition,source))throw new Error('No se pudo insertar la tabla.');setSection('content');setDirty(true)}}/>}
  <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp" hidden onChange={upload}/>
  {dialog&&<div className="editor-dialog-backdrop" onClick={()=>setDialog(null)}><div className="editor-dialog" role="dialog" aria-modal="true" aria-label={{image:'Insertar imagen',video:'Insertar video',table:'Insertar tabla',link:'Insertar enlace',gap:'Espacio para completar',alt:'Descripción de imagen'}[dialog.type]} onClick={e=>e.stopPropagation()}><h2>{{image:'Inserta una imagen',video:'Añade un video',table:'Diseña tu tabla',link:'Inserta un enlace',gap:'Espacio para completar',alt:'Descripción de la imagen'}[dialog.type]}</h2>
   {['image','video','link'].includes(dialog.type)&&<label>{dialog.type==='video'?'Enlace de YouTube o video':'Enlace (URL)'}<input autoFocus value={dialog.url} onChange={e=>updateDialog('url',e.target.value)} placeholder="https://…"/></label>}
   {['image','alt'].includes(dialog.type)&&<label>Descripción de la imagen<input value={dialog.text} onChange={e=>updateDialog('text',e.target.value)}/></label>}
   {dialog.type==='image'&&<button type="button" className="upload-image-button" onClick={()=>file.current.click()}><ImagePlus size={20}/>Subir desde mi equipo</button>}
   {dialog.type==='table'&&<div className="table-picker"><label>Filas<input type="number" min={1} max={20} value={dialog.rows} onChange={e=>updateDialog('rows',e.target.value)}/></label><label>Columnas<input type="number" min={1} max={12} value={dialog.cols} onChange={e=>updateDialog('cols',e.target.value)}/></label><div className="table-picker-grid" style={{gridTemplateColumns:`repeat(${Math.min(12,Number(dialog.cols)||1)},1fr)`}}>{Array.from({length:Math.min(20,Number(dialog.rows)||1)*Math.min(12,Number(dialog.cols)||1)},(_,i)=><span key={i}/>)}</div></div>}
   {dialog.type==='gap'&&<><p>Se inserta en la posición del cursor. El alumno verá un campo vacío y podrá revisar su respuesta.</p><label>Respuesta correcta<input autoFocus value={dialog.answer} onChange={e=>updateDialog('answer',e.target.value)}/></label></>}
   {message&&<p className="dialog-error">{message}</p>}<div className="dialog-actions"><button type="button" onClick={()=>setDialog(null)}>Cancelar</button><button type="button" className="primary" onClick={insertDialog}>{dialog.type==='alt'?'Aplicar':'Insertar'}</button></div>
  </div></div>}
 </form>;
}







