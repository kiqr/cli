import {type ChildProcess, spawn} from 'node:child_process';
import {Box, Text, useApp} from 'ink';
import {useEffect, useRef, useState} from 'react';
import {readProjectConfig} from '../lib/config.js';
import {isContainerRunning} from '../lib/docker.js';
import {buildProjectHostname} from '../lib/hostname.js';
import {
  buildCloudflaredArgs,
  cloudflaredInstallHint,
  isCloudflaredInstalled,
  parseTunnelUrl,
  TRAEFIK_BASE_URL,
} from '../lib/share.js';
import {containerNameFor} from '../lib/status.js';

export const description =
  'Expose your local site at a public URL via a Cloudflare tunnel';

export default function Share() {
  const {exit} = useApp();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const childRef = useRef<ChildProcess | null>(null);
  // Tracked via a ref because the `exit` handler closes over the effect's
  // initial render and would otherwise never see the URL once it's found.
  const foundUrlRef = useRef(false);

  useEffect(() => {
    let pc: ReturnType<typeof readProjectConfig>;
    try {
      pc = readProjectConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    if (!pc) {
      setError('This project is not initialized. Run "kiqr init" then "kiqr up" first.');
      return;
    }

    const wordpressContainer = containerNameFor(pc.project_id, 'wordpress');
    if (!isContainerRunning(wordpressContainer)) {
      setError('Your site is not running. Run "kiqr up" first.');
      return;
    }

    if (!isCloudflaredInstalled()) {
      setError(
        `cloudflared is required to share your site but was not found on your PATH.\n\n${cloudflaredInstallHint()}`,
      );
      return;
    }

    const hostHeader = buildProjectHostname(pc.name);
    const args = buildCloudflaredArgs(TRAEFIK_BASE_URL, hostHeader);
    const child = spawn('cloudflared', args, {stdio: ['ignore', 'pipe', 'pipe']});
    childRef.current = child;

    const handleData = (chunk: Buffer) => {
      const text = chunk.toString();
      for (const line of text.split('\n')) {
        const url = parseTunnelUrl(line);
        if (url) {
          foundUrlRef.current = true;
          setPublicUrl(url);
          setStarting(false);
        }
      }
    };

    child.stdout?.on('data', handleData);
    child.stderr?.on('data', handleData);

    child.on('error', (err) => {
      setError(`Failed to start cloudflared: ${err.message}`);
    });

    child.on('exit', (code) => {
      childRef.current = null;
      if (code && code !== 0 && !foundUrlRef.current) {
        setError(`cloudflared exited with code ${code}.`);
        return;
      }
      exit();
    });

    return () => {
      childRef.current?.kill('SIGINT');
      childRef.current = null;
    };
  }, []);

  if (error) {
    return (
      <Box flexDirection="column" paddingTop={1}>
        <Text bold color="red">
          Cannot share your site
        </Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (publicUrl) {
    return (
      <Box flexDirection="column" paddingTop={1}>
        <Text bold color="green">
          Your site is live!
        </Text>
        <Text> </Text>
        <Text>🌐 Share this URL:</Text>
        <Text bold color="cyan">
          {publicUrl}
        </Text>
        <Text> </Text>
        <Text dimColor>
          Anyone with this link can reach your local site. Press Ctrl+C to stop sharing.
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text dimColor>
        {starting ? 'Opening a Cloudflare tunnel...' : 'Connecting...'}
      </Text>
    </Box>
  );
}
