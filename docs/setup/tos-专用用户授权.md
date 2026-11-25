# 素材平台专用IAM用户授权

用户：media-atlas。桶：media-atlas-1151014007。对象前缀：media-atlas/development/。

## 当前采用的授权方式（用户已明确选择）

2026-11-25用户反馈向导默认AccessKeySelfManageAccess无法取消，并明确选择保留该默认项、添加TOSFullAccess以简化个人项目联调。按此选择继续，不要求重新创建用户或先创建自定义策略。

当前选择：保留AccessKeySelfManageAccess，勾选对象存储TOSFullAccess；其他策略无需添加。TOSFullAccess范围为该账号下全部TOS桶及对象，不限本项目桶；不额外授予全局AdministratorAccess、IAM或计费管理权限。

这次授权范围变化不扩展测试操作：仍只在本项目默认前缀下创建唯一随机测试文件，并只清理本次文件；批量云处理保持关闭。下方自定义策略仅作为以后可选的权限收窄方案，当前不是前置步骤。

## 创建用户时

选择编程访问，控制台访问不勾选。按上述已确认方式保留默认策略并勾选TOSFullAccess，进入下一步审阅和完成。

创建完成页若显示AK/SK，保存在本地.env，不把密钥区域截图发到聊天。

## 可选：之后创建并绑定桶专用策略

1. 左侧“权限策略”→“新建自定义策略”→“JSON编辑器”。
2. 策略名填 `MediaAtlasBucketAccess`。
3. 复制同目录 [tos-media-atlas-policy.json](./tos-media-atlas-policy.json) 的完整内容并创建。
4. 找到新策略，点击“授权”，选择用户media-atlas并提交；也可在该用户权限页添加此策略。
5. 如果控制台提示具体操作不支持该资源范围，停止并记录错误，先修订策略，不能为省步骤直接改成全局管理员权限。

当前策略仅允许读取/列举这个桶，读写/删除及中止分片仅限本项目对象前缀；不允许修改桶ACL或桶策略、不允许删除桶。ListBucket列举范围为该桶全部对象元数据，不是全账号；对象内容访问仍只限项目指定前缀。分片续传所需的其他操作待实现时核对，当前小文件测试不依赖它们。

官方依据：[TOS权限示例](https://docs.volcengine.com/docs/torch-object-storage/configure-and-mount?lang=en)、[新建自定义策略](https://docs.volcengine.com/docs/iam/create-custom-policy?lang=zh)、[策略授权](https://docs.volcengine.com/docs/IAM/PolicyOverview?lang=zh)。

本文件与JSON是待用户在控制台应用的配置，不表示云端授权已生效。实际权限以TOS联调结果为准。
