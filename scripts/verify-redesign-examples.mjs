// Local-only design QA. Never publish the illustrative project fixtures.
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import process from 'node:process';
import console from 'node:console';
if(process.env.CI||process.env.VERCEL)throw new Error('Local QA only.');
const files=['exemple-villa','exemple-terrasse'].map(slug=>`src/content/projects/${slug}/index.md`);
const originals=await Promise.all(files.map(file=>readFile(file,'utf8')));
if(originals.some(source=>!source.includes('"status": "draft"')))throw new Error('Expected draft examples.');
function run(command,args,env={}){
 const result=spawnSync(command,args,{stdio:'inherit',shell:process.platform==='win32',env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1',...env}});
 if(result.status!==0)throw new Error(`${command} ${args.join(' ')} failed`);
}
try{
 for(const [i,file] of files.entries())await writeFile(file,originals[i].replace('"status": "draft"','"status": "published"'));
 run('pnpm',['build']);
 run('pnpm',['exec','playwright','test','tests/projects.spec.ts','tests/seo.spec.ts','tests/a11y.spec.ts','--project=chromium','--workers=2'],{PROJECT_EXAMPLES:'1',AXE_REPORT:'artifacts/phase-6c/axe-examples'});
 run('node',['scripts/audit-redesign.ts','examples','--examples','--lighthouse']);
 run('node',['scripts/audit-redesign-contrast.ts']);
 console.log('Populated project pages, SEO, axe, screenshots, Lighthouse and contrast captured.');
}finally{
 for(const [i,file]of files.entries())await writeFile(file,originals[i]);
 run('pnpm',['build']);
 console.log('Draft fixtures and final safe build restored.');
}
