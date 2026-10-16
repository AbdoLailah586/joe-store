import storeHandler from './store.js';
export default async function handler(req,res) {
  let body;
  try {body=typeof req.body==='string'?JSON.parse(req.body):req.body||{}} catch {return res.status(400).json({error:'Invalid JSON'})}
  req.body={method:'setupTotp',args:[body.userId]};
  return storeHandler(req,res);
}
