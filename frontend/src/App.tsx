import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  api,
  ApiError,
  SESSION_EXPIRED,
  type IntegrationStatus,
  type User,
} from "./api";
import Users from "./Users";

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        映库<small>MEDIAATLAS</small>
      </span>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setPassword("");
      onLogin(data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "服务暂不可用");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="login-layout">
      <section className="login-story">
        <Brand />
        <div className="story-body">
          <span className="eyebrow">A PLACE FOR EVERY PIECE</span>
          <h1>
            让每一份素材，
            <br />
            都能被找到。
          </h1>
          <p>
            连接文档、图像与音视频。
            <br />
            从内容到证据，让知识有迹可循。
          </p>
          <div className="media-stack" aria-hidden="true">
            <div className="media-sheet back">
              VIDEO / 01:28<span>▸</span>
            </div>
            <div className="media-sheet front">
              <span className="sheet-line" />
              <span className="sheet-line short" />
              <div className="sheet-image">
                <i />
                <i />
                <i />
              </div>
              <small>CONTENT, CONNECTED.</small>
            </div>
            <div className="media-label">文档 · 图片 · 音频 · 视频</div>
          </div>
        </div>
        <footer>MediaAtlas / 素材与知识工作区</footer>
      </section>
      <section className="login-form-area">
        <form className="login-form" onSubmit={submit}>
          <div className="eyebrow">WELCOME BACK</div>
          <h2>登录工作区</h2>
          <p>使用工作区账号，继续你的内容工作。</p>
          <label htmlFor="username">用户名</label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            maxLength={64}
            placeholder="输入用户名"
          />
          <label htmlFor="password">密码</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            maxLength={256}
            placeholder="输入密码"
          />
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <button className="primary login-button" disabled={busy}>
            {busy ? "正在登录…" : "登录工作区"}
          </button>
          <div className="login-note">初始账号由工作区管理员配置。</div>
        </form>
        <span className="login-footer">有序归档 · 有据可查</span>
      </section>
    </main>
  );
}

