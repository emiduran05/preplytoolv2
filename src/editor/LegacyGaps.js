import {Extension} from '@tiptap/core';
import {Plugin,PluginKey} from '@tiptap/pm/state';
import {Decoration,DecorationSet} from '@tiptap/pm/view';
export const LegacyGaps=Extension.create({name:'legacyGaps',addProseMirrorPlugins(){return [new Plugin({key:new PluginKey('aulaLegacyGaps'),props:{decorations(state){const values=[];state.doc.descendants((node,pos)=>{if(node.isText)for(const match of node.text.matchAll(/\{[^{}]+\}/g))values.push(Decoration.inline(pos+match.index,pos+match.index+match[0].length,{class:'answer-token',title:'Respuesta correcta: se convierte en un campo al abrir la clase'}))});return DecorationSet.create(state.doc,values)}}})]}});
