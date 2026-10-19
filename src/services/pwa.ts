type InstallPrompt = Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
type State = {installable:boolean;installed:boolean;updateReady:boolean;offlineReady:boolean};
let state:State={installable:false,installed:false,updateReady:false,offlineReady:false};
let deferred:InstallPrompt|null=null, registration:ServiceWorkerRegistration|null=null, started=false, reloadRequested=false;
const listeners=new Set<()=>void>();
function publish(change:Partial<State>){state={...state,...change};listeners.forEach(fn=>fn())}
export const pwaSnapshot=()=>state;
export const subscribePwa=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn)}};
export function initPwa(registerWorker:boolean) {
  if(started||typeof window==='undefined')return;started=true;
  const media=window.matchMedia('(display-mode: standalone)'), overlay=window.matchMedia('(display-mode: window-controls-overlay)');
  const installed=()=>media.matches||overlay.matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;
  publish({installed:installed()});
  const onDisplay=()=>publish({installed:installed()});
  media.addEventListener?.('change',onDisplay);overlay.addEventListener?.('change',onDisplay);
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event as InstallPrompt;publish({installable:true})});
  window.addEventListener('appinstalled',()=>{deferred=null;publish({installed:true,installable:false})});
  if(!registerWorker||!('serviceWorker' in navigator))return;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloadRequested)window.location.reload()});
  void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(reg=>{
    registration=reg;
    if(reg.waiting&&navigator.serviceWorker.controller)publish({updateReady:true});
    const watchInstalling=()=>{
      const worker=reg.installing;
      const changed=()=>{
        if(worker.state==='installed'&&navigator.serviceWorker.controller)publish({updateReady:true});
      };
      if(worker){worker.addEventListener('statechange',changed);changed()}
    };
    reg.addEventListener('updatefound',watchInstalling);
    watchInstalling();
    void navigator.serviceWorker.ready.then(()=>publish({offlineReady:true}));
  }).catch(()=>{/* Site browsing remains available when worker/storage access is blocked. */});
}
export async function promptInstall():Promise<'accepted'|'dismissed'|'unavailable'> {
  if(!deferred)return 'unavailable';
  const event=deferred;deferred=null;publish({installable:false});
  try{await event.prompt();return(await event.userChoice).outcome}catch{return 'unavailable'}
}
export function applyPwaUpdate(){reloadRequested=true;if(registration?.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});else window.location.reload()}
