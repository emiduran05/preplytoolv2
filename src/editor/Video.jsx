import React from 'react';
import {Node,mergeAttributes} from '@tiptap/core';
import {NodeViewWrapper,ReactNodeViewRenderer} from '@tiptap/react';
function VideoView({node,deleteNode,selected}){
 return <NodeViewWrapper contentEditable={false} className={'video-node '+(selected?'is-selected':'')}><div className="video-node-caption"><span>Video · Vista previa</span><button type="button" onClick={deleteNode}>Quitar video</button></div>{node.attrs.kind==='embed'?<iframe src={node.attrs.src} title="Video de la clase" allowFullScreen/>:<video src={node.attrs.src} controls/>}</NodeViewWrapper>;
}
export const Video=Node.create({
 name:'classVideo',group:'block',atom:true,draggable:true,
 addAttributes(){return {src:{default:''},kind:{default:'video',rendered:false},width:{default:640},height:{default:360}}},
 parseHTML(){return [{tag:'iframe',getAttrs:el=>({src:el.getAttribute('src'),kind:'embed'})},{tag:'video',getAttrs:el=>({src:el.getAttribute('src')||el.querySelector('source')?.getAttribute('src'),kind:'video'})}]},
 renderHTML({node,HTMLAttributes}){return node.attrs.kind==='embed'?['iframe',mergeAttributes(HTMLAttributes,{allowfullscreen:'true'})]:['video',mergeAttributes(HTMLAttributes,{controls:'true'})]},
 addNodeView(){return ReactNodeViewRenderer(VideoView)}
});
export function videoAttributes(value){
 let url;try{url=new URL(value)}catch{return null}
 if(!['http:','https:'].includes(url.protocol))return null;
 if(['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(url.hostname)){
  const id=url.hostname==='youtu.be'?url.pathname.slice(1):url.searchParams.get('v')||url.pathname.split('/').pop();
  return /^[\w-]{11}$/.test(id)?{kind:'embed',src:'https://www.youtube-nocookie.com/embed/'+id}:null;
 }
 if(url.hostname==='player.vimeo.com')return {kind:'embed',src:url.href};
 return {kind:'video',src:url.href};
}
