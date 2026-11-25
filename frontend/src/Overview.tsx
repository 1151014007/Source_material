import { useCallback, useEffect, useRef, useState } from "react";
import { api, type IntegrationStatus } from "./api";
import Icon, { type IconName } from "./Icon";
import ConnectionDetails from "./ConnectionDetails";

const serviceIcons: Record<string, IconName> = {
  chat: "text",
  text_embedding: "vector",
  asr: "audio",
  tos: "storage",
  vision: "image",
  visual_embedding: "scan",
};
type Filter = "all" | "verified" | "unverified";

export default function Overview() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [health, setHealth] = useState<{
    checks: Record<string, boolean>;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const [integrations, readiness] = await Promise.allSettled([
        api<IntegrationStatus>("/system/integrations"),
        fetch("/health/ready").then(async (r) => {
          const result = await r.json();
          if (
            typeof result?.checks?.database !== "boolean" ||
            typeof result?.checks?.redis !== "boolean"
          )
            throw new Error("健康信息读取失败");
          return result;
        }),
      ]);
      if (current === generation.current) {
        if (integrations.status === "fulfilled") {
          setStatus(integrations.value);
          setStale(false);
        } else setStale(true);
        if (readiness.status === "fulfilled" && readiness.value?.checks)
          setHealth(readiness.value);
        else setHealth(null);
        if (
          integrations.status === "rejected" ||
          readiness.status === "rejected"
        )
          setError(
            "部分服务信息读取失败，可重试；健康状态仅显示本次已返回的结果。",
          );
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
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (target instanceof HTMLElement &&
          (target.matches("input, textarea, select") ||
            target.isContentEditable))
      )
        return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  const items = status?.integrations ?? [];
  const tested = items.filter((item) => item.historical_probe?.passed).length;
  const localReady = health
    ? Object.values(health.checks).filter(Boolean).length
    : 0;
  const search = query.trim().toLocaleLowerCase();
  const selected = items.find((item) => item.id === selectedId);
  const visible = items.filter((item) => {
    const passed = item.historical_probe?.passed === true;
    return (
      (filter === "all" || (filter === "verified" ? passed : !passed)) &&
      [item.label, item.provider, item.model, item.id].some((value) =>
        value.toLocaleLowerCase().includes(search),
      )
    );
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>接入概览</h1>
          <p>管理模型、存储与基础服务的连接。</p>
        </div>
        <div className="header-actions">
          <span className="update-status" role="status">
            {busy ? "正在更新…" : stale && status ? "显示上次结果" : ""}
          </span>
          <button
            className="secondary"
            aria-label="刷新状态"
            disabled={busy}
            onClick={load}
          >
            <Icon name="refresh" className={busy ? "spinning" : ""} />
            {busy ? "刷新中…" : "刷新状态"}
          </button>
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="metrics" aria-busy={busy}>
        <div className="metric">
          <span>本地基础服务</span>
          <strong>
            {health ? localReady : "—"}
            <small> / 2</small>
          </strong>
          <p>
            <span
              className={
                health && localReady === 2 ? "status-dot" : "status-dot muted"
              }
            />
            {health
              ? localReady === 2
                ? "全部可用"
                : "部分服务异常"
              : "正在检查"}
          </p>
        </div>
        <div className="metric">
          <span>已完成小样验证</span>
          <strong>
            {status ? tested : "—"}
            <small> / {status ? items.length : "—"}</small>
          </strong>
          <p>基于已有验证记录</p>
        </div>
        <div className="metric">
          <span>云端批量处理</span>
          <strong className="text-value">
            {status ? (status.bulk_enabled ? "已启用" : "已关闭") : "—"}
          </strong>
          <p>
            <Icon name="shield" />
            按需调用
          </p>
        </div>
      </div>
      <section
        className="connections-section"
        aria-labelledby="connections-title"
        aria-busy={busy}
      >
        <div className="section-title">
          <h2 id="connections-title">
            <Icon name="connections" />
            服务接入
            <span className="count-badge">{status ? items.length : "—"}</span>
          </h2>
          <span>配置与验证记录</span>
        </div>
        <div className="list-toolbar">
          <div className="view-tabs" role="group" aria-label="验证状态筛选">
            {(
              [
                ["all", "全部接入", items.length],
                ["verified", "验证通过", tested],
                ["unverified", "需要验证", items.length - tested],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
                <span>{status ? count : "—"}</span>
              </button>
            ))}
          </div>
          <label className="search-field">
            <Icon name="search" />
            <input
              ref={searchRef}
              type="search"
              aria-label="搜索接入"
              placeholder="搜索接入…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setQuery("");
                }
              }}
            />
            <kbd>/</kbd>
          </label>
        </div>
        <div className="table-wrap">
          <table className="connections-table" aria-label="服务接入">
            <thead>
              <tr>
                <th>能力 / 服务商</th>
                <th>模型 / 存储</th>
                <th>配置</th>
                <th>最近验证</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr
                  key={item.id}
                  className={selectedId === item.id ? "selected-row" : ""}
                >
                  <td>
                    <button
                      className="service-name service-trigger"
                      aria-label={"查看" + item.label + "详情"}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <span className="service-icon">
                        <Icon name={serviceIcons[item.id] ?? "connections"} />
                      </span>
                      <span className="service-label">
                        <strong>{item.label}</strong>
                        <small>{item.provider}</small>
                      </span>
                      <Icon name="chevron" className="row-chevron" />
                    </button>
                  </td>
                  <td>
                    <code title={item.model}>{item.model}</code>
                  </td>
                  <td>
                    <span
                      className={
                        "config-status " +
                        (item.configured ? "configured" : "pending")
                      }
                    >
                      <span className="status-dot" />
                      {item.configured ? "已填写" : "待配置"}
                    </span>
                  </td>
                  <td>
                    {item.historical_probe?.passed ? (
                      <span className="probe-result">
                        <span>
                          <Icon name="check" />
                          小样通过
                        </span>
                        <small>
                          {item.historical_probe.tested_at
                            ? new Date(
                                item.historical_probe.tested_at,
                              ).toLocaleDateString("zh-CN")
                            : "未记录验证时间"}
                        </small>
                      </span>
                    ) : item.historical_probe ? (
                      <span className="probe-failed">
                        <Icon name="close" />
                        验证失败
                      </span>
                    ) : (
                      <span className="muted-text">
                        <span className="unverified-ring" />
                        尚未验证
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    <div className="empty-state">
                      {!status ? (
                        <>
                          <span
                            className={
                              busy ? "loading-ring" : "status-dot muted"
                            }
                          />
                          <p>
                            {error ? "接入信息暂不可用" : "正在读取接入信息…"}
                          </p>
                        </>
                      ) : (
                        <>
                          <Icon name="search" />
                          <p>未找到匹配的接入</p>
                          <button
                            className="text-button"
                            onClick={() => {
                              setQuery("");
                              setFilter("all");
                            }}
                          >
                            清除筛选
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="list-foot">
          <Icon name="info" />
          <span>
            {status?.note ||
              (error ? "接入信息读取失败，请重试。" : "正在读取接入信息…")}
          </span>
        </div>
        {stale && status && (
          <div className="stale-note">
            接入信息更新失败，当前列表保留上次结果。
          </div>
        )}
      </section>
      <section className="runtime-section" aria-labelledby="runtime-title">
        <div className="section-title">
          <h2 id="runtime-title">本地服务</h2>
          <span>当前连接检查</span>
        </div>
        <div className="runtime-list">
          {(
            [
              {
                key: "database",
                name: "PostgreSQL",
                detail: "关系数据与向量存储",
                icon: "database",
              },
              {
                key: "redis",
                name: "Redis",
                detail: "缓存与队列服务",
                icon: "queue",
              },
            ] as const
          ).map((service) => (
            <div className="runtime-item" key={service.key}>
              <span className="runtime-icon">
                <Icon name={service.icon} />
              </span>
              <div>
                <strong>{service.name}</strong>
                <small>{service.detail}</small>
              </div>
              <span
                className={
                  "runtime-status " +
                  (health?.checks[service.key] ? "healthy" : "")
                }
              >
                <span
                  className={
                    health?.checks[service.key]
                      ? "status-dot"
                      : "status-dot muted"
                  }
                />
                {health
                  ? health.checks[service.key]
                    ? "可用"
                    : "异常"
                  : "待检查"}
              </span>
            </div>
          ))}
        </div>
      </section>
      {selected && (
        <ConnectionDetails
          item={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
