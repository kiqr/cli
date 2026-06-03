import type {RuntimeProvider} from '../providers/RuntimeProvider.js';
import {BitnamiRuntimeProvider} from '../providers/BitnamiRuntimeProvider.js';

export type {RuntimeProvider} from '../providers/RuntimeProvider.js';
export type {RuntimeConfig, ComposeService} from '../providers/RuntimeProvider.js';

export function createRuntimeProvider(runtime: string = 'bitnami'): RuntimeProvider {
  switch (runtime) {
    case 'bitnami':
      return new BitnamiRuntimeProvider();
    default:
      throw new Error(`Unknown runtime provider: ${runtime}`);
  }
}
