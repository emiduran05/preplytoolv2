export function imageDimension(value){
 if(typeof value==='number')return Number.isFinite(value)&&value>0?value:null;
 const input=String(value||'').trim();
 if(/^\d+(\.\d+)?%$/.test(input))return input;
 if(/^\d+(\.\d+)?(px)?$/.test(input))return parseFloat(input);
 return null;
}
export function resizeImage({width,height,dx,dy,direction,maxWidth=Infinity}){
 const ratio=width/height||1;
 const horizontal=direction.includes('left')?-dx:dx;
 const vertical=direction.includes('top')?-dy:dy;
 const delta=Math.abs(horizontal)>=Math.abs(vertical*ratio)?horizontal:vertical*ratio;
 const next=Math.min(Math.max(40,width+delta),Math.max(40,maxWidth));
 return {width:Math.round(next),height:Math.max(1,Math.round(next/ratio))};
}
