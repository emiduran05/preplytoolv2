import {readBackup} from '../server/backup.js';
const d=await readBackup('preplytool_backup.dump');
const stats={imageProtocols:{},exerciseFormats:{},inputs:0,contentInputs:0};
for(const l of d.lecciones){for(const m of (l.contenido_leccion||'').matchAll(/<img[^>]*src=["']([^"']+)/gi)){const kind=m[1].startsWith('data:')?'data':m[1].split(':')[0];stats.imageProtocols[kind]=(stats.imageProtocols[kind]||0)+1}let type='html';try{const v=JSON.parse(l.ejercicios_leccion);type=Array.isArray(v)?'array '+(v[0]?.type||Object.keys(v[0]||{}).join(',')):typeof v}catch{}stats.exerciseFormats[type]=(stats.exerciseFormats[type]||0)+1;stats.inputs+=(l.ejercicios_leccion||'').match(/<input\b/gi)?.length||0;stats.contentInputs+=(l.contenido_leccion||'').match(/<input\b/gi)?.length||0;}
console.log(stats);
for(const l of d.lecciones.filter(l=>l.ejercicios_leccion?.trim().startsWith('{')).slice(0,4))console.log(JSON.stringify({id:l.id,exercise:l.ejercicios_leccion.replace(/data:[^"']+/g,'DATA_IMAGE').slice(0,4000)}));
const gaps=d.lecciones.flatMap(l=>[...(l.ejercicios_leccion||'').matchAll(/\{([^{}]{1,180})\}/g)].map(m=>m[1]));console.log(JSON.stringify({gapCount:gaps.length,variants:gaps.filter(x=>/[|/;]/.test(x)).slice(0,20)}));
for(const l of d.lecciones.filter(l=>/<input\b/i.test(l.contenido_leccion||'')).slice(0,2))console.log(JSON.stringify({id:l.id,content:l.contenido_leccion.replace(/data:[^"']+/g,'DATA_IMAGE').slice(0,3000)}));
