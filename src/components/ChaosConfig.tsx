import React, { useState } from 'react'
import { ProxyConfig, DelayCorruption, StatusCodeCorruption, TimeoutCorruption, ThrottleCorruption } from '../types'
import './ChaosConfig.css'

interface Props {
  config: ProxyConfig
  onChange: (config: ProxyConfig) => void
  statefulMode: boolean
}

type ChaosMode = 'delay' | 'statusCode' | 'timeout' | 'throttle'

function ChaosConfig({ config, onChange, statefulMode }: Props) {
  const [activeMode, setActiveMode] = useState<ChaosMode | null>(null)

  const addDelay = () => {
    onChange({
      ...config,
      delays: [...config.delays, { ms: 1000 }]
    })
  }

  const updateDelay = (index: number, delay: DelayCorruption) => {
    const delays = [...config.delays]
    delays[index] = delay
    onChange({ ...config, delays })
  }

  const removeDelay = (index: number) => {
    onChange({
      ...config,
      delays: config.delays.filter((_, i) => i !== index)
    })
  }

  const addStatusCode = () => {
    onChange({
      ...config,
      statusCodes: [...config.statusCodes, { code: 404 }]
    })
  }

  const updateStatusCode = (index: number, statusCode: StatusCodeCorruption) => {
    const statusCodes = [...config.statusCodes]
    statusCodes[index] = statusCode
    onChange({ ...config, statusCodes })
  }

  const removeStatusCode = (index: number) => {
    onChange({
      ...config,
      statusCodes: config.statusCodes.filter((_, i) => i !== index)
    })
  }

  const addTimeout = () => {
    onChange({
      ...config,
      timeouts: [...config.timeouts, {}]
    })
  }

  const updateTimeout = (index: number, timeout: TimeoutCorruption) => {
    const timeouts = [...config.timeouts]
    timeouts[index] = timeout
    onChange({ ...config, timeouts })
  }

  const removeTimeout = (index: number) => {
    onChange({
      ...config,
      timeouts: config.timeouts.filter((_, i) => i !== index)
    })
  }

  const addThrottle = () => {
    onChange({
      ...config,
      throttles: [...config.throttles, { rate: 100000 }]
    })
  }

  const updateThrottle = (index: number, throttle: ThrottleCorruption) => {
    const throttles = [...config.throttles]
    throttles[index] = throttle
    onChange({ ...config, throttles })
  }

  const removeThrottle = (index: number) => {
    onChange({
      ...config,
      throttles: config.throttles.filter((_, i) => i !== index)
    })
  }

  const renderTargetingFields = (
    value: DelayCorruption | StatusCodeCorruption | TimeoutCorruption | ThrottleCorruption,
    onChange: (value: any) => void,
    showLadder: boolean = false
  ) => {
    // Determine current targeting mode
    const getTargetingMode = () => {
      if (value.i === '*') return 'all'
      if (value.i !== undefined) return 'index'
      if (value.sq !== undefined) return 'sequence'
      if (value.rsq !== undefined) return 'relative'
      if (value.br !== undefined) return 'bitrate'
      if ('l' in value && (value as DelayCorruption).l !== undefined) return 'ladder'
      return 'none'
    }

    const targetingMode = getTargetingMode()

    const handleModeChange = (mode: string) => {
      // Clear all targeting fields first
      const cleared: any = { ...value, i: undefined, sq: undefined, rsq: undefined, br: undefined }
      if ('l' in cleared) cleared.l = undefined

      if (mode === 'all') {
        onChange({ ...cleared, i: '*' })
      } else if (mode === 'index') {
        onChange({ ...cleared, i: 0 })
      } else if (mode === 'sequence') {
        onChange({ ...cleared, sq: 0 })
      } else if (mode === 'relative') {
        onChange({ ...cleared, rsq: 0 })
      } else if (mode === 'bitrate') {
        onChange({ ...cleared, br: 1000000 })
      } else if (mode === 'ladder') {
        onChange({ ...cleared, l: 1 })
      } else {
        onChange(cleared)
      }
    }

    return (
      <div className="targeting-fields">
        <div className="form-group">
          <label className="form-label">Target Segments</label>
          <select
            className="form-select"
            value={targetingMode}
            onChange={(e) => handleModeChange(e.target.value)}
          >
            <option value="none">None (exclude from wildcard)</option>
            <option value="all">All Segments (*)</option>
            <option value="index">Specific Index (i)</option>
            <option value="sequence">Media Sequence (sq)</option>
            {statefulMode && <option value="relative">Relative Sequence (rsq)</option>}
            <option value="bitrate">Bitrate (br)</option>
            {showLadder && <option value="ladder">Playlist Ladder (l)</option>}
          </select>
          <p className="form-hint">
            Select how to target segments for this corruption
          </p>
        </div>

        {targetingMode === 'index' && (
          <div className="form-group">
            <label className="form-label">Segment Index</label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g., 5"
              value={typeof value.i === 'number' ? value.i : ''}
              onChange={(e) => onChange({ ...value, i: e.target.value ? parseInt(e.target.value) : 0 })}
            />
            <p className="form-hint">
              Zero-based index (0 = first segment, 1 = second segment, etc.)
            </p>
          </div>
        )}

        {targetingMode === 'sequence' && (
          <div className="form-group">
            <label className="form-label">Media Sequence Number</label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g., 100"
              value={value.sq || ''}
              onChange={(e) => onChange({ ...value, sq: e.target.value ? parseInt(e.target.value) : undefined })}
            />
            <p className="form-hint">
              For LIVE streams - target segment by sequence number
            </p>
          </div>
        )}

        {targetingMode === 'relative' && statefulMode && (
          <div className="form-group">
            <label className="form-label">Relative Sequence Number</label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g., 10"
              value={value.rsq || ''}
              onChange={(e) => onChange({ ...value, rsq: e.target.value ? parseInt(e.target.value) : undefined })}
            />
            <p className="form-hint">
              Requires stateful mode - target segment relative to current position
            </p>
          </div>
        )}

        {targetingMode === 'bitrate' && (
          <div className="form-group">
            <label className="form-label">Bitrate</label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g., 2000000"
              value={value.br || ''}
              onChange={(e) => onChange({ ...value, br: e.target.value ? parseInt(e.target.value) : undefined })}
            />
            <p className="form-hint">
              Target specific bitrate variant in bits per second
            </p>
          </div>
        )}

        {targetingMode === 'ladder' && showLadder && (
          <div className="form-group">
            <label className="form-label">Playlist Ladder Level</label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g., 1"
              value={'l' in value ? (value as DelayCorruption).l || '' : ''}
              onChange={(e) => onChange({ ...value, l: e.target.value ? parseInt(e.target.value) : undefined })}
            />
            <p className="form-hint">
              HLS only - target media playlist ladder level (0 = highest quality, 1 = next level, etc.)
            </p>
          </div>
        )}

        {targetingMode === 'all' && (
          <p className="form-hint">
            This corruption will apply to all segments. Add additional corruptions with "None" to exclude specific segments.
          </p>
        )}

        {targetingMode === 'none' && (
          <p className="form-hint">
            No targeting - used to exclude segments from wildcard (*) corruptions
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="config-section-group">
      <div className="config-section-header">
        <h3 className="config-section-title">Stream Corruption Configuration</h3>
      </div>

      <div className="chaos-modes">
        <button
          className={`mode-btn ${activeMode === 'delay' ? 'active' : ''}`}
          onClick={() => setActiveMode(activeMode === 'delay' ? null : 'delay')}
        >
          Delay ({config.delays.length})
        </button>
        <button
          className={`mode-btn ${activeMode === 'statusCode' ? 'active' : ''}`}
          onClick={() => setActiveMode(activeMode === 'statusCode' ? null : 'statusCode')}
        >
          Status Code ({config.statusCodes.length})
        </button>
        <button
          className={`mode-btn ${activeMode === 'timeout' ? 'active' : ''}`}
          onClick={() => setActiveMode(activeMode === 'timeout' ? null : 'timeout')}
        >
          Timeout ({config.timeouts.length})
        </button>
        <button
          className={`mode-btn ${activeMode === 'throttle' ? 'active' : ''}`}
          onClick={() => setActiveMode(activeMode === 'throttle' ? null : 'throttle')}
        >
          Throttle ({config.throttles.length})
        </button>
      </div>

      {activeMode === 'delay' && (
        <div className="mode-section">
          <div className="mode-header">
            <h3>Delay Corruptions</h3>
            <button className="btn btn-primary btn-sm" onClick={addDelay}>
              Add Delay
            </button>
          </div>
          {config.delays.map((delay, index) => (
            <div key={index} className="corruption-item">
              <div className="corruption-header">
                <h4>Delay #{index + 1}</h4>
                <button className="btn btn-danger btn-sm" onClick={() => removeDelay(index)}>
                  Remove
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">Delay (milliseconds)</label>
                <input
                  type="number"
                  className="form-input"
                  value={delay.ms}
                  onChange={(e) => updateDelay(index, { ...delay, ms: parseInt(e.target.value) || 0 })}
                />
              </div>
              {renderTargetingFields(delay, (updated) => updateDelay(index, updated), true)}
            </div>
          ))}
          {config.delays.length === 0 && (
            <p className="empty-mode">No delay corruptions configured</p>
          )}
        </div>
      )}

      {activeMode === 'statusCode' && (
        <div className="mode-section">
          <div className="mode-header">
            <h3>Status Code Corruptions</h3>
            <button className="btn btn-primary btn-sm" onClick={addStatusCode}>
              Add Status Code
            </button>
          </div>
          {config.statusCodes.map((statusCode, index) => (
            <div key={index} className="corruption-item">
              <div className="corruption-header">
                <h4>Status Code #{index + 1}</h4>
                <button className="btn btn-danger btn-sm" onClick={() => removeStatusCode(index)}>
                  Remove
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">HTTP Status Code</label>
                <select
                  className="form-select"
                  value={statusCode.code}
                  onChange={(e) => updateStatusCode(index, { ...statusCode, code: parseInt(e.target.value) })}
                >
                  <option value="404">404 Not Found</option>
                  <option value="500">500 Internal Server Error</option>
                  <option value="503">503 Service Unavailable</option>
                  <option value="403">403 Forbidden</option>
                  <option value="401">401 Unauthorized</option>
                </select>
              </div>
              {renderTargetingFields(statusCode, (updated) => updateStatusCode(index, updated))}
            </div>
          ))}
          {config.statusCodes.length === 0 && (
            <p className="empty-mode">No status code corruptions configured</p>
          )}
        </div>
      )}

      {activeMode === 'timeout' && (
        <div className="mode-section">
          <div className="mode-header">
            <h3>Timeout Corruptions</h3>
            <button className="btn btn-primary btn-sm" onClick={addTimeout}>
              Add Timeout
            </button>
          </div>
          {config.timeouts.map((timeout, index) => (
            <div key={index} className="corruption-item">
              <div className="corruption-header">
                <h4>Timeout #{index + 1}</h4>
                <button className="btn btn-danger btn-sm" onClick={() => removeTimeout(index)}>
                  Remove
                </button>
              </div>
              {renderTargetingFields(timeout, (updated) => updateTimeout(index, updated))}
            </div>
          ))}
          {config.timeouts.length === 0 && (
            <p className="empty-mode">No timeout corruptions configured</p>
          )}
        </div>
      )}

      {activeMode === 'throttle' && (
        <div className="mode-section">
          <div className="mode-header">
            <h3>Throttle Corruptions</h3>
            <button className="btn btn-primary btn-sm" onClick={addThrottle}>
              Add Throttle
            </button>
          </div>
          {config.throttles.map((throttle, index) => (
            <div key={index} className="corruption-item">
              <div className="corruption-header">
                <h4>Throttle #{index + 1}</h4>
                <button className="btn btn-danger btn-sm" onClick={() => removeThrottle(index)}>
                  Remove
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">Download Speed (bytes per second)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g., 10000 for 10kB/s"
                  value={throttle.rate || ''}
                  onChange={(e) => updateThrottle(index, { ...throttle, rate: parseInt(e.target.value) || 0 })}
                />
                <p className="form-hint">
                  Bytes per second (e.g., 10000 = 10kB/s, 100000 = 100kB/s)
                </p>
              </div>
              {renderTargetingFields(throttle, (updated) => updateThrottle(index, updated))}
            </div>
          ))}
          {config.throttles.length === 0 && (
            <p className="empty-mode">No throttle corruptions configured</p>
          )}
        </div>
      )}

      {!activeMode && (
        <p className="select-mode">Select a chaos mode above to configure corruptions</p>
      )}
    </div>
  )
}

export default ChaosConfig
