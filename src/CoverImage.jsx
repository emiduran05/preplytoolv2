import React,{useState} from 'react';
import {coverSource,coverIssue} from './cover-image.js';

function LoadedCover({src,className,alt,compact}){
 const [failed,setFailed]=useState(false);
 if(failed)return <span className={'cover-load-error '+(compact?'compact':'')} role="status">{compact?'Portada no disponible':'No se pudo cargar la portada. Usa un enlace directo a una imagen pública o súbela desde tu equipo.'}</span>;
 return <img src={src} className={className} alt={alt} referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>;
}
export function CoverImage({source,className,alt='',compact=false}){
 if(!source?.trim())return null;
 const src=coverSource(source);
 const issue=coverIssue(source);
 if(issue)return <span className={'cover-load-error '+(compact?'compact':'')} role="status">{compact?'Enlace de portada inválido':issue}</span>;
 return <LoadedCover key={src} src={src} className={className} alt={alt} compact={compact}/>;
}
