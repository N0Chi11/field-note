# WxPusher 微信提醒配置

用户成功提交设备借用申请后，系统会通过 WxPusher 给指定 UID 或 Topic 订阅者推送申请详情。WxPusher 未配置或临时失败时只记录日志，不影响借用申请提交。

## 推荐：使用 Topic 通知四位管理员

1. 登录 WxPusher 管理后台并创建应用。
2. 在 Topic 管理中创建“设备借用审批”主题。
3. 测试阶段只由你自己扫描 Topic 订阅二维码；测试通过后，再让其余三位管理员扫码订阅。
4. 记下应用的 appToken 和 Topic 的数字 ID。appToken 属于密钥，只能放在服务器 `.env`，不要提交到 Git。

在服务器项目根目录的 `.env` 末尾添加：

```env
WXPUSHER_APP_TOKEN=你的appToken
WXPUSHER_TOPIC_IDS=你的Topic数字ID
WXPUSHER_UIDS=
SYSTEM_PUBLIC_URL=https://你的设备系统域名或IP
```

如果暂时不使用 Topic、只想直接给一个人测试，也可以把这个人的 UID 填入 `WXPUSHER_UIDS`，并暂时留空 `WXPUSHER_TOPIC_IDS`。手机号不能代替 WxPusher UID。

## 更新并测试后端

```bash
docker compose -f docker-compose.prod.yml up -d --build backend
docker compose -f docker-compose.prod.yml exec backend python -m scripts.test_wxpusher
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

看到“发送任务创建成功”后，检查微信中的 WxPusher 消息。API 返回成功表示异步发送任务已创建，最终到达时间由 WxPusher 和微信通知策略决定。
