<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'

interface PrecautionItem {
  title: string
  desc: string
}

const borrowingRules: PrecautionItem[] = [
  {
    title: '实名借用',
    desc: '借用设备需使用本人学号登记，禁止代借、转借他人使用。'
  },
  {
    title: '提前申请',
    desc: '请至少提前 1 个工作日提交借用申请，待管理员审批通过后方可领取设备。'
  },
  {
    title: '按时归还',
    desc: '请在申请的归还时间之前归还设备；如需延期，请提前提交延期申请。'
  },
  {
    title: '妥善保管',
    desc: '借用期间请妥善保管设备，避免磕碰、进水、摔落等损坏，自行承担因人为原因造成的维修费用。'
  },
  {
    title: '原状归还',
    desc: '归还时设备应保持完好、配件齐全；管理员核验无误后方可完成归还确认。'
  },
  {
    title: '损坏报备',
    desc: '设备如在使用中出现故障或损坏，请第一时间联系管理员并如实说明情况。'
  }
]

const liabilityRules: PrecautionItem[] = [
  {
    title: '遗失赔偿',
    desc: '设备遗失的，需按设备原价或重置价格进行赔偿。'
  },
  {
    title: '损坏赔偿',
    desc: '人为损坏的，需承担相应维修费用；无法修复的按遗失处理。'
  },
  {
    title: '逾期处理',
    desc: '逾期未归还且未提交延期申请的，将暂停借用权限并通知所在部门。'
  }
]
</script>

<template>
  <AppLayout>
    <div class="page">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">注意事项</h1>
        <p class="page-desc">借用设备前请仔细阅读以下须知，规范使用、按时归还。</p>
      </div>

      <!-- 借用须知 -->
      <section class="section">
        <h2 class="section-title">借用须知</h2>
        <div class="rule-list">
          <div v-for="(rule, i) in borrowingRules" :key="i" class="rule-card">
            <div class="rule-index">{{ i + 1 }}</div>
            <div class="rule-body">
              <h3 class="rule-title">{{ rule.title }}</h3>
              <p class="rule-desc">{{ rule.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 赔偿说明 -->
      <section class="section">
        <h2 class="section-title">赔偿说明</h2>
        <div class="rule-list">
          <div v-for="(rule, i) in liabilityRules" :key="i" class="rule-card">
            <div class="rule-index rule-index--warn">!</div>
            <div class="rule-body">
              <h3 class="rule-title">{{ rule.title }}</h3>
              <p class="rule-desc">{{ rule.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 提示 -->
      <div class="notice">
        <span class="notice-icon">⚠️</span>
        <span class="notice-text">
          如有疑问请联系新媒体中心设备管理员，最终解释权归新媒体中心所有。
        </span>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 28px;
  padding: 22px 0 28px;
  border-top: 1px solid var(--text);
  border-bottom: 1px solid var(--text);
}
.page-header::before {
  content: 'FIELD NOTES / USAGE GUIDE';
  display: block;
  margin-bottom: 26px;
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
}

.page-title {
  font-size: clamp(46px, 5vw, 70px);
  font-weight: 500;
  line-height: 0.94;
  letter-spacing: -0.055em;
  color: var(--text);
  margin-bottom: 8px;
}

.page-desc {
  color: var(--text-secondary);
  font-size: 14px;
  font-family: var(--font-ui);
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 3px solid var(--accent);
}

.rule-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.rule-card {
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 1px;
  transition: box-shadow var(--transition), transform var(--transition);
}

.rule-card:hover {
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

.rule-index {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 0;
  background: var(--accent-light);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 14px;
}

.rule-index--warn {
  background: var(--warning-bg);
  color: var(--warning);
}

.rule-body {
  min-width: 0;
}

.rule-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.rule-desc {
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  background: var(--warning-bg);
  border-radius: var(--radius);
  border: 1px solid transparent;
}

.notice-icon {
  font-size: 18px;
  line-height: 1.4;
  flex-shrink: 0;
}

.notice-text {
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
