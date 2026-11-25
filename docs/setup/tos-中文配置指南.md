# 火山引擎 TOS 中文配置指南

日期：2026-11-25。TOS用于保存文档、图片、音频、视频和处理产物。

## 一、控制台准备

1. 登录火山引擎，进入对象存储TOS，创建本项目专用存储桶。
2. 选择一个合适地域；本方案可使用北京，但最终以你实际选择为准。桶名按控制台要求填写，名称已占用时换后缀。
3. 存储类型选择“标准存储”，访问权限选择“私有”。
   若创建页提供存储冗余类型，选择默认单AZ；其他增强功能先保留关闭/默认。根据用户控制成本的要求，先用少量小文件按量联调，资源包和加速功能暂不购买。
4. 在桶详情/概览里记录桶名、地域和公网Endpoint。Endpoint不包含桶名，不是浏览器控制台网址。
5. 在访问控制IAM准备项目专用用户的AccessKey ID与Secret Access Key，并给该桶/项目对象前缀所需读写、列举和删除权限。不要用云账号登录密码代替密钥。

官方操作说明：[创建桶](https://docs.volcengine.com/docs/torch-object-storage/creating-buckets?lang=zh)、[权限管理](https://docs.volcengine.com/docs/torch-object-storage/overview-of-rights-management?lang=zh)。TOS的私有访问与授权以控制台实际生效策略为准。

## 二、在本地.env中填写

打开项目根目录 `.env`，找到“五、火山引擎TOS”，补以下五项：

| 变量名 | 填什么 | 北京地域示例 |
|---|---|---|
| TOS_ACCESS_KEY | AccessKey ID | 从IAM复制，保存在本地，不放聊天 |
| TOS_SECRET_KEY | 配套Secret Access Key | 从IAM复制，保存在本地，不放聊天 |
| TOS_REGION | 桶的地域代码 | cn-beijing |
| TOS_ENDPOINT | 地域对应的公网Endpoint | https://tos-cn-beijing.volces.com |
| TOS_BUCKET | 你创建的桶名 | 按实际桶名填写 |

`STORAGE_BACKEND=tos`与`TOS_PREFIX=media-atlas/development/`已经设好，先不用改。北京示例不能直接套用其他地域；本地电脑调用使用公网Endpoint。

## 三、填写之后验证什么

用户告知填写完成后，用唯一随机测试对象检查：上传小文件、下载与哈希比对、生成签名读取链接并读取、删除该测试对象。只清理本次创建的测试对象，不枚举删除原有资料。失败记录状态码与错误类别，不输出密钥、Authorization或签名URL。

上传下载权限先验证；后续浏览器直传、大文件分片等按实际接口补齐权限和CORS配置，不用为测试把桶设为公开。

## 四、当前配置进度

成本约定见[展示项目成本控制](../operations/cost-policy.md)：以本地运行、真实小样和GitHub证据为主，批量云评测暂缓，功能验收情况如实记录。

- 聊天：Token Plan qwen3.7-plus已实测200；配置已对齐该模型。
- 文本向量：硅基流动BAAI/bge-m3已实测，1024维。
- 语音：Token Plan qwen-audio-3.0-asr-flash已实测，并返回词级时间戳。
- 图片理解、图文向量：尚未接入验收，不代表整个阿里云多模态配置已经完成。
- TOS：等待填写以上五项后实际验证；当前不宣称文件存储已联通。
