import React,{useRef,useState} from 'react';
import {NodeViewWrapper,ReactNodeViewRenderer} from '@tiptap/react';
import Image from '@tiptap/extension-image';
import {imageDimension,resizeImage} from './image-size.js';

function ImageView({node,selected,updateAttributes,editor,getPos}){
 const image=useRef(null),drag=useRef(null);
 const [preview,setPreview]=useState(null),[broken,setBroken]=useState(false);
 const width=preview?.width||imageDimension(node.attrs.width);
 function select(){const pos=getPos();if(typeof pos==='number')editor.chain().focus().setNodeSelection(pos).run()}
 function begin(event,direction){
  event.preventDefault();event.stopPropagation();select();
  const rect=image.current.getBoundingClientRect();
  drag.current={x:event.clientX,y:event.clientY,width:rect.width,height:rect.height,direction,maxWidth:editor.view.dom.clientWidth-32,current:{width:rect.width,height:rect.height}};
  event.currentTarget.setPointerCapture(event.pointerId);
 }
 function move(event){if(!drag.current)return;const start=drag.current;const value=resizeImage({...start,dx:event.clientX-start.x,dy:event.clientY-start.y});start.current=value;setPreview(value)}
 function finish(event){if(!drag.current)return;updateAttributes(drag.current.current);drag.current=null;setPreview(null);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
 function cancel(){drag.current=null;setPreview(null)}
 function keyboard(event,direction){
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
  event.preventDefault();const rect=image.current.getBoundingClientRect();const delta=(event.key==='ArrowRight'||event.key==='ArrowDown'?1:-1)*(event.shiftKey?20:5);
  updateAttributes(resizeImage({width:rect.width,height:rect.height,dx:direction.includes('left')?-delta:delta,dy:0,direction,maxWidth:editor.view.dom.clientWidth-32}));
 }
 return <NodeViewWrapper as="span" contentEditable={false} className={'image-node '+(selected?'is-selected ':'')+(preview?'is-resizing':'')} style={{width:width||undefined}} onClick={select}>
  <img ref={image} src={node.attrs.src} alt={node.attrs.alt||''} title={node.attrs.title||''} draggable={false} style={{width:width?'100%':undefined}} onError={()=>setBroken(true)} onLoad={()=>setBroken(false)}/>
  {broken&&<span className="image-load-error">No se pudo cargar esta imagen. Puedes reemplazarla desde Insertar.</span>}
  {selected&&<><span className="image-size-label">{preview?`${preview.width} × ${preview.height}`:'Arrastra una esquina para ajustar'}</span>{['top-left','top-right','bottom-left','bottom-right'].map(direction=><span key={direction} role="slider" tabIndex={0} aria-label={'Redimensionar imagen '+direction} aria-valuemin={40} aria-valuenow={Math.round(preview?.width||image.current?.getBoundingClientRect().width||Number(width)||40)} className={'image-handle '+direction} onPointerDown={event=>begin(event,direction)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onKeyDown={event=>keyboard(event,direction)}/>)}</>}
 </NodeViewWrapper>;
}
export const ResizableImage=Image.extend({
 addAttributes(){return {...this.parent?.(),width:{default:null,parseHTML:element=>imageDimension(element.style.width||element.getAttribute('width')),renderHTML:attrs=>attrs.width?{width:attrs.width,style:`width:${typeof attrs.width==='number'?attrs.width+'px':attrs.width}`} :{}},height:{default:null,parseHTML:element=>imageDimension(element.style.height||element.getAttribute('height'))}}},
 addNodeView(){return ReactNodeViewRenderer(ImageView)}
}).configure({inline:true,allowBase64:true});
