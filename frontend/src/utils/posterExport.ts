import type { BorrowDetail, YearbookData } from '@/types/models'
import type { EditorialPoem } from '@/utils/editorialPoetry'
import { formatApiDateTime } from '@/utils/dateTime'

const PAPER = '#f2efe7'
const INK = '#191917'
const ACCENT = '#243fa0'
const TERRACOTTA = '#9d604d'
const GOLD = '#b89a63'

const PASS_STATUS: Record<string, string> = {
  approved: 'APPROVED / 已通过',
  borrowing: 'IN USE / 借用中',
  return_pending: 'RETURN CHECK / 待归还确认',
  returned: 'ARCHIVED / 已归还'
}

function createPoster(width = 1080, height = 1440) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器不支持海报导出')
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.strokeRect(36, 36, width - 72, height - 72)
  return { canvas, ctx }
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png', 1)
  link.click()
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number
) {
  let cursor = x
  for (const char of text) {
    ctx.fillText(char, cursor, y)
    cursor += ctx.measureText(char).width + spacing
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
) {
  const chars = Array.from(text)
  let line = ''
  let lineIndex = 0
  for (let index = 0; index < chars.length; index++) {
    const next = line + chars[index]
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineIndex * lineHeight)
      line = chars[index]
      lineIndex++
      if (lineIndex >= maxLines) return
    } else {
      line = next
    }
  }
  if (lineIndex < maxLines) ctx.fillText(line, x, y + lineIndex * lineHeight)
}

function loadImage(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null)
  return new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

export async function downloadYearbookPoster(
  data: YearbookData,
  poem: EditorialPoem,
  avatarUrl?: string
) {
  const { canvas, ctx } = createPoster()
  ctx.fillStyle = ACCENT
  ctx.fillRect(36, 36, 18, 1368)

  ctx.fillStyle = INK
  ctx.font = '700 22px Arial, sans-serif'
  drawSpacedText(ctx, 'NEW MEDIA CENTER / ANNUAL ARCHIVE', 88, 104, 3)
  ctx.font = '500 210px Georgia, serif'
  ctx.fillText(String(data.year), 78, 312)
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(82, 350); ctx.lineTo(998, 350); ctx.stroke()

  ctx.font = '500 62px Georgia, "Noto Serif SC", serif'
  ctx.fillText(`${data.user_name}的借用年鉴`, 82, 435)
  ctx.fillStyle = '#68665f'
  ctx.font = '500 22px Arial, "Microsoft YaHei", sans-serif'
  ctx.fillText(`STUDENT ID / ${data.student_id}`, 84, 480)

  const avatar = await loadImage(avatarUrl)
  ctx.save()
  ctx.beginPath()
  ctx.arc(916, 422, 58, 0, Math.PI * 2)
  ctx.clip()
  if (avatar) {
    const side = Math.min(avatar.naturalWidth, avatar.naturalHeight)
    const sx = (avatar.naturalWidth - side) / 2
    const sy = (avatar.naturalHeight - side) / 2
    ctx.drawImage(avatar, sx, sy, side, side, 858, 364, 116, 116)
  } else {
    ctx.fillStyle = INK
    ctx.fillRect(858, 364, 116, 116)
    ctx.fillStyle = PAPER
    ctx.textAlign = 'center'
    ctx.font = '500 54px Georgia, serif'
    ctx.fillText(data.user_name.charAt(0) || 'U', 916, 440)
    ctx.textAlign = 'left'
  }
  ctx.restore()
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 5
  ctx.beginPath(); ctx.arc(916, 422, 62, 0, Math.PI * 2); ctx.stroke()

  const stats = [
    ['有效借用', String(data.successful_borrows)],
    ['累计时长', `${data.total_hours}h`],
    ['完成归还', String(data.returned_count)],
    ['准时归还', `${data.on_time_rate}%`]
  ]
  stats.forEach(([label, value], index) => {
    const x = 82 + (index % 2) * 460
    const y = 550 + Math.floor(index / 2) * 155
    ctx.fillStyle = index === 0 ? TERRACOTTA : INK
    ctx.font = '500 74px Georgia, serif'
    ctx.fillText(value, x, y)
    ctx.fillStyle = '#77746c'
    ctx.font = '700 18px Arial, "Microsoft YaHei", sans-serif'
    drawSpacedText(ctx, label, x + 3, y + 36, 3)
  })

  ctx.fillStyle = INK
  ctx.font = '700 18px Arial, sans-serif'
  drawSpacedText(ctx, 'MOST BORROWED / 器材索引', 82, 875, 2)
  ctx.strokeStyle = INK
  ctx.beginPath(); ctx.moveTo(82, 898); ctx.lineTo(998, 898); ctx.stroke()
  const equipment = data.top_equipment.slice(0, 4)
  if (equipment.length) {
    equipment.forEach((item, index) => {
      const y = 950 + index * 58
      ctx.fillStyle = index === 0 ? ACCENT : INK
      ctx.font = '500 28px Georgia, "Noto Serif SC", serif'
      ctx.fillText(`${String(index + 1).padStart(2, '0')}  ${item.name}`, 84, y)
      ctx.textAlign = 'right'
      ctx.font = '700 20px Arial, sans-serif'
      ctx.fillText(`${item.count} TIMES`, 996, y)
      ctx.textAlign = 'left'
    })
  } else {
    ctx.fillStyle = '#77746c'
    ctx.font = '500 26px Georgia, "Noto Serif SC", serif'
    ctx.fillText('这一年的故事，还在等待第一件器材。', 84, 962)
  }

  ctx.fillStyle = GOLD
  ctx.fillRect(82, 1200, 916, 2)
  ctx.fillStyle = INK
  ctx.font = '500 27px Georgia, "Noto Serif SC", serif'
  poem.lines.forEach((line, index) => ctx.fillText(line, 84, 1250 + index * 42))
  ctx.fillStyle = '#6e6b64'
  ctx.font = '600 16px Arial, sans-serif'
  ctx.fillText(`— ${poem.author.toUpperCase()} / ${poem.title}`, 84, 1380)
  downloadCanvas(canvas, `${data.year}_借用年鉴_${data.user_name}.png`)
}

