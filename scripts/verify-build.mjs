import fs from 'node:fs/promises';
import path from 'node:path';
if(!process.argv[2])throw Error('Usage: node scripts/verify-build.mjs BUILD_DIRECTORY');
const root=path.resolve(process.argv[2]);
const htmlFiles=[];
const walk=async dir=>{for(const entry of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);else if(p.endsWith('.html'))htmlFiles.push(p)}};
await walk(root);
const failures=[];
let checked=0;
for(const file of htmlFiles){
 const html=await fs.readFile(file,'utf8');
 for(const match of html.matchAll(/\b(?:href|src)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)){
  const value=match[1]??match[2]??match[3];
  if(!value||value.startsWith('#')||/^(https?:|mailto:|data:)/.test(value))continue;
  const sourceUrl=new URL('https://example.github.io/vgc-notes/'+path.relative(root,file).replaceAll('\\','/').replace(/index\.html$/,''));
  const resolved=new URL(value,sourceUrl);
  if(!resolved.pathname.startsWith('/vgc-notes/')){failures.push(`${file}: bad base path ${value}`);continue}
  let relative=decodeURIComponent(resolved.pathname.replace('/vgc-notes/',''));
  if(relative.endsWith('/')||!relative)relative+='index.html';
  try{await fs.access(path.join(root,relative));checked++}catch{failures.push(`${file}: ${value}`)}
 }
}
if(failures.length)throw new Error(failures.join('\n'));
const home=await fs.readFile(path.join(root,'index.html'),'utf8');
const cards=(home.match(/data-article(?:[\s=>])/g)??[]).length;
const cardLinks=[...home.matchAll(/data-article[\s\S]*?<a href="([^"]+)"/g)].map(m=>m[1]);
if(cards<12||new Set(cardLinks).size!==cards)throw new Error('Missing or duplicate article cards');
console.log(`OK: ${htmlFiles.length} HTML pages, ${checked} local links/assets, ${cards} article cards; project subpath works.`);
