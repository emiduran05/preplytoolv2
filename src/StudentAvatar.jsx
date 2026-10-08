import React,{useEffect,useState} from 'react';
export function StudentAvatar({student,large=false}){
 const src=student?.foto_url||student?.avatar_url;
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[src]);
 const initials=(student?.nombre||'Alumno').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
 return <span className={'avatar student-avatar '+(large?'large':'')} aria-label={'Perfil de '+(student?.nombre||'alumno')}>
  {src&&!failed?<img src={src} alt={student.nombre||'Alumno'} onError={()=>setFailed(true)}/>:initials}
 </span>;
}
