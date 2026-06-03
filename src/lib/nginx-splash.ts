import fs from 'node:fs';
import path from 'node:path';

const NGINX_CONF = `server {
    listen 80;
    server_name _;

    location / {
        root /usr/share/nginx/html;
        try_files /splash.html =404;
    }
}`;

export function writeNginxSplashConf(traefikDir: string): string {
  const filePath = path.join(traefikDir, 'splash-nginx.conf');
  fs.mkdirSync(traefikDir, {recursive: true});
  fs.writeFileSync(filePath, NGINX_CONF, 'utf-8');
  return filePath;
}
