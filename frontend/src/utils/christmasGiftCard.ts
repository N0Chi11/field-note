import { APP_ISSUE, APP_NAME } from './appInfo'
import type { GiftCamera } from './christmasGiftCameras'

function spark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath()
  ctx.moveTo(x, y - size)
  ctx.quadraticCurveTo(x + size * .2, y - size * .2, x + size, y)
  ctx.quadraticCurveTo(x + size * .2, y + size * .2, x, y + size)
  ctx.quadraticCurveTo(x - size * .2, y + size * .2, x - size, y)
  ctx.quadraticCurveTo(x - size * .2, y - size * .2, x, y - size)
  ctx.fill()
}

export function downloadGiftCard(gift: GiftCamera, photo: HTMLImageElement) {
  if (!photo.complete || !photo.naturalWidth || !photo.naturalHeight) {
    throw new Error('The photo has not loaded')
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1160
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable')

  ctx.fillStyle = '#124736'
  ctx.fillRect(0, 0, 1080, 1160)
  ctx.strokeStyle = '#e3bc83'
  ctx.lineWidth = 2
  ctx.strokeRect(27, 27, 1026, 1106)

  ctx.fillStyle = '#f3d69f'
  spark(ctx, 75, 94, 15)
  spark(ctx, 1003, 94, 15)
  ctx.font = '700 21px Consolas, monospace'
  ctx.fillText(APP_NAME, 112, 100)
  ctx.textAlign = 'right'
  ctx.fillText(APP_ISSUE, 968, 100)
  ctx.textAlign = 'left'

  const frame = { x: 70, y: 147, width: 940, height: 532 }
  ctx.fillStyle = '#fff'
  ctx.fillRect(frame.x, frame.y, frame.width, frame.height)
  const scale = Math.min(frame.width / photo.naturalWidth, frame.height / photo.naturalHeight)
  const width = photo.naturalWidth * scale
  const height = photo.naturalHeight * scale
  ctx.drawImage(photo, frame.x + (frame.width - width) / 2, frame.y + (frame.height - height) / 2, width, height)

  ctx.fillStyle = '#fff5df'
  ctx.fillRect(70, 679, 940, 380)
  ctx.fillStyle = '#a5243d'
  ctx.fillRect(70, 679, 940, 10)
  ctx.fillRect(108, 719, 153, 38)
  ctx.fillStyle = '#fff5df'
  ctx.font = '700 21px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.fillText('相机抽奖', 132, 745)

  ctx.fillStyle = '#2b513e'
  ctx.font = '700 23px Consolas, monospace'
  ctx.fillText(gift.brand.toUpperCase(), 108, 804)
  ctx.fillStyle = '#173e31'
  ctx.font = '500 76px Georgia, serif'
  ctx.fillText(gift.model, 105, 887, 866)
  ctx.font = '500 25px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.fillText(gift.kind, 108, 936)

  ctx.strokeStyle = '#c9ab81'
  ctx.beginPath()
  ctx.moveTo(108, 971)
  ctx.lineTo(972, 971)
  ctx.stroke()
  ctx.fillStyle = '#53483a'
  ctx.font = '500 17px "Microsoft YaHei", "PingFang SC", Arial, sans-serif'
  ctx.fillText(`商品图：${gift.brand}`, 108, 998, 861)
  ctx.font = '500 12px Arial, sans-serif'
  ctx.fillText(gift.official, 108, 1018, 861)

  ctx.fillStyle = '#f3d69f'
  ctx.font = '500 20px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('仅供娱乐，抽到了也不会真送你。', 540, 1105, 900)

  const link = document.createElement('a')
  link.download = `FIELD-NOTE-圣诞礼物-${gift.brand}-${gift.model.replace(/ /g, '-')}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
