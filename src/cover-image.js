export function coverSource(value){
 const source=typeof value==='string'?value.trim():'';
 if(!source)return '';
 if(/^data:image\/(png|jpe?g|gif|webp|avif|bmp);base64,/i.test(source))return source;
 const candidate=source.startsWith('//')?'https:'+source:/^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(source)?'https://'+source:source;
 try{const url=new URL(candidate);return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return ''}
}

export function coverIssue(value){
 if(!value?.trim())return '';
 const src=coverSource(value);
 if(!src)return 'Introduce una URL válida de imagen (https://…).';
 if(!src.startsWith('data:')){
  const url=new URL(src);
  if(/(^|\.)facebook\.com$/i.test(url.hostname)||url.hostname==='fb.watch')return 'Este enlace abre una página de Facebook, no una imagen. Guarda la imagen en tu computadora y usa «Subir portada desde mi equipo», o pega un enlace directo al archivo de imagen.';
 }
 return '';
}
