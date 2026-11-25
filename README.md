# 映库 · MediaAtlas

面向文档、图片、音频与视频的独立素材平台。以可追溯的内容、版本和证据为基础，建设统一管理、跨模态检索和审核发布能力。

**当前为开发中的基础版本。** 已完成独立登录、工作区权限、数据库迁移、接入概览和真实云服务小样；素材上传处理、审核、统一检索、引用问答仍在实施中，不将规划功能标为已交付。

## 当前可运行

- 登录与注销，HttpOnly会话、CSRF校验、过期会话拒绝。
- admin/editor/viewer角色与工作区数据隔离；管理员可查看和创建成员。
- 本地PostgreSQL、Redis独立端口与独立卷，业务库和测试库分开。
- 接入概览读取既有小样验证记录，刷新页面不触发收费模型调用。
- 数据库和Redis健康检查；数据库未初始化时不会伪报就绪。

## 已实际验证的外部接入

| 能力 | 配置 | 小样结果 |
|---|---|---|
| 文本生成 | 阿里云Token Plan / qwen3.7-plus | HTTP200，返回预期短文本 |
| 文本向量 | 硅基流动 / BAAI/bge-m3 | HTTP200，1024维，基础语义排序通过 |
| 语音识别 | Token Plan / qwen-audio-3.0-asr-flash | 中文短音频转写、词级时间戳通过 |
| 对象存储 | 火山引擎私有TOS | 71字节上传、下载校验、签名读取、删除验证通过 |
| 图片理解、图文向量 | 待配置/验证 | 尚未宣称通过 |

这些是小样结果，不代表全量评测或业务链路完成。详见[接入配置与实测记录](docs/setup/cloud-configuration.md)。套餐的可调用性和允许使用范围分别核对。

## 当前界面

以下为实际本地运行截图，对应当前基础版本：

![工作区登录](docs/screenshots/foundation-login.png)

![接入概览](docs/screenshots/foundation-overview.png)

## 本地启动

需要Docker Desktop、Python 3.12（可由uv管理）、uv、Node.js 22.12或更高版本。

Windows初始化：

```powershell
.\scripts\bootstrap.ps1
```

Linux/macOS初始化：

```bash
sh scripts/bootstrap.sh
```

数据库密码、会话密钥和初始管理员密码只保存在根目录`.env`。初始化补齐缺失的本地字段，保留已填好的云密钥和其他非空配置值；POSIX系统新文件按0600权限创建。

启动API（工作目录backend）：

```bash
uv run uvicorn app.main:app --host 127.0.0.1 --port 18002
```

启动前端（工作目录frontend）：

```bash
npm run dev
```

访问 <http://127.0.0.1:18082>；API文档为 <http://127.0.0.1:18002/docs>。使用`.env`中的`BOOTSTRAP_ADMIN_USERNAME`和`BOOTSTRAP_ADMIN_PASSWORD`登录。云服务配置缺失不会阻止基础工作台启动，但相关AI能力不可用。

开发端口：Web18082、API18002、PostgreSQL15433、Redis16380。所有端口绑定本机；新Compose project为`asset-platform-dev`，不读取其他项目的数据库。

## 验证

```bash
# 工作目录backend
uv run pytest -q
uv run ruff check app tests migrations

# 工作目录frontend
npm run test
npm run build
```

测试必须使用明确的`TEST_DATABASE_URL`，数据库名以`_test`结尾，每用例创建独立schema并清理；缺少测试地址或使用业务库将直接拒绝。测试不调用收费云模型。

TOS独立小样验证：在项目根目录使用backend虚拟环境运行`scripts/smoke_tos.py`，只接受当前已约定的桶与项目测试前缀，创建并清理唯一随机小文件。该脚本会发真实请求，普通单元测试不会执行它。

## 成本与数据边界

按[成本约定](docs/operations/cost-policy.md)优先本地运行，云端只做必要真实小样，批处理保持关闭。GitHub展示代码、真实界面和测试证据，未执行的召回率、性能、业务规模不作为既有成绩。

`.env`、`.local`、日志、运行截图、数据卷与私人素材不进入Git。公开截图在完成功能验收后单独整理。当前尚未配置新远程仓库，后续使用用户指定地址。
