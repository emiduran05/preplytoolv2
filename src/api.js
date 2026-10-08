export async function api(path,options={}){
 const response=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+(sessionStorage.getItem('session')||''),...options.headers},body:options.body?JSON.stringify(options.body):undefined});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Error del servidor');return data;
}
