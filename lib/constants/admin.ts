/** 管理员角色标识，从环境变量读取，默认 'administrators' */
export const ADMIN_ROLE = process.env.NEXT_PUBLIC_ADMIN_ROLE

/** 判断给定角色是否为管理员 */
export function isAdminRole(role: string | undefined | null): boolean {
  return role === ADMIN_ROLE
}
