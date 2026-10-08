import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
const channel=process.env.AULA_TEST_BROWSER||(existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')?'msedge':undefined);
export default defineConfig({testDir:'./tests/browser',timeout:45000,workers:1,use:{baseURL:'http://127.0.0.1:5179',channel,headless:true,viewport:{width:1440,height:1000},screenshot:'only-on-failure'},webServer:{command:'npm run dev:client -- --port 5179 --strictPort',url:'http://127.0.0.1:5179',reuseExistingServer:false,timeout:30000}});
