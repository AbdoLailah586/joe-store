import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const sharp=(await import(process.env.PWA_SHARP_MODULE?pathToFileURL(process.env.PWA_SHARP_MODULE).href:'sharp')).default;
fs.mkdirSync('public/pwa',{recursive:true});
for(const [file,size,content] of [['icon-192.png',192,168],['icon-512.png',512,448],['maskable-512.png',512,280]]){
 const logo=await sharp('public/logo-icon.png').resize(content,content,{fit:'inside'}).png().toBuffer();
 await sharp({create:{width:size,height:size,channels:4,background:'#0f172a'}}).composite([{input:logo,gravity:'centre'}]).png().toFile('public/pwa/'+file);
}
console.log('Three install icons generated from the existing JOE Store logo.');
