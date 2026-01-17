# Cloudflare Shortener

基于 Cloudflare Workers 和 KV 的短链接服务

## 部署

1. 克隆仓库

```bash
git clone https://github.com/hypooo/cloudflare-shortener.git
cd cloudflare-shortener
```

2. 复制配置文件

```bash
cp wrangler.toml.example wrangler.toml
```

3. 创建 KV 命名空间

```bash
pnpm dlx wrangler kv namespace create LINKS
```

4. 编辑 `wrangler.toml`，填入：
   - `ADMIN_KEY`: 你的管理密码
   - KV 命名空间的 `id`（上一步命令会输出）

5. 部署

```bash
pnpm install
pnpm run deploy
```

## 本地开发

```bash
pnpm run dev
```
