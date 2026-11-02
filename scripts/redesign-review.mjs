import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import process from 'node:process';
import {Buffer} from 'node:buffer';
const label=process.argv[2]??'examples';
const directory=`artifacts/phase-6c/${label}`;
await mkdir(`${directory}/review`,{recursive:true});
const widths=[1440,1024,768,390];
const pages=['home','services','grid','story','terrace','contact','legal','privacy','thanks','notfound'];
for(const locale of ['fr','ar'])for(const name of pages){
 const panels=[];let maxHeight=0;
 for(const [index,width]of widths.entries()){
  const original=await sharp(`${directory}/${name}-${locale}-${width}.png`).resize({width:300,height:2000,fit:'inside'}).png().toBuffer({resolveWithObject:true});
  maxHeight=Math.max(maxHeight,original.info.height);
  const title=Buffer.from(`<svg width="300" height="36"><rect width="300" height="36" fill="#153829"/><text x="12" y="24" fill="white" font-family="Arial" font-size="16">${name} / ${locale} / ${width}px</text></svg>`);
  panels.push({input:title,left:index*304,top:0},{input:original.data,left:index*304,top:40});
 }
 await sharp({create:{width:1216,height:maxHeight+40,channels:3,background:'#EDE6D6'}}).composite(panels).png().toFile(`${directory}/review/${name}-${locale}.png`);
}
// The four approved comparisons put the original next to the port at the same
// actual viewport, without altering either screenshot.
for(const locale of ['fr','ar'])for(const width of [1440,390]){
 const input=[`artifacts/phase-6c/reference/${locale}-${width}-hero.png`,`${directory}/home-${locale}-${width}-hero.png`];
 await sharp({create:{width:width*2,height:900,channels:3,background:'white'}}).composite(await Promise.all(input.map(async(path,index)=>({input:await sharp(path).png().toBuffer(),left:index*width,top:0})))).png().toFile(`${directory}/review/compare-${locale}-${width}.png`);
}
await writeFile(`${directory}/review/index.txt`,pages.flatMap(name=>['fr','ar'].map(locale=>`${name}-${locale}.png`)).join('\n'));
