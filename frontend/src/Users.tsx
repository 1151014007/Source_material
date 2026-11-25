import { useEffect, useState, type FormEvent } from "react";
import { api, type User } from "./api";
import Icon from "./Icon";

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
          <h1>用户与权限</h1>
          <p>管理工作区成员及其访问权限。</p>
        </div>
        <button className="primary" onClick={() => setAdding(!adding)}>
          <Icon name={adding ? "close" : "plus"} />
          {adding ? "收起表单" : "添加成员"}
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
      <section className="members-section" aria-labelledby="members-title">
        <div className="panel-head">
          <h2 id="members-title">
            <Icon name="users" />
            工作区成员<span className="count-badge">{users.length}</span>
          </h2>
          <span>
            <Icon name="shield" />
            角色控制访问范围
          </span>
        </div>
        <div className="table-wrap">
          <table className="members-table" aria-label="工作区成员">
            <thead>
              <tr>
                <th>成员</th>
                <th>角色</th>
                <th>角色说明</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="member-name">
                      <span className="user-avatar">
                        {user.username[0].toUpperCase()}
                      </span>
                      <div>
                        <strong>{user.username}</strong>
                        <small>工作区成员</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={"role-badge role-" + user.role}>
                      <Icon name={user.role === "admin" ? "shield" : "users"} />
                      {roles[user.role]}
                    </span>
                  </td>
                  <td>
                    {user.role === "admin"
                      ? "管理服务配置与工作区成员"
                      : user.role === "editor"
                        ? "编辑权限，无法管理成员"
                        : "浏览权限，无法管理成员"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="list-foot">
          <Icon name="info" />
          <span>新增成员默认使用浏览者角色。仅管理员可以管理工作区成员。</span>
        </div>
      </section>
    </>
  );
}
