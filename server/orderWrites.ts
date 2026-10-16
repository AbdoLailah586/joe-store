import { formatDeliveryAddress, encodeDeliveryNotes } from '../src/utils/deliveryAddress.js';
export async function saveOrder(sql:any,order:any) {
  const rows=await sql.query(`WITH payload AS (SELECT $1::jsonb AS o),
    request AS (SELECT i->'product'->>'id' AS id, SUM((i->>'quantity')::int) AS quantity,
      MIN((i->'product'->>'price')::numeric) AS quoted_price
      FROM payload, jsonb_array_elements(o->'items') i GROUP BY i->'product'->>'id'),
    locked AS (SELECT p.id,p.price,p.stock_quantity,p.is_active,r.quantity,r.quoted_price FROM products p JOIN request r ON r.id=p.id FOR UPDATE OF p),
    inserted AS (INSERT INTO orders (id,order_number,customer_id,customer_name,customer_phone,customer_email,governorate,address,notes,items,subtotal,shipping_fee,total,payment_method,payment_status,status)
      SELECT o->>'id',o->>'order_number',o->>'customer_email',o->>'customer_name',o->>'customer_phone',o->>'customer_email',o->>'governorate',$2,$3,o->'items',
        (o->>'subtotal')::numeric,(o->>'shipping_fee')::numeric,(o->>'total')::numeric,o->>'payment_method','unpaid','pending'
      FROM payload WHERE (SELECT COUNT(*) FROM locked)=(SELECT COUNT(*) FROM request)
        AND NOT EXISTS(SELECT 1 FROM locked WHERE is_active IS NOT TRUE OR price<=0 OR price<>quoted_price OR quantity<=0 OR stock_quantity<quantity)
      ON CONFLICT(id) DO NOTHING RETURNING id),
    adjusted AS (UPDATE products p SET stock_quantity=p.stock_quantity-r.quantity,updated_at=NOW() FROM request r
      WHERE p.id=r.id AND EXISTS(SELECT 1 FROM inserted) RETURNING p.id)
    SELECT id FROM inserted`,[JSON.stringify(order),formatDeliveryAddress(order),encodeDeliveryNotes(order)]);
  return rows.length===1;
}
export async function cancelOrder(sql:any,id:string,reason:string,by:string) {
  const rows=await sql.query(`WITH cancelled AS (UPDATE orders SET status='cancelled',cancellation_reason=$2,cancelled_by=$3,cancelled_at=NOW(),updated_at=NOW()
    WHERE (id=$1 OR order_number=$1) AND status<>'cancelled' RETURNING id,items),
    quantities AS (SELECT COALESCE(i->'product'->>'id',i->>'product_id') AS id,SUM((i->>'quantity')::int) AS quantity FROM cancelled,jsonb_array_elements(items) i GROUP BY 1),
    adjusted AS (UPDATE products p SET stock_quantity=p.stock_quantity+q.quantity,updated_at=NOW() FROM quantities q WHERE p.id=q.id RETURNING p.id)
    SELECT id FROM cancelled`,[id,reason,by]);
  if(rows.length)return true;
  const current=await sql`SELECT status FROM orders WHERE id=${id} OR order_number=${id} LIMIT 1`;
  return current[0]?.status==='cancelled';
}
