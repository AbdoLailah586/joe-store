import type {Product} from '../types';
// An explicit public projection: credentials, costs, original inventory rows,
// personal data and hidden products never enter the offline catalog database.
const fields = ['id','sku','asin','model_name','catalog_status','image_is_illustrative','data_sources','name_ar','name_en','brand','category','condition','battery_health','storage','color_ar','color_en','color_hex','available_colors','available_storages','price','original_price','discount_percentage','stock','recorded_stock','recorded_images','in_stock','images','description_ar','description_en','specs','warranty_months','rating','reviews_count','is_featured','is_flash_sale','is_best_seller','is_active','created_at','about_item','quick_specs','feature_banners','frequently_bought_together','rating_breakdown','customer_reviews','model_variants'] as const;
export type CatalogSnapshot = {version:1; savedAt:number; products:Product[]};
export const deviceIsOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;
export function publicCatalog(products: Product[]): Product[] {
  return products.filter(p => p && typeof p.id==='string' && typeof p.name_ar==='string' && p.is_active!==false && Number.isFinite(p.price)).map(p => {
    const result:any = Object.fromEntries(fields.filter(key=>p[key]!==undefined).map(key=>[key,p[key]]));
    for (const key of ['specs','quick_specs']) if(result[key]) result[key]=Object.fromEntries(Object.entries(result[key]).filter(([name,value])=>!name.startsWith('__')&&typeof value==='string'));
    return result;
  });
}
function openCatalog(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    if (typeof indexedDB==='undefined') {reject(new Error('Offline storage unavailable'));return}
    const request=indexedDB.open('joe-store-public-catalog',1);
    let timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;reject(new Error('Offline storage busy'))},2500);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('catalog'))request.result.createObjectStore('catalog')};
    request.onerror=()=>{clearTimeout(timer);reject(request.error)};
    request.onsuccess=()=>{clearTimeout(timer);if(timedOut)request.result.close();else resolve(request.result)};
  });
}
export async function saveOfflineCatalog(products: Product[]): Promise<boolean> {
  let db:IDBDatabase;
  try {
    const saved=publicCatalog(products);if(!saved.length)return false;
    db=await openCatalog();
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction('catalog','readwrite');
      tx.objectStore('catalog').put({version:1,savedAt:Date.now(),products:saved},'public-v1');
      tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error);
    });return true;
  }catch{return false}finally{db?.close()}
}
export async function readOfflineCatalog(): Promise<CatalogSnapshot|null> {
  let db:IDBDatabase;
  try {
    db=await openCatalog();
    const snapshot:any=await new Promise((resolve,reject)=>{
      const tx=db.transaction('catalog','readonly'), request=tx.objectStore('catalog').get('public-v1');
      request.onsuccess=()=>resolve(request.result);request.onerror=tx.onabort=()=>reject(request.error||tx.error);
    });
    if(snapshot?.version!==1||!Number.isFinite(snapshot.savedAt)||!Array.isArray(snapshot.products))return null;
    const products=publicCatalog(snapshot.products);return products.length?{version:1,savedAt:snapshot.savedAt,products}:null;
  }catch{return null}finally{db?.close()}
}
