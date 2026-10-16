import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const sharp=(await import(process.env.COVER_SHARP_MODULE?pathToFileURL(process.env.COVER_SHARP_MODULE).href:'sharp')).default;
const source=process.argv[2];
if(!source)throw new Error('Pass the covers source folder.');
const files=fs.readdirSync(source).filter(x=>/\.jpe?g$/i.test(x)).sort();
const labels=JSON.parse(fs.readFileSync('src/data/coverPhotoLabels.json','utf8'));
if(files.length!==labels.length)throw new Error(`Review ${files.length} photographs versus ${labels.length} labels before import.`);
const target='public/cover-images';fs.mkdirSync(target,{recursive:true});
const entries=[];
for(const [index,file] of files.entries()){
 const [model,brand,style,color,label,needs_review=false]=labels[index];
 const filename=file.replace(/\.jpe?g$/i,'.webp'),thumbnail=file.replace(/\.jpe?g$/i,'-thumb.webp');
 // Full frame and label retained. Source files are read only, never modified.
 await sharp(path.join(source,file)).rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).webp({quality:84,effort:4}).toFile(path.join(target,filename));
 await sharp(path.join(source,file)).rotate().resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({quality:77,effort:4}).toFile(path.join(target,thumbnail));
 entries.push({id:`cover-${String(index+1).padStart(3,'0')}`,source_filename:file,filename,thumbnail,model,brand,style,color,label,needs_review,location:'',notes:needs_review?'راجع الملصق والموديل مع القطعة الفعلية.':'الموديل من الملصق الظاهر؛ راجع مطابقة فتحات الكاميرا قبل التسليم.'});
}
fs.writeFileSync('src/data/coverCatalog.json',JSON.stringify({source:'صور covers المقدمة من صاحب المحل',photos:files.length,entries},null,2)+'\n');
console.log(`${entries.length} source photo references imported, ${new Set(entries.map(e=>e.brand+' '+e.model)).size} phone model labels.`);
