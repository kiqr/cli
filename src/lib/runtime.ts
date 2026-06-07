import {BitnamiRuntimeProvider} from '../providers/BitnamiRuntimeProvider.js';
import type {RuntimeProvider} from '../providers/RuntimeProvider.js';

export type {
  ComposeService,
  RuntimeConfig,
  RuntimeProvider,
} from '../providers/RuntimeProvider.js';

export function createRuntimeProvider(runtime: string = 'bitnami'): RuntimeProvider {
  switch (runtime) {
    case 'bitnami':
      return new BitnamiRuntimeProvider();
    default:
      throw new Error(`Unknown runtime provider: ${runtime}`);
  }
}
