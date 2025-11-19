import React from 'react'
import { ProxyConfig } from '../types'
import './StreamConfig.css'

interface Props {
  config: ProxyConfig
  onChange: (config: ProxyConfig) => void
}

function StreamConfig({ config, onChange }: Props) {
  return (
    <div className="config-section-group">
      <div className="config-section-header">
        <h3 className="config-section-title">Source Stream Configuration</h3>
      </div>

      <div className="form-group">
        <label className="form-label">Source Stream URL</label>
        <input
          type="url"
          className="form-input"
          placeholder="https://example.com/stream/master.m3u8"
          value={config.sourceUrl}
          onChange={(e) => onChange({ ...config, sourceUrl: e.target.value })}
        />
        <p className="form-hint">
          Enter the URL of the HLS or DASH stream you want to proxy
        </p>
      </div>

      <div className="form-group">
        <label className="form-label">Protocol</label>
        <select
          className="form-select"
          value={config.protocol}
          onChange={(e) => onChange({ ...config, protocol: e.target.value as 'hls' | 'dash' })}
        >
          <option value="hls">HLS (HTTP Live Streaming)</option>
          <option value="dash">DASH (MPEG-DASH)</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Stream Type</label>
        <select
          className="form-select"
          value={config.streamType}
          onChange={(e) => onChange({ ...config, streamType: e.target.value as 'live' | 'vod' })}
        >
          <option value="live">Live Stream</option>
          <option value="vod">VOD (Video on Demand)</option>
        </select>
        <p className="form-hint">
          Live streams support sequence-based corruptions (sq, rsq). VOD streams support index-based corruptions (i).
        </p>
      </div>
    </div>
  )
}

export default StreamConfig
