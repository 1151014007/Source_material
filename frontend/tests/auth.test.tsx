import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import App from "../src/App";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("anonymous users see the login page", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    json({ message: "请先登录" }, 401),
  );
  render(<App />);
  expect(await screen.findByLabelText("用户名")).toBeVisible();
  expect(screen.getByLabelText("密码")).toHaveAttribute("type", "password");
});

test("failed login shows the server error and stays on login", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
    String(url).endsWith("/login")
      ? json({ message: "用户名或密码错误" }, 401)
      : json({}, 401),
  );
  render(<App />);
  fireEvent.change(await screen.findByLabelText("用户名"), {
    target: { value: "admin" },
  });
  fireEvent.change(screen.getByLabelText("密码"), {
    target: { value: "wrong-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "登录工作区" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "用户名或密码错误",
  );
  expect(
    screen.queryByRole("heading", { name: "接入概览" }),
  ).not.toBeInTheDocument();
});
