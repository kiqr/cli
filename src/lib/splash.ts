import fs from 'node:fs';
import path from 'node:path';

const SPLASH_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kiqr</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif;
    background: #09090b;
    color: #fafafa;
    overflow: hidden;
  }

  .bg {
    position: fixed; inset: 0; z-index: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% -20%, rgba(120, 80, 255, .15), transparent),
      radial-gradient(ellipse 60% 50% at 80% 50%, rgba(0, 200, 255, .08), transparent),
      radial-gradient(ellipse 50% 40% at 20% 80%, rgba(255, 60, 170, .06), transparent);
  }

  .noise {
    position: fixed; inset: 0; z-index: 1;
    opacity: .03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 128px 128px;
  }

  .container {
    position: relative; z-index: 2;
    max-width: 480px;
    padding: 3rem 2rem;
    text-align: center;
  }

  .logo {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    background: linear-gradient(135deg, #a78bfa, #60a5fa, #a78bfa);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s ease-in-out infinite;
    margin-bottom: 2.5rem;
  }

  @keyframes shimmer {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  h1 {
    font-size: 1.25rem;
    font-weight: 500;
    color: #a1a1aa;
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .hostname {
    display: inline-block;
    font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
    font-size: .85rem;
    color: #71717a;
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 6px;
    padding: .25rem .6rem;
    margin-bottom: 2rem;
  }

  .divider {
    width: 48px;
    height: 1px;
    background: linear-gradient(90deg, transparent, #3f3f46, transparent);
    margin: 2rem auto;
  }

  .instructions {
    text-align: left;
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .instructions p {
    font-size: .85rem;
    color: #a1a1aa;
    margin-bottom: .75rem;
  }

  .instructions code {
    display: block;
    font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
    font-size: .8rem;
    color: #a78bfa;
    background: rgba(120, 80, 255, .08);
    border: 1px solid rgba(120, 80, 255, .12);
    border-radius: 6px;
    padding: .5rem .75rem;
    margin-top: .35rem;
  }

  .footer {
    font-size: .75rem;
    color: #52525b;
  }

  .footer a {
    color: #60a5fa;
    text-decoration: none;
  }

  .footer a:hover {
    text-decoration: underline;
  }

  .pulse {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #ef4444;
    margin-right: 6px;
    animation: pulse 2s ease-in-out infinite;
    vertical-align: middle;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .3; }
  }
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="noise"></div>
  <div class="container">
    <div class="logo">Kiqr</div>
    <h1><span class="pulse"></span>No site is running at this address</h1>
    <div class="hostname" id="hostname"></div>
    <div class="divider"></div>
    <div class="instructions">
      <p>To start a WordPress site, navigate to your theme directory and run:</p>
      <code>kiqr up</code>
    </div>
    <div class="instructions">
      <p>To see all available commands:</p>
      <code>kiqr --help</code>
    </div>
    <div class="footer">
      Powered by <a href="https://github.com/kiqr">Kiqr</a> &mdash; Local WordPress development
    </div>
  </div>
  <script>
    document.getElementById('hostname').textContent = location.host;
  </script>
</body>
</html>`;

export function writeSplashPage(traefikDir: string): string {
  const filePath = path.join(traefikDir, 'splash.html');
  fs.mkdirSync(traefikDir, {recursive: true});
  fs.writeFileSync(filePath, SPLASH_HTML, 'utf-8');
  return filePath;
}
