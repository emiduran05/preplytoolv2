import {test,expect} from '@playwright/test';
test('arrastrar niveles, etapas y clases guarda el orden y lo conserva al recargar',async({page})=>{
 const data={niveles:[{id:1,nombre:'A1',orden_nivel:1},{id:2,nombre:'A2',orden_nivel:2}],etapas:[{id:1,nombre:'Saludos',nivel_id:1,orden_etapa:1},{id:2,nombre:'Viajes',nivel_id:1,orden_etapa:2}],lecciones:[{id:1,nombre:'Primera clase',etapa_id:1,orden_leccion:1},{id:2,nombre:'Segunda clase',etapa_id:1,orden_leccion:2}]};
 const calls=[];
 await page.addInitScript(()=>{sessionStorage.setItem('session','fixture');sessionStorage.setItem('user',JSON.stringify({role:'teacher'}))});
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;let value;
  if(path==='/api/config')value={preview:false,authReady:true};
  else if(path==='/api/students')value=[];
  else if(path==='/api/catalog')value=data;
  else if(path==='/api/catalog/reorder'){
   const body=route.request().postDataJSON();calls.push(body);
   const [table,key]=({levels:['niveles','orden_nivel'],stages:['etapas','orden_etapa'],lessons:['lecciones','orden_leccion']})[body.kind];
   body.ids.forEach((id,i)=>{data[table].find(r=>r.id===id)[key]=i+1});value={ok:true};
  }else throw new Error(path);
  await route.fulfill({json:value});
 });
 await page.goto('/');await page.getByRole('button',{name:'Biblioteca de clases',exact:true}).click();await page.getByText('Organizar biblioteca',{exact:true}).click();
 await page.getByRole('button',{name:'Arrastrar A2',exact:true}).dragTo(page.locator('.catalog-levels [data-sort-id="1"]'));
 await expect(page.getByRole('status')).toHaveText('Orden guardado.');expect(calls.at(-1).ids).toEqual([2,1]);
 await page.locator('.catalog-levels').getByRole('button',{name:/A1.*etapas/}).click();
 await page.getByRole('button',{name:'Arrastrar Viajes',exact:true}).dragTo(page.locator('.catalog-stages [data-sort-id="1"]'));
 await expect(page.getByRole('status')).toHaveText('Orden guardado.');expect(calls.at(-1)).toMatchObject({kind:'stages',parent_id:1,ids:[2,1]});
 await page.locator('.catalog-stages').getByRole('button',{name:/Saludos.*clases/}).click();
 await page.getByRole('button',{name:'Arrastrar Segunda clase',exact:true}).dragTo(page.locator('.catalog-lesson[data-sort-id="1"]'));
 await expect(page.getByRole('status')).toHaveText('Orden guardado.');expect(calls.at(-1)).toMatchObject({kind:'lessons',parent_id:1,ids:[2,1]});
 await expect(page.getByRole('button',{name:'Editar clase',exact:true}).first()).toHaveAttribute('title','Editar clase');
 await page.reload();await page.getByRole('button',{name:'Biblioteca de clases',exact:true}).click();await page.getByText('Organizar biblioteca',{exact:true}).click();
 await expect(page.locator('.catalog-levels .catalog-sortable').first()).toHaveAttribute('data-sort-id','2');
 await page.locator('.catalog-levels').getByRole('button',{name:/A1.*etapas/}).click();await expect(page.locator('.catalog-stages .catalog-sortable').first()).toHaveAttribute('data-sort-id','2');
 await page.locator('.catalog-stages').getByRole('button',{name:/Saludos.*clases/}).click();await expect(page.locator('.catalog-lesson').first()).toHaveAttribute('data-sort-id','2');
 await page.getByRole('button',{name:'Arrastrar Segunda clase',exact:true}).focus();await page.keyboard.press('ArrowDown');await expect(page.getByRole('status')).toHaveText('Orden guardado.');expect(calls.at(-1).ids).toEqual([1,2]);
});

