import { useEffect, useState, type FormEvent } from "react";
import { api, type User } from "./api";

const roles = { admin: "管理员", editor: "编辑者", viewer: "浏览者" };

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>("viewer");
  useEffect(() => {
    api<User[]>("/identity/users")
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const user = await api<User>("/identity/users", {
        method: "POST",
        body: JSON.stringify({ username: name, password, role }),
      });
      setUsers((old) => [...old, user]);
      setAdding(false);
      setName("");
      setPassword("");
      setRole("viewer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE / ACCESS</div>
          <h1>用户与权限</h1>
          <p>为工作区成员分配适合的访问范围。</p>
        </div>
        <button className="primary" onClick={() => setAdding(!adding)}>
          {adding ? "收起表单" : "＋ 添加成员"}
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {adding && (
        <form className="panel member-form" onSubmit={submit}>
          <label>
            用户名
            <input
              required
              minLength={3}
              maxLength={64}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label>
            初始密码
            <input
              required
              type="password"
              minLength={8}
              maxLength={256}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label>
            角色
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as User["role"])}
            >
              <option value="viewer">浏览者</option>
              <option value="editor">编辑者</option>
              <option value="admin">管理员</option>
            </select>
          </label>
          <button className="primary" disabled={saving}>
            {saving ? "创建中…" : "创建成员"}
          </button>
        </form>
      )}
      <div className="panel">
        <div className="panel-head">
          <h2>工作区成员</h2>
          <span>{users.length} 位成员</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>成员</th>
                <th>角色</th>
                <th>访问范围</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <span className="user-dot">
                      {user.username[0].toUpperCase()}
                    </span>
                    <strong>{user.username}</strong>
                  </td>
                  <td>
                    <span className="pill neutral">{roles[user.role]}</span>
                  </td>
                  <td>
                    {user.role === "admin"
                      ? "工作区管理、审核与发布"
                      : user.role === "editor"
                        ? "草稿与素材编辑"
                        : "已发布素材"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
