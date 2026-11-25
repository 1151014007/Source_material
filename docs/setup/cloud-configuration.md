# 云服务配置准备清单

日期：2026-11-25。用户已允许复用现有百炼/TOS账号，先运行4个小样；此权限不扩展到批量处理。

## 需要准备的账号

### 现在填写：硅基流动 BGE-M3 文本向量

用户已指定使用硅基流动的 BGE-M3，文本向量不再使用原计划的百炼 text-embedding-v4；输出仍为1024维，模型空间需按BGE-M3独立建立，不能混用不同模型向量。

打开根目录 `.env`，找到“二、硅基流动 BGE-M3”，现在只需填这一行：

```dotenv
TEXT_EMBEDDING_API_KEY=
```

其他项已填好：服务商 `siliconflow`、Base URL `https://api.siliconflow.cn/v1`、模型 `BAAI/bge-m3`、维度 `1024`。Base URL末尾不要再加 `/embeddings`；调用时由适配器拼接。若你实际使用的是 `Pro/BAAI/bge-m3`，按控制台完整ID修改模型项，不自动替换成Pro模型。原聊天Key、地址和其他现有配置保留。

BGE-M3是文本向量模型，用于文档、OCR、描述和转写的语义检索；直接以图搜图仍保留独立视觉模型接口。配置已可被后端读取，真实Embedding调用与完整检索链路等待填写Key后继续实现和验收。

官方依据：[硅基流动快速上手](https://docs.siliconflow.cn/docs/userguide/quickstart)、[BGE-M3原作者模型说明](https://huggingface.co/BAAI/bge-m3)。

### 1. 阿里云百炼：模型服务

2026-11-25补充实测：用户当前Token Plan凭据已成功调用聊天模型qwen3.7-plus，以及语音识别qwen-audio-3.0-asr-flash；ASR返回200、中文转写和词级时间戳。ASR_MODEL已将旧候选paraformer-v2替换为实测模型，单次上限5分钟，长音频处理待T06实施。详情见[语音实测记录](./2026-11-25-asr-smoke.md)。下述套餐规则说明与实际接口可达性分别理解；不再要求用户为本次短音频测试另提供语音密钥。

#### 先区分你购买的 Token Plan 与项目运行接口

用户已说明购买了百炼 Token Plan，但尚未说明个人版/团队版。不能因为已买套餐就认为本项目的所有接口都会抵扣套餐。

| 项目 | Token Plan 专属配置 | 本项目当前后台配置 |
|---|---|---|
| 密钥 | 套餐专属 Key，通常为 `sk-sp-` 开头 | 普通百炼 API Key，填写到 `DASHSCOPE_API_KEY` |
| 地址 | 套餐自己的 Base URL | 随普通模型 API、地域和接口类型配置，用户先留空 |
| 用途 | 个人版限指定工具中的交互式开发；团队版须另核对适用方式 | 上传后由后台任务解析、向量化、转写，以及检索问答 |
| 套餐覆盖 | 以所购版本的模型与规则为准 | 当前不默认把文本/图文向量或语音转写计入套餐 |

普通 API 与套餐凭证不能混填。个人版套餐可继续用于符合官方范围的开发工具；本项目后台先按普通百炼 API 接入，不能把个人版 Key 用到后台任务。若购买的是团队版，先告知版本，再核对适用规则与模型，不自动选择套餐或按量计费的备用通道。

官方依据：[Token Plan 常见问题](https://help.aliyun.com/zh/model-studio/token-plan-faq)、[通用接入指南](https://help.aliyun.com/zh/model-studio/more-tools)。核验日期：2026-11-25。

#### 当前 .env 中阿里云部分如何填

1. `DASHSCOPE_API_KEY`：填普通百炼 API Key。只有 Token Plan 专属 Key 时先留空，不要把 `sk-sp-` Key 填进这里。
2. `DASHSCOPE_REGION`：填普通 Key 对应地域，默认北京 `cn-beijing`；不是按个人居住地填写。
3. `DASHSCOPE_WORKSPACE_ID`：使用特定业务空间才填写，不清楚时先留空。
4. `DASHSCOPE_BASE_URL`：先留空，我按地域和具体接口设置；不填网页控制台 URL。
5. `TEXT_EMBEDDING_MODEL`、`VISUAL_EMBEDDING_MODEL`、`VISION_MODEL`、`ASR_MODEL`、`ANSWER_MODEL`：保留候选值，由我验证可用性；两项维度不要自行修改。

准备目标地域的普通 API Key；建议首版使用北京地域，最终以账号实际开通情况为准。不同地域的 Key、接入地址与可用模型需要匹配。使用特定业务空间时一并填写空间 ID。

需要的模型能力：视觉理解、文本向量、图文跨模态向量、录音文件转写、带引用的文本问答。候选模型已经写入模板，接入时进行真实小样探测；不要求用户自行填写全部模型参数。若账号没有候选模型权限，先报告缺项再调整适配与索引配置。

填写 `.env` 中的 `DASHSCOPE_API_KEY`、`DASHSCOPE_REGION`；只有使用非默认业务空间时才需要 `DASHSCOPE_WORKSPACE_ID`。

官方说明：[获取 API Key](https://help.aliyun.com/zh/model-studio/get-api-key/)、[多模态向量接口](https://help.aliyun.com/en/model-studio/multimodal-embedding-api-reference)、[录音转写](https://help.aliyun.com/en/model-studio/non-realtime-speech-recognition-user-guide)。

### 2. 火山引擎 TOS：素材文件存储

准备 `TOS_ACCESS_KEY`、`TOS_SECRET_KEY`、`TOS_BUCKET`、`TOS_REGION`、`TOS_ENDPOINT`。建议为新项目建立独立的私有存储桶；复用原桶时，项目固定使用独立前缀 `media-atlas/development/`。为该桶/前缀授予项目所需对象上传、读取、列举、删除权限。

存储桶使用私有访问与标准存储；Endpoint 从桶所属地域信息复制，不填写已包含 bucket 名的对象访问 URL。实际上传、签名读取和清理会在4个小样联调范围内验证，其他原有对象不会被修改。

官方说明：[TOS控制台入门](https://docs.volcengine.com/docs/torch-object-storage/getting-started-with-tos-using-the-console?lang=zh)。

### 3. GitHub：交付时再提供

继续使用现有 GitHub 账号即可，准备一个新仓库地址；当前不需要提供GitHub登录密码或额外令牌。实际推送采用已有可用登录方式，待用户提供地址并要求发布时进行。

## 用户现在如何填写

在项目根目录打开 `.env`，只补百炼/TOS部分。模型候选值和项目存储前缀已经填好，数据库密码、会话密钥与初始管理员密码由本地生成，程序接入继续由助手完成。实际密钥保存在本地环境文件，不写入聊天、文档或Git。

现有发布工程的 `.env` 未配置百炼 Key 和 TOS AK/SK；“沿用账号”仍需从已有账号取得可用的项目配置。无需提供个人账号登录密码。

暂时不需要购买服务器、GPU、域名、CDN或独立向量数据库；本地数据库、Redis、媒体工具和Docker部署由实施处理。公网部署如有需要，在完成本地验收后单独确定。
