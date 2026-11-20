# FIELD NOTE v2.4.16

- 登录后的首页入口和礼盒标题统一为「相机抽奖」。开奖后保留「仅供娱乐，抽到了也不会真送你。」
- 奖池扩大到 7 个品牌、15 款相机。胶片、奖池和礼物卡统一使用白底商品图，保留随机滚动开奖和再抽一次。
- 图片随前端部署，无需实时访问外部图床。此次只更新前端，不改器材库存、借用记录或数据库。

```bash
cd /root/equipment-system && git pull --ff-only origin main && (cd frontend && npm run build)
```

构建成功后刷新网站，无需重建 Docker 镜像。

## 商品图来源

商品图来自下列品牌商品页和产品图库，已缩放、统一白底并转为 WebP。

| 机型 | 品牌页面 |
| --- | --- |
| Hasselblad X2D II 100C | [Hasselblad 官方商店](https://store-na.hasselblad.com/products/x2d-ii-100c) |
| Hasselblad 907X & CFV 100C | [Hasselblad 官方商店](https://store-na.hasselblad.com/products/907x-cfv-100c) |
| Leica M11 | [Leica 产品页](https://leica-camera.com/en-US/photography/cameras/m/m11-black) |
| Leica Q3 43 | [Leica 产品页](https://leica-camera.com/en-US/photography/cameras/q/q3-43-black) |
| Leica SL3 | [Leica 产品页](https://leica-camera.com/en-US/photography/cameras/sl/sl3-black) |
| Fujifilm GFX100 II | [Fujifilm 产品页](https://www.fujifilm-x.com/global/products/cameras/gfx100-ii/) |
| Fujifilm GFX100RF | [Fujifilm 产品页](https://www.fujifilm-x.com/global/products/cameras/gfx100rf/) |
| Fujifilm GFX100S II | [Fujifilm 产品页](https://www.fujifilm-x.com/global/products/cameras/gfx100s-ii/) |
| Canon EOS R1 | [Canon 产品页](https://www.canon-europe.com/cameras/eos-r1/) |
| Canon EOS R5 Mark II | [Canon 产品页](https://www.canon-europe.com/cameras/eos-r5-mark-ii/) |
| Sony α1 II | [Sony Alpha Universe](https://alphauniverse.com/cameras/alpha-1-ii/) |
| Sony α9 III | [Sony Alpha Universe](https://alphauniverse.com/cameras/alpha-9-iii/) |
| Nikon Z 9 | [Nikon 产品页](https://imaging.nikon.com/imaging/lineup/mirrorless/z_9/) |
| Nikon Z 8 | [Nikon 产品页](https://imaging.nikon.com/imaging/lineup/mirrorless/z_8/) |
| Panasonic LUMIX S1RII | [Panasonic 产品页](https://shop.panasonic.com/pages/lumix-s1rii-full-frame-mirrorless-camera) |
