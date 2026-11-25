import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { expect, test, vi } from "vitest";
import App from "../src/App";
import Users from "../src/Users";

const owner = {
  id: "test-owner",
  username: "owner",
  role: "admin",
  workspace_id: "test-workspace",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
const status = {
  integrations: [
    {
      id: "tos",
      label: "对象存储",
      provider: "TOS",
      model: "private",
      configured: true,
      historical_probe: { passed: false, tested_at: "2026-11-25T00:00:00Z" },
    },
  ],
  bulk_enabled: false,
  note: "test",
};

test("expired logout returns to login instead of keeping an unusable identity", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const path = String(url);
    if (path.endsWith("/auth/me")) return json(owner);
    if (path.endsWith("/auth/logout"))
      return json({ message: "登录状态已失效" }, 401);
    if (path.endsWith("/health/ready"))
      return json({ checks: { database: true, redis: true } });
    return json(status);
  });
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "退出登录" }));
  expect(
    await screen.findByRole("heading", { name: "登录工作区" }),
  ).toBeVisible();
});

test("network errors on logout keep identity and allow retry", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const path = String(url);
    if (path.endsWith("/auth/me")) return json(owner);
    if (path.endsWith("/auth/logout")) throw new Error("网络连接失败");
    if (path.endsWith("/health/ready"))
      return json({ checks: { database: true, redis: true } });
    return json(status);
  });
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "退出登录" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("网络连接失败");
  expect(screen.getByRole("heading", { name: "接入概览" })).toBeVisible();
});

test("failed probes are visibly different from untested probes", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
    String(url).endsWith("/auth/me")
      ? json(owner)
      : String(url).endsWith("/health/ready")
        ? json({ checks: { database: true, redis: true } })
        : json(status),
  );
  render(<App />);
  expect(await screen.findByText("验证失败")).toBeVisible();
});

test("readiness refresh is retained even if the authenticated settings endpoint fails", async () => {
  let failed = false;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const path = String(url);
    if (path.endsWith("/auth/me")) return json(owner);
    if (path.endsWith("/health/ready"))
      return json(
        { checks: { database: !failed, redis: true } },
        failed ? 503 : 200,
      );
    return failed ? json({ message: "连接失败" }, 500) : json(status);
  });
  render(<App />);
  const label = await screen.findByText("本地基础服务");
  await waitFor(() =>
    expect(
      within(label.parentElement!).getByText(/2/, { selector: "strong" }),
    ).toHaveTextContent(/2\s*\/\s*2/),
  );
  failed = true;
  fireEvent.click(screen.getByRole("button", { name: "刷新状态" }));
  await waitFor(() =>
    expect(label.parentElement).toHaveTextContent(/1\s*\/\s*2/),
  );
});

test("a completed administrator invitation resets next invitation to viewer", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) =>
    init?.method === "POST"
      ? json({ ...owner, username: "new-admin" }, 201)
      : json([]),
  );
  render(<Users />);
  fireEvent.click(screen.getByRole("button", { name: /添加成员/ }));
  fireEvent.change(screen.getByLabelText("用户名"), {
    target: { value: "new-admin" },
  });
  fireEvent.change(screen.getByLabelText("初始密码"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.change(screen.getByLabelText("角色"), {
    target: { value: "admin" },
  });
  fireEvent.click(screen.getByRole("button", { name: "创建成员" }));
  await waitFor(() =>
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole("button", { name: /添加成员/ }));
  expect(screen.getByRole("combobox")).toHaveValue("viewer");
});
