import React,{useState} from 'react';
import {Layers,LayoutGrid,Search,ChevronRight,ArrowUpRight} from 'lucide-react';
import './library.css';

const sort=(rows,key)=>[...rows].sort((a,b)=>(a[key]??0)-(b[key]??0)||a.id-b.id);
const normalize=value=>(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function initialLibraryView(){try{return localStorage.getItem('preplytool-library-view')==='all'?'all':'sections'}catch{return 'sections'}}
export function LibraryBrowser({data,view,onViewChange,path,onPathChange,renderLessons}){
 const [search,setSearch]=useState(''),[levelFilter,setLevelFilter]=useState('');
 const level=data.niveles.find(n=>n.id===path.level),stage=level&&data.etapas.find(s=>s.id===path.stage&&s.nivel_id===level.id);
 function navigate(next){setSearch('');onPathChange(next)}
 function changeView(next){setSearch('');setLevelFilter('');onViewChange(next);try{localStorage.setItem('preplytool-library-view',next)}catch{}}
 const matches=row=>normalize(row.nombre||row.titulo_clase).includes(normalize(search));
 const stages=sort(data.etapas.filter(s=>s.nivel_id===level?.id),'orden_etapa');
 const lessons=sort(data.lecciones.filter(l=>view==='all'?(!levelFilter||data.etapas.find(s=>s.id===l.etapa_id)?.nivel_id===Number(levelFilter)):l.etapa_id===stage?.id),'orden_leccion').filter(matches);
 const groups=(level?stages:sort(data.niveles,'orden_nivel')).filter(matches);
 const showingLessons=view==='all'||Boolean(stage);
 const kind=showingLessons?'lecciones':level?'etapas':'niveles';
 return <section className="library-browser" aria-label="Explorar biblioteca">
  <div className="library-view-switch" role="group" aria-label="Vista de la biblioteca">
   <button type="button" aria-pressed={view==='sections'} onClick={()=>changeView('sections')}><Layers size={17}/>Por niveles</button>
   <button type="button" aria-pressed={view==='all'} onClick={()=>changeView('all')}><LayoutGrid size={17}/>Todas las lecciones</button>
  </div>
  {view==='sections'?<nav className="library-breadcrumbs" aria-label="Ubicación en la biblioteca"><button type="button" onClick={()=>navigate({level:null,stage:null})}>Niveles</button>{level&&<><ChevronRight size={15}/><button type="button" onClick={()=>navigate({level:level.id,stage:null})}>{level.nombre}</button></>}{stage&&<><ChevronRight size={15}/><span aria-current="page">{stage.nombre}</span></>}</nav>:<p className="library-hint">Todas las lecciones de la biblioteca en una sola vista.</p>}
  <div className="section-title"><h2>{view==='all'?'Todas las lecciones':stage?stage.nombre:level?`Etapas de ${level.nombre}`:'Elige un nivel'}</h2></div>
  <div className="filters"><label className="search"><Search size={18}/><input type="search" aria-label={`Buscar ${kind}`} placeholder={`Buscar ${kind}…`} value={search} onChange={e=>setSearch(e.target.value)}/></label>{view==='all'&&<select aria-label="Filtrar por nivel" value={levelFilter} onChange={e=>setLevelFilter(e.target.value)}><option value="">Todos los niveles</option>{sort(data.niveles,'orden_nivel').map(n=><option key={n.id} value={n.id}>{n.nombre}</option>)}</select>}<span>{showingLessons?lessons.length:groups.length} {kind}</span></div>
  {showingLessons?renderLessons(lessons):<div className="library-group-grid">{groups.map((group,index)=>{
   const children=level?data.lecciones.filter(l=>l.etapa_id===group.id):data.etapas.filter(s=>s.nivel_id===group.id);
   const lessonCount=level?children.length:data.lecciones.filter(l=>children.some(s=>s.id===l.etapa_id)).length;
   return <button type="button" key={group.id} className="library-group-card" onClick={()=>navigate(level?{level:level.id,stage:group.id}:{level:group.id,stage:null})}><div className={'library-group-cover theme-'+index%4}><span>{level?'ETAPA':'NIVEL'}</span><Layers size={42}/></div><div className="library-group-body"><h3>{group.nombre}</h3><p>{level?`${lessonCount} lecciones`:`${children.length} etapas · ${lessonCount} lecciones`}</p><div><span>{level?'Ver lecciones':'Ver etapas'}</span><ArrowUpRight size={18}/></div></div></button>;
  })}{!groups.length&&<div className="empty">{search?'No hay resultados para esta búsqueda.':level?'Este nivel todavía no tiene etapas.':'Todavía no hay niveles en la biblioteca.'}</div>}</div>}
 </section>;
}
