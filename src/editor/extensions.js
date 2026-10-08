import StarterKit from '@tiptap/starter-kit';
import {TextStyleKit} from '@tiptap/extension-text-style';
import {Table,TableRow,TableCell,TableHeader,TableView} from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import {ResizableImage} from './ResizableImage.jsx';
import {Video} from './Video.jsx';
const cellAttributes=parent=>({...parent,background:{default:null,parseHTML:e=>e.style.backgroundColor,renderHTML:a=>a.background?{style:`background-color:${a.background}`}:{}}});
const Cell=TableCell.extend({addAttributes(){return cellAttributes(this.parent?.())}});
const Header=TableHeader.extend({addAttributes(){return cellAttributes(this.parent?.())}});
class VocabularyTableView extends TableView{
 constructor(...args){super(...args);this.syncVocabulary()}
 syncVocabulary(){if(this.node.attrs.vocabulary)this.table.dataset.vocabulary='true';else this.table.removeAttribute('data-vocabulary');if(this.node.attrs.borderColor){this.table.style.setProperty('--table-border-color',this.node.attrs.borderColor);this.table.style.borderColor=this.node.attrs.borderColor}else{this.table.style.removeProperty('--table-border-color');this.table.style.removeProperty('border-color')}}
 update(node){const updated=super.update(node);if(updated)this.syncVocabulary();return updated}
}
const VocabularyTable=Table.extend({addAttributes(){return {...this.parent?.(),vocabulary:{default:false,parseHTML:element=>element.getAttribute('data-vocabulary')==='true',renderHTML:attrs=>attrs.vocabulary?{'data-vocabulary':'true'}:{}},borderColor:{default:null,parseHTML:element=>element.style.getPropertyValue('--table-border-color').trim()||element.style.borderColor||null,renderHTML:attrs=>attrs.borderColor?{style:`--table-border-color:${attrs.borderColor};border-color:${attrs.borderColor}`}:{}}}}});
export const extensions=[StarterKit.configure({link:{openOnClick:false}}),TextStyleKit,ResizableImage,Video,VocabularyTable.configure({resizable:true,View:VocabularyTableView}),TableRow,Cell,Header,TextAlign.configure({types:['heading','paragraph']})];
