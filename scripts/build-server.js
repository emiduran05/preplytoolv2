import {build} from 'esbuild';

// Bundle CommonJS and ESM dependencies together so sanitization never requires
// an ESM-only npm package through the hosting runtime's require() hook.
await build({
 entryPoints:['server/index.js'],
 outfile:'server/.generated/app.mjs',
 bundle:true,
 platform:'node',
 format:'esm',
 target:'node24',
 external:['pg-native'],
 banner:{js:"import { createRequire as bundledCreateRequire } from 'node:module'; const require = bundledCreateRequire(import.meta.url);"},
 logLevel:'info'
});
