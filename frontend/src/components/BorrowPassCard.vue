<script setup lang="ts">
import type { BorrowDetail, RequestStatus } from '@/types/models'
import { formatApiDateTime } from '@/utils/dateTime'

defineProps<{ record: BorrowDetail }>()

const STATUS_TEXT: Record<RequestStatus, string> = {
  pending: '待审核', approved: '已通过', borrowing: '借用中',
  return_pending: '待归还确认', returned: '已归还', rejected: '已拒绝', cancelled: '已取消'
}
</script>

<template>
  <article class="pass">
    <header>
      <p>NEW MEDIA CENTER / EQUIPMENT PASS</p>
      <strong>BORROW</strong>
      <i></i>
    </header>
    <section class="pass-body">
      <div class="order">
        <span>WORK ORDER / 工单号</span>
        <b>{{ record.work_order_no }}</b>
      </div>
      <div class="equipment">
        <h2>{{ record.equipment_name }}</h2>
        <p>{{ record.equipment_category }}</p>
      </div>
      <dl>
        <div><dt>BORROWER / 借用人</dt><dd>{{ record.user_name }} · {{ record.user_student_id }}</dd></div>
        <div><dt>FROM / 借用时间</dt><dd>{{ formatApiDateTime(record.borrow_time) }}</dd></div>
        <div><dt>UNTIL / 归还时间</dt><dd>{{ formatApiDateTime(record.return_time) }}</dd></div>
        <div><dt>STATUS / 状态</dt><dd>{{ STATUS_TEXT[record.status] }}</dd></div>
      </dl>
      <div class="purpose"><span>PURPOSE / 用途</span><p>{{ record.reason }}</p></div>
      <footer>现场核验请对照系统中的实时工单记录</footer>
    </section>
  </article>
</template>

<style scoped>
.pass { background: var(--bg-card); border: 1px solid var(--text); color: var(--text); max-width: 700px; margin: 0 auto; box-shadow: 8px 9px 0 rgba(25,45,61,.14); }
header { background: var(--bg-sidebar); color: var(--bg-card); padding: 25px 30px 28px; }header p { margin: 0 0 20px; font: 700 9px/1 var(--font-ui); letter-spacing: .2em; }header strong { display: block; font: 500 clamp(50px, 9vw, 84px)/.85 Georgia, var(--font); }header i { display: block; width: 35%; height: 5px; background: var(--accent-on-dark); margin-top: 25px; }
.pass-body { padding: 27px 30px 30px; }.order span,.purpose span { display: block; color: var(--accent); font: 700 9px/1 var(--font-ui); letter-spacing: .16em; }.order b { display: block; margin-top: 9px; font: 500 27px/1 Georgia, serif; }.equipment { border-block: 1px solid var(--text); padding: 22px 0 18px; margin: 24px 0; }.equipment h2 { margin: 0; font: 500 clamp(34px, 6vw, 58px)/1 var(--font); }.equipment p { margin: 10px 0 0; color: var(--accent); font: 700 10px/1 var(--font-ui); letter-spacing: .15em; text-transform: uppercase; }
dl { display: grid; grid-template-columns: 1fr 1fr; gap: 0 30px; margin: 0; }dl div { padding: 11px 0; border-bottom: 1px solid var(--border); }dt { color: var(--text-secondary); font: 700 9px/1 var(--font-ui); letter-spacing: .1em; }dd { margin: 7px 0 0; font: 500 15px/1.3 var(--font-ui); }.purpose { margin-top: 24px; padding: 18px; background: var(--bg-hover); }.purpose p { margin: 10px 0 0; line-height: 1.65; }footer { margin-top: 24px; border: 1px solid var(--accent); color: var(--accent); padding: 12px; text-align: center; font: 700 11px/1.4 var(--font-ui); letter-spacing: .05em; }
@media (max-width: 560px) { .pass-body,header { padding-inline: 20px; }dl { grid-template-columns: 1fr; } }
</style>
