export interface ChaosStreamProxyInstance {
  name: string;
  url: string;
  statefulMode: boolean;
}

export interface DelayCorruption {
  i?: number | '*';      // segment index or '*' for all
  sq?: number;     // media sequence
  rsq?: number;    // relative sequence (stateful only)
  br?: number;     // bitrate
  l?: number;      // ladder level (HLS only)
  ms?: number;     // delay in milliseconds
}

export interface StatusCodeCorruption {
  i?: number | '*';      // segment index or '*' for all
  sq?: number;
  rsq?: number;
  br?: number;
  code?: number;    // HTTP status code
}

export interface TimeoutCorruption {
  i?: number | '*';      // segment index or '*' for all
  sq?: number;
  rsq?: number;
  br?: number;
}

export interface ThrottleCorruption {
  i?: number | '*';      // segment index or '*' for all
  sq?: number;
  rsq?: number;
  br?: number;
  rate?: number;   // throttle speed in bytes per second
}

export interface ProxyConfig {
  sourceUrl: string;
  protocol: 'hls' | 'dash';
  streamType: 'live' | 'vod';
  description?: string;
  delays: DelayCorruption[];
  statusCodes: StatusCodeCorruption[];
  timeouts: TimeoutCorruption[];
  throttles: ThrottleCorruption[];
}
