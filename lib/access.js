export const ADMIN_SECTIONS = Object.freeze(['overview','analytics','products','inventory','quality','stocktake','reorder','suppliers','orders','fulfillment','support','crm','users','emails','whatsapp','screens','covers','pricing','labels','tools','security','settings']);
export const OWNER_EMAIL = 'abdolailah586@gmail.com';
export function normalizePermissions(value) {
  return Array.isArray(value) ? ADMIN_SECTIONS.filter(key => value.includes(key)) : [];
}
export function isFullAdmin(user) { return !!user && user.role === 'admin'; }
export function permittedSections(user) { return !user ? [] : isFullAdmin(user) ? [...ADMIN_SECTIONS] : normalizePermissions(user.admin_permissions); }
export function canAccessSection(user, section) { return ADMIN_SECTIONS.includes(section) && permittedSections(user).includes(section); }
export function publicUser(row) {
  if (!row) return null;
  const { id,name,email,phone,avatar,role,provider,email_verified,created_at } = row;
  return {id,name,email,phone:phone || '',avatar,role:role === 'admin' ? 'admin':'customer',provider,email_verified,created_at,
    addresses:Array.isArray(row.addresses) ? row.addresses:[],admin_permissions:normalizePermissions(row.admin_permissions)};
}
