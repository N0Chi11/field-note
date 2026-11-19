import { APP_EDITION, APP_ISSUE, APP_NAME } from './appInfo'

const PHOTO_FRAME = { x: 48, y: 48, width: 984, height: 596 }
const SERIF = '"Noto Serif SC", "Songti SC", "SimSun", Georgia, serif'

function wrapWish(ctx: CanvasRenderingContext2D, wish: string, maxWidth: number) {
  const lines: string[] = []
  let line = ''
  for (const character of wish) {
    if (line && ctx.measureText(line + character).width > maxWidth) {
      lines.push(line.trimEnd())
      line = character.trimStart()
    } else {
      line += character
    }
  }
  if (line) lines.push(line)
  return lines
}

export function downloadWishCard(wish: string, image: HTMLImageElement, trim: HTMLImageElement | null) {
  if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
    throw new Error('The artwork has not loaded')
  }

  // Everything is drawn in this tab. No user text becomes markup or leaves the browser.
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')
  const textWidth = 924
  context.font = `500 45px ${SERIF}`
  const naturalWidth = context.measureText(wish).width
  // Keep a short sentence together when a modest size change fits it on one line.
  const size = naturalWidth <= textWidth * 1.22 ? Math.min(45, Math.floor(45 * textWidth / naturalWidth)) : 45
  const wishFont = `500 ${size}px ${SERIF}`
  context.font = wishFont
  const lines = wrapWish(context, wish, textWidth)
  canvas.height = Math.max(1040, 925 + lines.length * 60)

  context.fillStyle = '#fff4df'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#b0845b'
  context.lineWidth = 2
  context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40)

  const { x, y, width, height } = PHOTO_FRAME
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const cropWidth = width / scale
  const cropHeight = height / scale
  context.drawImage(
    image, (image.naturalWidth - cropWidth) * .9, (image.naturalHeight - cropHeight) * .45, cropWidth, cropHeight,
    x, y, width, height
  )
  if (trim?.complete && trim.naturalWidth) context.drawImage(trim, x, y, width, height)

  context.fillStyle = '#a5243d'
  context.fillRect(x, y + height, width / 2, 8)
  context.fillStyle = '#14684b'
  context.fillRect(x + width / 2, y + height, width / 2, 8)

  context.fillStyle = '#a5243d'
  context.font = '700 25px "Microsoft YaHei", "PingFang SC", sans-serif'
  context.fillText('圣诞心愿', 78, 724)
  context.fillStyle = '#163e2e'
  context.font = wishFont
  lines.forEach((line, index) => context.fillText(line, 78, 804 + index * 60))

  context.strokeStyle = '#d4b78b'
  context.beginPath()
  context.moveTo(78, canvas.height - 108)
  context.lineTo(1002, canvas.height - 108)
  context.stroke()
  context.fillStyle = '#821c36'
  context.font = '700 22px Consolas, monospace'
  context.fillText(`${APP_NAME} / ${APP_EDITION}`, 78, canvas.height - 68)
  context.textAlign = 'right'
  context.fillText(APP_ISSUE, 1002, canvas.height - 68)

  const link = document.createElement('a')
  link.download = 'FIELD-NOTE-圣诞心愿.png'
  link.href = canvas.toDataURL('image/png')
  link.click()
}
