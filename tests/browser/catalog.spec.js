import {test,expect} from '@playwright/test';
test('crear clase selecciona nivel y etapa; biblioteca permite mover y borrar',async({page})=>{
 const data={niveles:[{id:1,nombre:'A1',orden_nivel:1},{id:2,nombre:'A2',orden_nivel:2}],etapas:[{id:1,nombre:'Saludos',nivel_id:1},{id:2,nombre:'Conversación',nivel_id:2}],lecciones:[]};
 await page.addInitScript(()=>{sessionStorage.setItem('session','fixture');sessionStorage.setItem('user',JSON.stringify({role:'teacher'}))});
 await page.route('**/api/**',async route=>{
  const r=route.request(),path=new URL(r.url()).pathname,body=r.postDataJSON();let value={ok:true};
  if(path==='/api/config')value={preview:false,authReady:true};
  else if(path==='/api/catalog')value=data;
  else if(path==='/api/students')value=[];
  else if(path==='/api/lessons'&&r.method()==='POST'){value={...body,id:20};data.lecciones.push(value)}
  else if(path==='/api/lessons/20/location'){Object.assign(data.lecciones[0],body)}
  else if(path==='/api/lessons/20'&&r.method()==='DELETE')data.lecciones=[];
  else throw new Error('Ruta inesperada: '+path);
  await route.fulfill({json:value});
 });
 await page.goto('/');await page.getByRole('button',{name:'Biblioteca de clases',exact:true}).click();await page.getByText('Organizar biblioteca',{exact:true}).click();await page.getByRole('button',{name:'Nueva lección',exact:true}).click();
 await expect(page.getByRole('combobox',{name:'Nivel de la clase'})).toHaveValue('');
 await page.getByRole('textbox',{name:'Nombre de la clase',exact:true}).fill('Clase nueva');
 await page.getByRole('combobox',{name:'Nivel de la clase'}).selectOption('2');
 await expect(page.getByRole('combobox',{name:'Etapa de la clase'}).getByRole('option',{name:'Saludos'})).toHaveCount(0);
 await page.getByRole('combobox',{name:'Etapa de la clase'}).selectOption('2');
 await page.getByRole('button',{name:'Guardar clase',exact:true}).click();
 await expect(page.locator('.lesson-view')).toBeVisible();expect(data.lecciones[0].etapa_id).toBe(2);
 await page.getByRole('button',{name:'Biblioteca de clases',exact:true}).click();await page.getByText('Organizar biblioteca',{exact:true}).click();
 await page.locator('.catalog-levels').getByRole('button',{name:/A2.*etapas/}).click();
 await page.getByRole('button',{name:'Mover clase',exact:true}).click();
 await page.getByRole('combobox',{name:'Nivel de destino'}).selectOption('1');
 await expect(page.getByRole('combobox',{name:'Etapa de destino'})).toHaveValue('');
 await page.getByRole('combobox',{name:'Etapa de destino'}).selectOption('1');await page.getByRole('button',{name:'Guardar cambios'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);expect(data.lecciones[0].etapa_id).toBe(1);
 await page.locator('.catalog-levels').getByRole('button',{name:/A1.*etapas/}).click();
 await page.getByRole('button',{name:'Borrar clase',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('progreso');
 await page.getByRole('button',{name:'Cancelar',exact:true}).click();expect(data.lecciones).toHaveLength(1);
 await page.getByRole('button',{name:'Borrar clase',exact:true}).click();await page.getByRole('button',{name:'Borrar definitivamente'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);expect(data.lecciones).toHaveLength(0);
});


