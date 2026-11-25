import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import App from "../src/App";

const connections = [
  {
    id: "chat",
    label: "文本问答",
    provider: "阿里云",
    model: "qwen3.7-plus",
    configured: true,
    historical_probe: { passed: true, tested_at: null },
  },
  {
    id: "text_embedding",
    label: "文本向量",
    provider: "硅基流动",
    model: "BAAI/bge-m3",
    configured: true,
    historical_probe: { passed: true, tested_at: null },
  },
  {
    id: "vision",
    label: "图片理解",
    provider: "待验证",
    model: "qwen3-vl-flash",
    configured: true,
    historical_probe: null,
  },
];

function setup() {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const path = String(url);
    const body = path.endsWith("/auth/me")
      ? {
          id: "owner",
          username: "owner",
          role: "admin",
          workspace_id: "workspace",
        }
      : path.endsWith("/health/ready")
        ? { checks: { database: true, redis: true } }
        : { integrations: connections, bulk_enabled: false, note: "历史记录" };
    return new Response(JSON.stringify(body), { status: 200 });
  });
  render(<App />);
}

test("verification filters distinguish configured but untested services", async () => {
  setup();
  await screen.findByRole("cell", { name: /图片理解/ });
  fireEvent.click(screen.getByRole("button", { name: /验证通过/ }));
  expect(
    screen.queryByRole("cell", { name: /图片理解/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("cell", { name: /文本问答/ })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /需要验证/ }));
  expect(screen.getByRole("cell", { name: /图片理解/ })).toBeVisible();
  expect(
    screen.queryByRole("cell", { name: /文本问答/ }),
  ).not.toBeInTheDocument();
});

test("connections can be found by model name without extra server requests", async () => {
  setup();
  await screen.findByRole("cell", { name: /图片理解/ });
  const callsBefore = vi.mocked(fetch).mock.calls.length;
  fireEvent.change(screen.getByRole("searchbox", { name: "搜索接入" }), {
    target: { value: " BGE-M3 " },
  });
  const table = screen.getByRole("table", { name: "服务接入" });
  expect(within(table).getByRole("cell", { name: /文本向量/ })).toBeVisible();
  expect(
    within(table).queryByRole("cell", { name: /文本问答/ }),
  ).not.toBeInTheDocument();
  expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore);
});

test("an empty search can be cleared to restore the complete connection list", async () => {
  setup();
  await screen.findByRole("cell", { name: /图片理解/ });
  fireEvent.change(screen.getByRole("searchbox", { name: "搜索接入" }), {
    target: { value: "missing-model" },
  });
  expect(screen.getByText("未找到匹配的接入")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "清除筛选" }));
  expect(screen.getByRole("searchbox", { name: "搜索接入" })).toHaveValue("");
  expect(screen.getByRole("cell", { name: /图片理解/ })).toBeVisible();
  expect(screen.getByRole("cell", { name: /文本问答/ })).toBeVisible();
});
