import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, SESSION_EXPIRED, type User } from "./api";
import Icon from "./Icon";
import Overview from "./Overview";
import Users from "./Users";

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Icon name="layers" />
      </span>
      <span>
        MediaAtlas<small>映库工作区</small>
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
      <header className="login-header">
        <Brand />
        <span className="environment-label">
          <span className="status-dot" />
          本地工作区
        </span>
      </header>
      <section className="login-center" aria-labelledby="login-title">
        <div className="login-emblem">
          <Icon name="layers" />
        </div>
        <h1 id="login-title">登录工作区</h1>
        <p className="login-description">继续使用你的 MediaAtlas 账号。</p>
        <form className="login-form" onSubmit={submit}>
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
            <Icon name="arrow" />
          </button>
        </form>
        <div className="login-note">
          <Icon name="lock" />
          仅限已授权的工作区成员
        </div>
      </section>
      <footer className="login-footer">
        <span>文档 · 图片 · 音频 · 视频</span>
        <span>MediaAtlas</span>
      </footer>
    </main>
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
    return (
      <div className="loading-screen">
        <span className="loading-ring" />
        正在连接工作区…
      </div>
    );
  if (!user)
    return (
      <Login
        onLogin={(next) => {
          setError("");
          setUser(next);
        }}
      />
    );
  const title = page === "overview" ? "接入概览" : "用户与权限";
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">
          <span className="workspace-avatar">映</span>
          <span>映库工作区</span>
          <span className="local-tag">本地</span>
        </div>
        <div className="nav-caption">工作区</div>
        <nav className="sidebar-nav" aria-label="工作区导航">
          <button
            className={page === "overview" ? "active" : ""}
            aria-label="接入概览"
            aria-current={page === "overview" ? "page" : undefined}
            onClick={() => setPage("overview")}
          >
            <Icon name="connections" />
            <span>接入概览</span>
          </button>
          {user.role === "admin" && (
            <button
              className={page === "users" ? "active" : ""}
              aria-label="用户与权限"
              aria-current={page === "users" ? "page" : undefined}
              onClick={() => setPage("users")}
            >
              <Icon name="users" />
              <span>用户与权限</span>
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-presence">
            <span className="status-dot" />
            <span>本地工作区</span>
            <code>v0.1</code>
          </div>
          <div className="account">
            <span className="user-avatar">
              {user.username[0].toUpperCase()}
            </span>
            <div>
              <strong>{user.username}</strong>
              <small>
                {user.role === "admin"
                  ? "管理员"
                  : user.role === "editor"
                    ? "编辑者"
                    : "浏览者"}
              </small>
            </div>
            <button
              className="icon-button"
              aria-label="退出登录"
              title="退出登录"
              onClick={logout}
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <Icon name="layers" />
            <span>工作区</span>
            <Icon name="chevron" />
            <strong>{title}</strong>
          </div>
          <span className="environment-label">
            <span className="status-dot" />
            本地环境
          </span>
        </header>
        <main className="main-content" id="workspace-content">
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {user.role !== "admin" ? (
            <div className="access-note">
              <span className="access-emblem">
                <Icon name="shield" />
              </span>
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
        <footer className="workspace-footer">
          <span>
            MediaAtlas <span className="footer-divider">/</span>{" "}
            素材与知识工作区
          </span>
          <span>
            <Icon name="lock" />
            私有工作区
          </span>
        </footer>
      </div>
    </div>
  );
}
