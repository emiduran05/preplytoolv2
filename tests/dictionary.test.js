import test from 'node:test';
import assert from 'node:assert/strict';
import {lookupDefinition,spanishDefinitions} from '../server/dictionary.js';

const html='<h2 id="Español">Español</h2><dl><dt>1</dt><dd>Adquirir <a>conocimiento</a> o experiencia.<sup>[1]</sup><ul><li>Ejemplo: texto.</li></ul></dd><dt>2</dt><dd>Tomar algo en la memoria.</dd></dl><h2>Portugués</h2><dl><dt>1</dt><dd>Otro idioma.</dd></dl>';
test('extrae definiciones en español sin notas, ejemplos ni otros idiomas',()=>{
 assert.deepEqual(spanishDefinitions(html),['Adquirir conocimiento o experiencia.','Tomar algo en la memoria.']);
 assert.deepEqual(spanishDefinitions('<h2>Inglés</h2><dl><dt>1</dt><dd>English.</dd></dl>'),[]);
});
test('consulta automática devuelve la primera definición y su atribución',async()=>{
 const result=await lookupDefinition(' APRENDER ',async url=>{
  assert.equal(url.hostname,'es.wiktionary.org');assert.equal(url.searchParams.get('page'),'aprender');
  return new Response(JSON.stringify({parse:{title:'aprender',text:html}}));
 });
 assert.equal(result.definition,'Adquirir conocimiento o experiencia.');assert.equal(result.source.name,'Wikcionario');assert.match(result.source.url,/\/aprender$/);
});
test('sin resultado o servicio caído no inventa definiciones',async()=>{
 await assert.rejects(lookupDefinition('desconocida',async()=>new Response(JSON.stringify({error:{code:'missingtitle'}}))),e=>e.status===404);
 await assert.rejects(lookupDefinition('aprender',async()=>{throw new Error('timeout')}),e=>e.status===502);
 await assert.rejects(lookupDefinition('<script>',async()=>{throw new Error('No debe consultar')}),e=>e.status===400);
});
