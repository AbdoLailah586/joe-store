// Temporary isolated browser QA: real components, synthetic users, no live API writes.
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
const root=process.cwd();
const entry=`import React from 'react';import{createRoot}from'react-dom/client';import{AdminShell,adminSections}from'./src/pages/admin/AdminShell';import{CoverFinder}from'./src/pages/admin/CoverFinder';import{UsersTab}from'./src/pages/admin/UsersTab';import{useAuth}from'qa:auth';import './src/index.css';
function Preview(){let[section,setSection]=React.useState('covers');let auth=useAuth();return <AdminShell active={section} allowed={auth.adminSections} onChange={setSection} onVisit={()=>{}} name="حساب اختبار محلي">{section==='covers'?<CoverFinder/>:section==='users'?<UsersTab/>:<p>اختبار محلي للأقسام الجديدة</p>}</AdminShell>}createRoot(document.getElementById('root')).render(<Preview/>);`;
const fixture=`export const user={id:'qa-local-admin',name:'حساب اختبار',email:'qa@example.invalid',role:'admin',provider:'email',addresses:[],admin_permissions:[]};
export const useAuth=()=>({user,isAdmin:true,canAccessAdmin:true,adminSections:['covers','users'],canAccessSection:k=>['covers','users'].includes(k)});`;
const data=`let overrides={};let users=[{id:'qa-staff',name:'مستخدم تجريبي — غير حقيقي',email:'staff@example.invalid',role:'customer',provider:'google',addresses:[],admin_permissions:['screens'],created_at:'2026-10-16'}];export const neonDb={getAllUsers:async()=>users,updateUserAccess:async(id,value)=>{users=users.map(u=>u.id===id?{...u,role:value.role,admin_permissions:value.permissions}:u);return{success:true,user:users.find(u=>u.id===id)}},getCoverOverrides:async()=>overrides,saveCoverOverride:async(id,value)=>{overrides[id]=value;return{success:true}}};`;
await build({stdin:{contents:entry,loader:'tsx',resolveDir:root},outfile:'.qa-admin.js',bundle:true,format:'esm',plugins:[{name:'isolated-qa',setup(b){
 b.onResolve({filter:/^qa:/},a=>({path:a.path,namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},a=>({contents:a.path==='qa:auth'?fixture:data,loader:'js'}));
 b.onLoad({filter:/[\\/]src[\\/]pages[\\/]admin[\\/](CoverFinder|UsersTab)\.tsx$/},a=>({contents:fs.readFileSync(a.path,'utf8').replace(/from ['"]\.\.\/\.\.\/context\/AuthContext['"]/g,"from 'qa:auth'").replace(/from ['"]\.\.\/\.\.\/services\/neonDb['"]/g,"from 'qa:db'"),loader:'tsx',resolveDir:path.dirname(a.path)}));
}}]});
fs.writeFileSync('.qa-admin.html','<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><link rel="stylesheet" href="/src/index.css"><body><div style="background:#fff4cf;padding:8px;text-align:center;font:14px Arial">اختبار محلي ببيانات مستخدم وهمي؛ لا يتم تعديل أي حساب حقيقي.</div><div id="root"></div><script type="module" src="/.qa-admin.js"></script></body></html>');
console.log('Isolated UI preview ready at /.qa-admin.html');
