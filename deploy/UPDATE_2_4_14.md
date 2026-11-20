# FIELD NOTE v2.4.14

- 登录后的器材首页新增可点击的圣诞礼盒，不会自动弹出，登录页不变。
- 可以指定一台高端相机，或随机拆开礼物。揭晓后显示实机照片，可保存带型号的纪念卡。
- 这是虚拟礼物，不会更改库存、借用状态或用户数据。

## 更新部署

在云服务器终端运行：

```bash
cd /root/equipment-system && git pull --ff-only origin main && (cd frontend && npm run build)
```

构建成功后刷新网站。此次只更新前端，无需重建 Docker 镜像或迁移数据库。

## 相机照片来源

照片随前端一起部署，浏览礼盒时无需连接外部图床。下列版本裁去展示边框、缩放并转为 WebP；照片及纪念卡上的照片区域仍适用原图授权。

| 相机 | 原图 | 摄影者 | 授权 |
| --- | --- | --- | --- |
| Hasselblad H6D-100c | [Wikimedia Commons](<https://commons.wikimedia.org/wiki/File:Hasselblad-H6D-100c_front-shot_WH1_(cropped).jpg>) | Ida Gustaf | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Leica M11 | [Wikimedia Commons](<https://commons.wikimedia.org/wiki/File:Leica_M11_-_by_Henry_S%C3%B6derlund_(52659157434).jpg>) | Henry Söderlund | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| Fujifilm GFX100 II | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Fujifilm_GFX100_II_2_dec_2023a.jpg) | 昼落ち | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Canon EOS R1 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Canon_EOS_R1%2BRF_24-105mm_F2.8L_IS_USM_Z.jpg) | Dinkun Chen | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
