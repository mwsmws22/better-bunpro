import { GM, GM_xmlhttpRequest } from '$';
import { alertOnce } from '../report';

/**
 * The only place the script talks to a host other than Bunpro. Every call goes
 * out anonymously, so if you happen to have an account on a dictionary site,
 * looking a word up here is not done as you.
 */

export interface CrossOriginRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

/** Long enough for a slow dictionary, short enough that the next source still gets a turn. */
const TIMEOUT_MS = 8000;

const GM_BRIDGE_TOPIC = 'gm-xmlhttp-request';
const GM_BRIDGE_MESSAGE =
  'Tampermonkey bridge missing (GM_xmlhttpRequest). Update or Reinstall ' +
  'server:Better Bunpro so dictionary audio works.';

type GmXmlHttp = typeof GM_xmlhttpRequest;

interface MonkeyWindowHolder {
  GM_xmlhttpRequest?: GmXmlHttp;
  GM?: { xmlHttpRequest?: GmXmlHttp };
}

export function requestText(request: CrossOriginRequest): Promise<string> {
  return send(request, 'text');
}

export function requestBlob(request: CrossOriginRequest): Promise<Blob> {
  return send(request, 'blob');
}

/**
 * Probe the TM privilege bridge and mirror the result on <html> so page-realm
 * tooling (Firefox MCP) can see it — GM_* is invisible outside the sandbox.
 * Alerts once when missing (stale / un-updated vite-plugin-monkey stub).
 */
export function warnIfGmBridgeMissing(): void {
  if (resolveGmXmlHttpRequest()) {
    document.documentElement.dataset.bbGmBridge = 'ok';
    return;
  }
  document.documentElement.dataset.bbGmBridge = 'missing';
  alertOnce(GM_BRIDGE_TOPIC, GM_BRIDGE_MESSAGE);
}

/**
 * `$` bindings are captured when the vite-plugin-monkey client module loads.
 * Vite's dep optimizer has been seen to leave `__MONKEY_WINDOW_KEY__` unreplaced,
 * so those imports stay undefined even though the stub mounted the real sandbox
 * on `document.__monkeyWindow-*`. Resolve lazily and fall back to that holder.
 */
function resolveGmXmlHttpRequest(): GmXmlHttp | undefined {
  if (typeof GM_xmlhttpRequest === 'function') {
    return GM_xmlhttpRequest;
  }
  if (typeof GM?.xmlHttpRequest === 'function') {
    return GM.xmlHttpRequest as GmXmlHttp;
  }
  return gmXmlFromMonkeyDocument();
}

function gmXmlFromMonkeyDocument(): GmXmlHttp | undefined {
  for (const key of Object.getOwnPropertyNames(document)) {
    if (!key.startsWith('__monkeyWindow-')) {
      continue;
    }
    const holder = (document as unknown as Record<string, MonkeyWindowHolder | undefined>)[key];
    if (typeof holder?.GM_xmlhttpRequest === 'function') {
      return holder.GM_xmlhttpRequest;
    }
    if (typeof holder?.GM?.xmlHttpRequest === 'function') {
      return holder.GM.xmlHttpRequest;
    }
  }
  return undefined;
}

function gmXmlHttpRequest(): GmXmlHttp {
  const request = resolveGmXmlHttpRequest();
  if (request) {
    return request;
  }
  warnIfGmBridgeMissing();
  throw new Error('GM_xmlhttpRequest is not available');
}

function send(request: CrossOriginRequest, responseType: 'text'): Promise<string>;
function send(request: CrossOriginRequest, responseType: 'blob'): Promise<Blob>;
function send(
  { url, method = 'GET', headers, body }: CrossOriginRequest,
  responseType: 'text' | 'blob',
): Promise<string | Blob> {
  return new Promise((resolve, reject) => {
    gmXmlHttpRequest()({
      url,
      method,
      headers,
      data: body,
      responseType,
      anonymous: true,
      timeout: TIMEOUT_MS,
      onload: (response) => {
        if (response.status < 200 || response.status >= 300) {
          reject(new Error(`${url} responded ${response.status}`));
          return;
        }
        resolve(response.response);
      },
      onerror: () => reject(new Error(`${url} could not be reached`)),
      ontimeout: () => reject(new Error(`${url} took longer than ${TIMEOUT_MS}ms`)),
    });
  });
}
