# Agente WhatsApp — Dashboard SaaS

Dashboard SaaS para WhatsApp. Next.js (App Router) + Tailwind CSS en el frontend, Supabase para autenticación y backend, desplegado en Vercel.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Tailwind CSS v4** (configuración CSS-first en `src/app/globals.css`, sin `tailwind.config.js`)
- **Supabase** (auth, Postgres, storage) vía `@supabase/supabase-js` + `@supabase/ssr`
- **Vercel** para el deploy

## Setup local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Ya existe un `.env.local` (gitignorado) con las credenciales del proyecto de Supabase `agente-whatsapp` (región `sa-east-1`). Si necesitas recrearlo, usa `.env.local.example` como plantilla y saca los valores en `Project Settings → API` del [dashboard](https://supabase.com/dashboard/project/aasgdfvvrmlzlohkcmah/settings/api).

3. Arranca el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000).

## MCP (Claude Code)

Este repo incluye `.mcp.json` con dos servidores MCP ya configurados:

- **Supabase** — ya apunta al proyecto `agente-whatsapp` (ref `aasgdfvvrmlzlohkcmah`). Solo necesita `SUPABASE_ACCESS_TOKEN` en tu entorno — un personal access token generado en [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) (ya está guardado como variable de entorno de Windows en esta máquina). No lo pongas directamente en `.mcp.json` ni lo commitees; el archivo lo lee vía `${SUPABASE_ACCESS_TOKEN}` desde tu shell.

- **Context7** — documentación actualizada de librerías/frameworks. Usa la API key guardada en `CONTEXT7_API_KEY` (variable de entorno de Windows) para mejor rate limit.

## Deploy

El proyecto está pensado para desplegarse en Vercel. Configura ahí las mismas variables de `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) en Project Settings → Environment Variables.
