export function appendVocabulary(html,word,definition,source){
 const template=document.createElement('template');template.innerHTML=html||'';
 let table=template.content.querySelector('table[data-vocabulary="true"]');
 if(!table){
  const title=document.createElement('h2');title.textContent='Vocabulario';template.content.append(title);
  table=document.createElement('table');table.dataset.vocabulary='true';
  const header=table.createTHead().insertRow();
  for(const text of ['Palabra','Definición']){const cell=document.createElement('th');cell.textContent=text;header.append(cell)}
  template.content.append(table);
 }
 const body=table.tBodies[0]||table.createTBody(),row=body.insertRow();
 for(const text of [word.trim(),definition.trim()]){
  const cell=row.insertCell();for(const line of text.split('\n')){const paragraph=document.createElement('p');paragraph.textContent=line;cell.append(paragraph)}
 }
 if(source){const paragraph=document.createElement('p');for(const [name,url] of [[source.name,source.url],[source.license,source.licenseUrl]]){const link=document.createElement('a');link.textContent=name;link.href=url;paragraph.append(link,document.createTextNode(' '))}row.cells[1].append(paragraph)}
 return template.innerHTML;
}

export function insertVocabulary(editor,word,definition,source){
 const paragraph=text=>({type:'paragraph',content:text?[{type:'text',text}]:[]});
 const row={type:'tableRow',content:[word.trim(),definition.trim()].map(text=>({type:'tableCell',content:text.split('\n').map(paragraph)}))};
 if(source)row.content[1].content.push({type:'paragraph',content:[{type:'text',text:source.name,marks:[{type:'link',attrs:{href:source.url}}]},{type:'text',text:' · '},{type:'text',text:source.license,marks:[{type:'link',attrs:{href:source.licenseUrl}}]}]});
 let end=null;
 editor.state.doc.descendants((node,pos)=>{if(node.type.name==='table'&&node.attrs.vocabulary){end=pos+node.nodeSize-1;return false}});
 if(end!==null)return editor.chain().focus().insertContentAt(end,row).run();
 return editor.chain().focus().insertContentAt(editor.state.doc.content.size,[
  {type:'heading',attrs:{level:2},content:[{type:'text',text:'Vocabulario'}]},
  {type:'table',attrs:{vocabulary:true},content:[{type:'tableRow',content:['Palabra','Definición'].map(text=>({type:'tableHeader',content:[paragraph(text)]}))},row]},
  paragraph('')
 ]).run();
}
