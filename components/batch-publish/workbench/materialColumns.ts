import type { NativeTableColumn } from '@/components/ui/data/NativeTable'
import type { PublishMaterial } from '@/lib/api/batch-publish'

/**
 * 素材创作表格列定义——表头（NativeTable）与表行（MaterialTableRow）的列顺序、宽度、对齐均由此单一来源控制。
 * 工作台（按监控商品 souItem gid 维度）与草稿箱（全量未发布素材）共用。
 */
export const MATERIAL_COLUMNS: NativeTableColumn<PublishMaterial>[] = [
  { key: 'checkbox', width: '3%',  align: 'center', header: ' ' },
  { key: 'cover',    width: '10%', align: 'center', header: '封面' },
  { key: 'desc',     align: 'left', header: '描述' },        // 弹性——与 prompt 平分剩余宽度
  { key: 'prompt',   align: 'left', header: '封面提示词' },  // 弹性——与 desc 平分剩余宽度
  { key: 'price',    width: '7%',  align: 'center', header: '价格' },
  { key: 'account',  width: '9%',  align: 'center', header: '账号' },
  { key: 'category', width: '9%',  align: 'center', header: '类目' },
  { key: 'progress', width: '10%', align: 'center', header: '进度/操作' },
  { key: 'delete',   width: '4%',  align: 'center', header: '删除' },
]
