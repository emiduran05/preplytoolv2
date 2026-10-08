import sanitize from 'sanitize-html';
export const clean=html=>sanitize(html||'',{
 allowedTags:[...sanitize.defaults.allowedTags,'img','video','source','iframe','span','colgroup','col'],
 allowedAttributes:{'*':['style'],a:['href','target','rel'],img:['src','alt','title','width','height'],video:['src','controls','width','height'],source:['src','type'],iframe:['src','width','height','allowfullscreen'],table:['data-vocabulary'],td:['colspan','rowspan','colwidth','style'],th:['colspan','rowspan','colwidth','style'],col:['width','style']},
 allowedSchemesByTag:{img:['http','https','data']},
 transformTags:{'*':(tagName,attribs)=>{
  const styles=[];const align=attribs.class?.match(/ql-align-(center|right|justify)/)?.[1];
  if(align)styles.push('text-align:'+align);
  const size=attribs.class?.match(/ql-size-(small|large|huge)/)?.[1];
  if(size)styles.push('font-size:'+({small:'12px',large:'24px',huge:'36px'}[size]));
  if(styles.length)attribs.style=(attribs.style||'')+';'+styles.join(';');
  if(tagName==='img'&&attribs.src?.startsWith('data:')&&!/^data:image\/(png|jpe?g|gif|webp|avif|bmp);base64,[a-z\d+/=\s]+$/i.test(attribs.src))delete attribs.src;
  return {tagName,attribs};
 }},
 allowedStyles:{'*':{
  color:[/^#[0-9a-f]{3,8}$/i,/^rgba?\([\d .,%]+\)$/,/^[a-z]+$/i],
  'background-color':[/^#[0-9a-f]{3,8}$/i,/^rgba?\([\d .,%]+\)$/,/^[a-z]+$/i],
  'border-color':[/^#[0-9a-f]{3,8}$/i,/^rgb\([\d ,]+\)$/],
  '--table-border-color':[/^#[0-9a-f]{3,8}$/i,/^rgb\([\d ,]+\)$/],
  'font-size':[/^\d+(px|em|rem|%)$/],
  'font-family':[/^[a-z ,"'-]+$/i],
  'line-height':[/^\d+(\.\d+)?(px|em|%)?$/],
  'text-align':[/^(left|center|right|justify)$/],
  width:[/^\d+(px|%)$/],
  'min-width':[/^\d+px$/],
  height:[/^\d+px$/]
 }},
 allowedIframeHostnames:['www.youtube.com','www.youtube-nocookie.com','player.vimeo.com']
});