function Overview() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [health, setHealth] = useState<{
    checks: Record<string, boolean>;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setBusy(true);
    setError("");
    setHealth(null);
    setStatus(null);
    try {
      const [integrations, readiness] = await Promise.allSettled([
        api<IntegrationStatus>("/system/integrations"),
        fetch("/health/ready").then((r) => r.json()),
      ]);
      if (current === generation.current) {
        if (integrations.status === "fulfilled") setStatus(integrations.value);
        if (readiness.status === "fulfilled" && readiness.value?.checks)
          setHealth(readiness.value);
        if (
          integrations.status === "rejected" ||
          readiness.status === "rejected"
        ) {
          setError(
            "部分服务信息读取失败，可重试；健康状态仅显示本次已返回的结果。",
          );
        }
      }
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : "读取失败");
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const tested =
    status?.integrations.filter((item) => item.historical_probe?.passed)
      .length ?? 0;
  const localReady = health
    ? Object.values(health.checks).filter(Boolean).length
    : 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE / CONNECTIONS</div>
          <h1>接入概览</h1>
          <p>本地服务与模型配置，一处了解。</p>
        </div>
        <button className="secondary" disabled={busy} onClick={load}>
          {busy ? "刷新中…" : "↻ 刷新状态"}
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="metrics">
        <div className="metric">
          <span>本地基础服务</span>
          <strong>
            {health ? localReady : "—"}
            <small> / 2</small>
          </strong>
          <p>数据库与任务队列</p>
          <i className={localReady === 2 ? "status-dot" : "status-dot muted"} />
        </div>
        <div className="metric">
          <span>已完成小样验证</span>
          <strong>
            {status ? tested : "—"}
            <small> 项接入</small>
          </strong>
          <p>读取已有验证记录</p>
          <span className="metric-glyph">↗</span>
        </div>
        <div className="metric">
          <span>云端批量处理</span>
          <strong className="text-value">
            {status ? (status.bulk_enabled ? "已启用" : "已关闭") : "—"}
          </strong>
          <p>按需处理，控制调用范围</p>
          <span className="metric-glyph">◷</span>
        </div>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>服务接入</h2>
            <p>配置状态与最近一次真实小样验证。</p>
          </div>
          <span className="subtle-tag">6 类能力</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>能力</th>
                <th>服务商</th>
                <th>模型 / 存储</th>
                <th>配置</th>
                <th>历史验证</th>
              </tr>
            </thead>
            <tbody>
              {status?.integrations.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    <span className={"service-icon tone-" + index}>
                      {["文", "向", "声", "存", "图", "检"][index]}
                    </span>
                    <strong>{item.label}</strong>
                  </td>
                  <td>{item.provider}</td>
                  <td>
                    <code>{item.model}</code>
                  </td>
                  <td>
                    <span
                      className={
                        "pill " + (item.configured ? "neutral" : "pending")
                      }
                    >
                      {item.configured ? "已填写" : "待配置"}
                    </span>
                  </td>
                  <td>
                    {item.historical_probe?.passed ? (
                      <span className="probe-result">
                        <span className="status-dot" />
                        小样通过
                        <small>
                          {item.historical_probe.tested_at
                            ? new Date(
                                item.historical_probe.tested_at,
                              ).toLocaleDateString("zh-CN")
                            : "未记录验证时间"}
                        </small>
                      </span>
                    ) : item.historical_probe ? (
                      <span className="probe-failed">验证失败</span>
                    ) : (
                      <span className="muted-text">尚未验证</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-foot">
          {status?.note ||
            (error ? "接入信息读取失败，请重试。" : "正在读取接入信息…")}
        </div>
      </section>
      <section className="connection-note">
        <div className="note-icon">i</div>
        <div>
          <h3>先连接，再验证</h3>
          <p>
            密钥保存在本地环境配置中。模型与存储的真实调用通过独立测试执行，浏览工作台不会自动产生云调用。
          </p>
        </div>
        <span className="subtle-tag">按需调用</span>
      </section>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [page, setPage] = useState<"overview" | "users">("overview");
  const [error, setError] = useState("");
  useEffect(() => {
    const expire = () => {
      setUser(null);
      setPage("overview");
      setError("");
    };
    window.addEventListener(SESSION_EXPIRED, expire);
    return () => window.removeEventListener(SESSION_EXPIRED, expire);
  }, []);
  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null));
  }, []);
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      setPage("overview");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return;
      setError(e instanceof Error ? e.message : "退出失败");
    }
  };
  if (user === undefined)
    return <div className="loading-screen">正在连接工作区…</div>;
  if (!user)
    return (
      <Login
        onLogin={(next) => {
          setError("");
          setUser(next);
        }}
      />
    );
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">
          <span className="workspace-avatar">映</span>
          <div>
            映库工作区<small>内容与知识管理</small>
          </div>
        </div>
        <div className="nav-caption">工作区管理</div>
        <nav>
          <button
            className={page === "overview" ? "active" : ""}
            onClick={() => setPage("overview")}
          >
            <span>▦</span>接入概览
          </button>
          {user.role === "admin" && (
            <button
              className={page === "users" ? "active" : ""}
              onClick={() => setPage("users")}
            >
              <span>♧</span>用户与权限
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot" />
          本地工作区<small>MediaAtlas v0.1</small>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <span>
            工作区 <b>/</b> {page === "overview" ? "接入概览" : "用户与权限"}
          </span>
          <div className="account">
            <span className="user-dot">{user.username[0].toUpperCase()}</span>
            <strong>{user.username}</strong>
            <button onClick={logout}>退出登录</button>
          </div>
        </header>
        <main className="main-content">
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {user.role !== "admin" ? (
            <div className="panel access-note">
              <h1>欢迎回来，{user.username}</h1>
              <p>
                当前角色为{user.role === "editor" ? "编辑者" : "浏览者"}
                ，服务配置由管理员管理。
              </p>
            </div>
          ) : page === "overview" ? (
            <Overview />
          ) : (
            <Users />
          )}
        </main>
      </div>
    </div>
  );
}
