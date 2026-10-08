import React,{useState} from 'react';
import {Moon,Sun} from 'lucide-react';

function initialTheme(){
 try{const saved=localStorage.getItem('preplytool-theme');if(saved==='dark'||saved==='light')return saved}catch{}
 return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
}
const initial=initialTheme();
document.documentElement.dataset.theme=initial;
export function ThemeToggle(){
 const [theme,setTheme]=useState(initial);
 function toggle(){const next=theme==='dark'?'light':'dark';setTheme(next);document.documentElement.dataset.theme=next;try{localStorage.setItem('preplytool-theme',next)}catch{}}
 return <button type="button" className="theme-toggle" onClick={toggle} aria-label={theme==='dark'?'Activar modo claro':'Activar modo oscuro'} title={theme==='dark'?'Activar modo claro':'Activar modo oscuro'}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}<span>{theme==='dark'?'Modo claro':'Modo oscuro'}</span></button>;
}
