/**
 * 管理员 API — 统一入口
 *
 * 按业务领域拆分：
 * - dashboard  — 仪表盘统计、IM 状态 SSE
 * - accounts   — 店铺管理、IM 控制、代理绑定
 * - users      — 用户管理、用户代理绑定
 * - proxy      — 代理 CRUD、绑定查询
 */

// ===== 类型导出 =====
export type {
  UserSimple,
  ProxyLong,
  AccountName,
  AccountFull,
  AccountStatusListResponse,
} from './types'

export type {
  DashboardStats,
  TrendItem,
  AccountByUserItem,
  DashboardData,
  ImStatusSnapshot,
} from './dashboard'

export type { AdminUserInfo, MembershipPlanSimple } from './users'

export type {
  ProxySourceItem,
  ProxyFormData,
} from './proxy'

export type {
  MembershipPlan,
  FeaturePricing,
  StoneSalePricing,
  StoneOrder,
  MembershipOrder,
} from './billing'

// ===== API 函数导出 =====
export {
  getDashboard,
  subscribeImStatus,
} from './dashboard'

export {
  getAccountList,
  startIm,
  stopIm,
  bindAccountProxy,
} from './accounts'

export {
  getUserList,
  getUserProxies,
  getBindableProxies,
  bindUserProxy,
  unbindUserProxy,
  upgradeMembership,
  downgradeMembership,
  renewMembership,
  rechargeStones,
} from './users'

export {
  getProxyList,
  getProxyBindings,
  getProxySources,
  getProxyStatuses,
  createProxy,
  updateProxy,
  deleteProxy,
  activeProxy,
  closeProxy,
} from './proxy'

export {
  getMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  getFeaturePricingList,
  createFeaturePricing,
  updateFeaturePricing,
  deleteFeaturePricing,
  getStonePrices,
  createStonePrice,
  updateStonePrice,
  deleteStonePrice,
  getMembershipOrders,
  getStoneOrders,
} from './billing'

// ===== 聚合 API 对象 =====
import * as dashboard from './dashboard'
import * as accounts from './accounts'
import * as users from './users'
import * as proxy from './proxy'
import * as billing from './billing'

export const adminApi = {
  // Dashboard
  getDashboard: dashboard.getDashboard,

  // Accounts
  getAccountList: accounts.getAccountList,
  startIm: accounts.startIm,
  stopIm: accounts.stopIm,
  bindAccountProxy: accounts.bindAccountProxy,

  // Users
  getUserList: users.getUserList,
  getUserProxies: users.getUserProxies,
  getBindableProxies: users.getBindableProxies,
  bindUserProxy: users.bindUserProxy,
  unbindUserProxy: users.unbindUserProxy,
  upgradeMembership: users.upgradeMembership,
  downgradeMembership: users.downgradeMembership,
  renewMembership: users.renewMembership,
  rechargeStones: users.rechargeStones,

  // Proxy
  getProxyList: proxy.getProxyList,
  getProxyBindings: proxy.getProxyBindings,
  getProxySources: proxy.getProxySources,
  getProxyStatuses: proxy.getProxyStatuses,
  createProxy: proxy.createProxy,
  updateProxy: proxy.updateProxy,
  deleteProxy: proxy.deleteProxy,
  activeProxy: proxy.activeProxy,
  closeProxy: proxy.closeProxy,

  // Billing
  getMembershipPlans: billing.getMembershipPlans,
  createMembershipPlan: billing.createMembershipPlan,
  updateMembershipPlan: billing.updateMembershipPlan,
  getFeaturePricingList: billing.getFeaturePricingList,
  createFeaturePricing: billing.createFeaturePricing,
  updateFeaturePricing: billing.updateFeaturePricing,
  deleteFeaturePricing: billing.deleteFeaturePricing,
  getStonePrices: billing.getStonePrices,
  createStonePrice: billing.createStonePrice,
  updateStonePrice: billing.updateStonePrice,
  deleteStonePrice: billing.deleteStonePrice,
  getMembershipOrders: billing.getMembershipOrders,
  getStoneOrders: billing.getStoneOrders,
}
