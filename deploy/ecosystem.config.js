// ---------------------------------------------------------------------------
// PM2 process definitions for all three apps.
//
// Run from the project root, after sourcing deploy/deploy.env:
//   pm2 start deploy/ecosystem.config.js
//   pm2 save
//
// Ports come from the shell environment (deploy.sh sources deploy/deploy.env
// before calling pm2), with the project's development defaults as fallbacks.
// Nothing here listens on a public interface: Nginx proxies to 127.0.0.1.
// ---------------------------------------------------------------------------

const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FRONTEND_PORT = process.env.FRONTEND_PORT || '3000';
const ADMIN_PORT = process.env.ADMIN_PORT || '3001';
const BACKEND_PORT = process.env.BACKEND_PORT || '5000';

// `next start` is invoked through Next's own bin rather than `npm start` so
// PM2 supervises the Node process directly. With `npm` as the script, PM2
// watches the npm wrapper instead, and a crashed Next server can be left
// behind as an orphan that still holds the port.
const nextBin = (app) =>
  path.join(ROOT, app, 'node_modules', 'next', 'dist', 'bin', 'next');

module.exports = {
  apps: [
    {
      name: 'ump-backend',
      cwd: path.join(ROOT, 'backend'),
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      // A crash loop from a bad MONGO_URI would otherwise restart forever at
      // full speed and fill the logs within minutes.
      restart_delay: 4000,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: BACKEND_PORT,
      },
      error_file: '/var/log/ump/backend-error.log',
      out_file: '/var/log/ump/backend-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'ump-frontend',
      cwd: path.join(ROOT, 'frontend'),
      script: nextBin('frontend'),
      args: `start -p ${FRONTEND_PORT}`,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      restart_delay: 4000,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: FRONTEND_PORT,
      },
      error_file: '/var/log/ump/frontend-error.log',
      out_file: '/var/log/ump/frontend-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'ump-admin',
      cwd: path.join(ROOT, 'admin-dashboard'),
      script: nextBin('admin-dashboard'),
      args: `start -p ${ADMIN_PORT}`,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      restart_delay: 4000,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: ADMIN_PORT,
      },
      error_file: '/var/log/ump/admin-error.log',
      out_file: '/var/log/ump/admin-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
