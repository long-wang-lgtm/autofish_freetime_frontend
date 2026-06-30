# 筛选栏重布局 & 表头排序融合

> 2026-06-30 | 前端商品管理页

## 目标

1. 桌面端筛选栏从三行压缩为一行三区
2. 排序从胶囊按钮迁移到表格列头点击
3. 删除无对应列的排序字段

## 桌面端 Filter Bar 布局

### Before（三行）
```
Row 1: [账号▾] [商品状态▾]            [清空筛选] [刷新]
Row 2: [+添加条件] [芯片1] [芯片2] ...
Row 3: 排序 [标题] [价格] [发布时间] [浏览] [想要] [收藏] [发货方式]
```

### After（一行三区）
```
[🔄 刷新商品]  [账号▾] [状态▾] [+添加条件] [芯片...]   [清空筛选]
   左区                  中区 (flex-1 wrap)              右区
```

## 表头排序

表头「商品信息」「价格」「发布时间」变为可点击按钮，三态循环：

| 点击次数 | 状态 | 视觉 |
|---------|------|------|
| 0 | 未激活 | 灰色 `↕` |
| 1 | 降序 | 蓝色 `↓` |
| 2 | 升序 | 蓝色 `↑` |
| 3 | 取消 | 回到未激活 |

## ITEM_SORT_FIELDS 变更

```ts
// Before (8 fields)
{ key: "gid", label: "商品ID" },
{ key: "title", label: "标题" },
{ key: "price", label: "价格" },
{ key: "lookCount", label: "浏览" },
{ key: "wantCount", label: "想要" },
{ key: "collectCount", label: "收藏" },
{ key: "publishTime", label: "发布时间" },
{ key: "deliveryType", label: "发货方式" },

// After (3 fields)
{ key: "title", label: "标题" }, # 商品信息
{ key: "price", label: "价格" },
{ key: "publishTime", label: "发布时间" },
```

## 文件改动

| 文件 | 改动 |
|------|------|
| `lib/api/items.ts` | ITEM_SORT_FIELDS 缩减 |
| `components/items/parts/ItemsFilterBarDesktop.tsx` | 三区一行布局，删除排序行和 SortChip |
| `components/items/ItemsTab.tsx` | 表头 3 列可点击排序，新增 orderBy/asc/onSortChange props |
| `app/dashboard/items/page.tsx` | ItemsTab 透传排序相关 props |

移动端 `ItemsFilterBarMobile.tsx` 无需改动 — 其排序胶囊行自动跟随 ITEM_SORT_FIELDS 缩减。
