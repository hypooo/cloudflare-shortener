/**
 * Cloudflare Workers 短链接管理服务
 */

/**
 * 生成随机短码
 */
function generateShortCode(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // API 路由
        if (path.startsWith('/api/')) {
            return handleApi(request, env, path);
        }

        // 根路径返回管理页面
        if (path === '/' || path === '/index.html') {
            return env.ASSETS.fetch(request);
        }

        // 短链接重定向
        const code = path.slice(1);
        if (code) {
            return handleRedirect(env, code);
        }

        return new Response('Not Found', { status: 404 });
    }
};

/**
 * 处理短链接重定向
 */
async function handleRedirect(env, code) {
    const data = await env.LINKS.get(code);

    if (!data) {
        return new Response('短链接不存在', {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }

    const { url } = JSON.parse(data);
    return Response.redirect(url, 302);
}

/**
 * 处理 API 请求
 */
async function handleApi(request, env, path) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // 登录验证接口
    if (path === '/api/login' && request.method === 'POST') {
        const { key } = await request.json();
        const valid = key === env.ADMIN_KEY;
        return jsonResponse({ success: valid }, corsHeaders);
    }

    // 其他 API 需要认证
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token !== env.ADMIN_KEY) {
        return jsonResponse({ error: '未授权' }, corsHeaders, 401);
    }

    // 获取所有短链接
    if (path === '/api/links' && request.method === 'GET') {
        const list = await env.LINKS.list();
        const links = [];

        for (const key of list.keys) {
            const data = await env.LINKS.get(key.name);
            if (data) {
                const parsed = JSON.parse(data);
                links.push({ code: key.name, ...parsed });
            }
        }

        return jsonResponse({ links }, corsHeaders);
    }

    // 创建短链接
    if (path === '/api/links' && request.method === 'POST') {
        let { code, url } = await request.json();

        if (!url) {
            return jsonResponse({ error: '目标 URL 不能为空' }, corsHeaders, 400);
        }

        // 验证 URL 格式
        try {
            new URL(url);
        } catch {
            return jsonResponse({ error: 'URL 格式无效' }, corsHeaders, 400);
        }

        // 自动生成短码
        if (!code) {
            code = generateShortCode();
        } else if (code.length > 32) {
            return jsonResponse({ error: '短码不能超过 32 个字符' }, corsHeaders, 400);
        }

        // 检查短码是否已存在
        const existing = await env.LINKS.get(code);
        if (existing) {
            return jsonResponse({ error: '短码已存在' }, corsHeaders, 400);
        }

        const data = {
            url,
            createdAt: new Date().toISOString()
        };

        await env.LINKS.put(code, JSON.stringify(data));
        return jsonResponse({ success: true, code, url }, corsHeaders);
    }

    // 删除短链接
    if (path.startsWith('/api/links/') && request.method === 'DELETE') {
        const code = path.replace('/api/links/', '');
        await env.LINKS.delete(code);
        return jsonResponse({ success: true }, corsHeaders);
    }

    return jsonResponse({ error: '未知接口' }, corsHeaders, 404);
}

/**
 * JSON 响应辅助函数
 */
function jsonResponse(data, corsHeaders, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
        }
    });
}