export function downloadBorrowPass(record: BorrowDetail) {
  const { canvas, ctx } = createPoster(1080, 1350)
  ctx.fillStyle = INK
  ctx.fillRect(36, 36, 1008, 300)
  ctx.fillStyle = PAPER
  ctx.font = '700 22px Arial, sans-serif'
  drawSpacedText(ctx, 'NEW MEDIA CENTER / EQUIPMENT PASS', 82, 98, 3)
  ctx.font = '500 92px Georgia, serif'
  ctx.fillText('BORROW', 76, 230)
  ctx.fillStyle = GOLD
  ctx.fillRect(76, 272, 380, 8)

  ctx.fillStyle = TERRACOTTA
  ctx.font = '700 22px Arial, sans-serif'
  ctx.fillText('WORK ORDER', 78, 398)
  ctx.fillStyle = INK
  ctx.font = '500 52px Georgia, serif'
  ctx.fillText(record.work_order_no, 78, 458)

  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(78, 495); ctx.lineTo(1000, 495); ctx.stroke()
  ctx.fillStyle = INK
  ctx.font = '500 64px Georgia, "Noto Serif SC", serif'
  wrapText(ctx, record.equipment_name, 78, 580, 910, 72, 2)
  ctx.fillStyle = ACCENT
  ctx.font = '700 20px Arial, sans-serif'
  ctx.fillText(record.equipment_category.toUpperCase(), 80, 710)

  const rows = [
    ['BORROWER / 借用人', `${record.user_name}  ${record.user_student_id}`],
    ['FROM / 借用时间', formatApiDateTime(record.borrow_time)],
    ['UNTIL / 归还时间', formatApiDateTime(record.return_time)],
    ['STATUS / 状态', PASS_STATUS[record.status] || record.status.toUpperCase()]
  ]
  rows.forEach(([label, value], index) => {
    const y = 785 + index * 92
    ctx.fillStyle = '#77746c'
    ctx.font = '700 17px Arial, "Microsoft YaHei", sans-serif'
    ctx.fillText(label, 80, y)
    ctx.fillStyle = INK
    ctx.font = '500 28px Georgia, "Noto Serif SC", serif'
    ctx.fillText(value, 80, y + 38)
  })

  ctx.fillStyle = '#e5dfd2'
  ctx.fillRect(620, 760, 380, 350)
  ctx.fillStyle = INK
  ctx.font = '700 16px Arial, sans-serif'
  drawSpacedText(ctx, 'PURPOSE / 用途', 650, 806, 2)
  ctx.font = '500 28px Georgia, "Noto Serif SC", serif'
  wrapText(ctx, record.reason, 650, 862, 315, 42, 5)

  ctx.strokeStyle = TERRACOTTA
  ctx.lineWidth = 3
  ctx.strokeRect(78, 1170, 922, 110)
  ctx.fillStyle = TERRACOTTA
  ctx.font = '700 18px Arial, "Microsoft YaHei", sans-serif'
  ctx.fillText('现场核验请对照系统工单号与借用人身份', 104, 1215)
  ctx.fillStyle = INK
  ctx.font = '500 17px Arial, sans-serif'
  ctx.fillText('VALID ONLY WITH THE LIVE RECORD IN EQUIPMENT SYSTEM', 104, 1252)
  downloadCanvas(canvas, `借用凭证_${record.work_order_no}.png`)
}
