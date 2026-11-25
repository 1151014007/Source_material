# 云服务配置

基础工作台可以在不填写云凭据的情况下运行。云接口只在主动执行真实小样时使用，默认关闭批处理。本文不提供密钥，也不承诺任何账号具备相同模型权限或套餐额度。

## 配置文件

先执行 README 的初始化脚本，打开根目录 `.env`。`.env.example` 是公开空白模板，不能填写真实凭据；实际 `.env` 被 Git 忽略。用户名和账号登录密码不能代替 API Key。

### 文本生成

| 变量 | 说明 |
|---|---|
| `DASHSCOPE_API_KEY` | 与服务地址配套的阿里云模型服务密钥 |
| `DASHSCOPE_BASE_URL` | 对应服务的兼容接口 Base URL，不是控制台网址 |
| `DASHSCOPE_REGION` | 与密钥、服务地址匹配的地域 |
| `DASHSCOPE_WORKSPACE_ID` | 特定业务空间 ID，默认空间可留空 |
| `ANSWER_MODEL` | 当前实测模型 `qwen3.7-plus`，其他账号需分别确认 |

维护者使用北京地域 Token Plan 专属地址完成过最小聊天请求，见[实测记录](2026-11-25-token-plan-smoke.md)。这证明当时的调用可达性；套餐允许的使用方式、模型列表、限额与生产后台使用范围应单独核对。普通 API 与 Token Plan 的密钥和地址不能随意交叉搭配，不自动切换到另一条计费通道。

官方依据：[Token Plan 常见问题](https://help.aliyun.com/zh/model-studio/token-plan-faq)、[获取 API Key](https://help.aliyun.com/zh/model-studio/get-api-key/)。

### 文本向量：硅基流动 BGE-M3

```dotenv
TEXT_EMBEDDING_PROVIDER=siliconflow
TEXT_EMBEDDING_API_KEY=
TEXT_EMBEDDING_BASE_URL=https://api.siliconflow.cn/v1
TEXT_EMBEDDING_MODEL=BAAI/bge-m3
TEXT_EMBEDDING_DIMENSION=1024
```

只在本地填写 `TEXT_EMBEDDING_API_KEY`。Base URL 不再添加 `/embeddings`。如使用不同完整模型 ID，需要核对权限、费用、维度与模型空间；不能把不同模型产生的同维度向量直接混用。

BGE-M3 接收文本，可用于文档、OCR、图片描述和音视频转写内容；不直接处理图片像素。见[BGE-M3 小样记录](2026-11-25-bge-m3-smoke.md)。

### 语音、图片理解与视觉向量

- `ASR_MODEL=qwen-audio-3.0-asr-flash`：维护者通过原生语音接口完成中文短音频与词级时间戳验证；该接口与聊天兼容接口不同。长音视频分段、恢复与时间戳聚合尚未实现。见[语音小样记录](2026-11-25-asr-smoke.md)。
- `VISION_MODEL=qwen3-vl-flash`：候选图片理解模型，尚未验收。
- `VISUAL_EMBEDDING_MODEL=tongyi-embedding-vision-plus-2026-03-06`：候选图文向量模型，尚未验收。`1152` 维视觉空间与 `1024` 维文本空间分别管理。

当前只有协议与配置边界，以上配置项不等于已交付后台处理流水线。更改模型或维度前需要同步调整 Provider、索引和迁移。

## 私有对象存储：火山引擎 TOS

| 变量 | 说明 |
|---|---|
| `TOS_ACCESS_KEY` | IAM 用户 AccessKey ID |
| `TOS_SECRET_KEY` | 配对的 Secret Access Key，非控制台登录密码 |
| `TOS_REGION` | 存储桶实际地域，例如 `cn-beijing` |
| `TOS_ENDPOINT` | 地域公网 Endpoint，例如 `https://tos-cn-beijing.volces.com` |
| `TOS_BUCKET` | 自己的项目存储桶名称 |
| `TOS_PREFIX` | 项目独立对象前缀，默认 `media-atlas/development/` |

推荐项目专用 IAM 用户与私有标准存储桶。资源包不是使用前提，不购买时仍会按实际存储、请求与流量计费；本项目不自动购买云资源。

维护者的小样仅在约定桶和前缀下操作随机测试对象，并确认删除。现有 `scripts/smoke_tos.py` 有该联调环境的桶、地域与前缀允许列表；其他账号需要先审阅并调整这些保护条件，不能直接拿别人的桶名测试。自动化测试不会执行真实 TOS 脚本。

[TOS 小样记录](2026-11-25-tos-smoke.md) · [中文填写指南](tos-中文配置指南.md) · [官方计费概述](https://docs.volcengine.com/docs/torch-object-storage/Billingoverview-2?lang=zh)

## 成本与凭据

`CLOUD_BULK_ENABLED=false`。本地单元测试、集成测试和页面浏览不调用收费模型。真实云验证只处理明确指定的小样；原始报告、签名链接、账号密码、真实密钥与私人素材不进入仓库。

查看[成本约定](../operations/cost-policy.md)。公网常驻服务、批量推理和完整评测需另行准备运行环境与预算。
