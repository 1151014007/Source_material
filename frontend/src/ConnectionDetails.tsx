import { useEffect, useRef, useState } from "react";
import type { Integration } from "./api";
import Icon from "./Icon";

export default function ConnectionDetails({
  item,
  onClose,
}: {
  item: Integration;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(
    document.activeElement as HTMLElement | null,
  );
  const [modal, setModal] = useState(() => window.innerWidth <= 760);
  useEffect(() => {
    const resize = () => setModal(window.innerWidth <= 760);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    if (modal) closeRef.current?.focus();
  }, [modal]);
  useEffect(() => {
    const trigger = triggerRef.current;
    closeRef.current?.focus();
    return () => {
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  const probe = item.historical_probe;
  return (
    <>
      {modal && (
        <div className="peek-backdrop" aria-hidden="true" onClick={onClose} />
      )}
      <aside
        className="connection-peek"
        role="dialog"
        aria-modal={modal}
        aria-labelledby="connection-detail-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
          if (modal && event.key === "Tab") {
            const controls = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
              ),
            );
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header className="peek-header">
          <span>
            <Icon name="connections" />
            接入详情
          </span>
          <button
            ref={closeRef}
            className="icon-button"
            onClick={onClose}
            aria-label="关闭接入详情"
            title="关闭 · Esc"
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="peek-content">
          <span className="peek-emblem">
            <Icon name={item.id === "tos" ? "storage" : "connections"} />
          </span>
          <h2 id="connection-detail-title">{item.label}</h2>
          <p>{item.provider}</p>
          <dl>
            <div>
              <dt>模型 / 存储</dt>
              <dd>
                <code>{item.model}</code>
              </dd>
            </div>
            <div>
              <dt>配置状态</dt>
              <dd>{item.configured ? "已填写" : "待配置"}</dd>
            </div>
            <div>
              <dt>历史验证</dt>
              <dd
                className={
                  probe?.passed ? "detail-passed" : probe ? "detail-failed" : ""
                }
              >
                {probe?.passed ? "小样通过" : probe ? "验证失败" : "尚未验证"}
              </dd>
            </div>
            <div>
              <dt>验证时间</dt>
              <dd>
                {probe?.tested_at
                  ? new Date(probe.tested_at).toLocaleString("zh-CN")
                  : "未记录"}
              </dd>
            </div>
          </dl>
          <div className="peek-note">
            <Icon name="info" />
            <p>
              历史小样记录用于确认已有联调结果，不代表当前服务实时可用。查看详情不会调用模型。
            </p>
          </div>
        </div>
        <footer className="peek-footer">
          <kbd>Esc</kbd>关闭详情，返回列表
        </footer>
      </aside>
    </>
  );
}
