import { useState, useEffect } from 'react'
import { listProxyConfigurations, deleteProxyConfiguration, saveProxyConfiguration, ProxyConfiguration, listChaosProxyInstances, createChaosProxyInstance, deleteChaosProxyInstance, validateChaosProxyUrl } from '../services/osc'
import { ChaosStreamProxyInstance, ProxyConfig } from '../types'
import StreamConfig from './StreamConfig'
import ChaosConfig from './ChaosConfig'
import UrlGenerator from './UrlGenerator'
import './ConfigurationManager.css'

interface Props {
  selectedInstance: ChaosStreamProxyInstance | null
  onInstanceSelect: (instance: ChaosStreamProxyInstance | null) => void
}

type SelectionMode = 'manual' | 'osc'
type ValidationState = 'idle' | 'validating' | 'success' | 'error'

function ConfigurationManager({ selectedInstance, onInstanceSelect }: Props) {
  const [configurations, setConfigurations] = useState<ProxyConfiguration[]>([])
  const [loading, setLoading] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ProxyConfiguration | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  // Instance selection state
  const [showInstanceSelector, setShowInstanceSelector] = useState(false)
  const [mode, setMode] = useState<SelectionMode>('manual')
  const [instances, setInstances] = useState<ChaosStreamProxyInstance[]>([])
  const [loadingInstances, setLoadingInstances] = useState(false)
  const [instancesError, setInstancesError] = useState<string>('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newInstanceName, setNewInstanceName] = useState('')
  const [statefulMode, setStatefulMode] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [manualStatefulMode, setManualStatefulMode] = useState(true)
  const [validationState, setValidationState] = useState<ValidationState>('idle')
  const [validationMessage, setValidationMessage] = useState('')
  const [validationOverride, setValidationOverride] = useState(false)

  // OSC Token state
  const [oscToken, setOscToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [tokenConfigured, setTokenConfigured] = useState(false)
  const [tokenError, setTokenError] = useState('')

  // Edit state
  const [configName, setConfigName] = useState('')
  const [config, setConfig] = useState<ProxyConfig>({
    sourceUrl: '',
    protocol: 'hls',
    streamType: 'live',
    delays: [],
    statusCodes: [],
    timeouts: [],
    throttles: []
  })

  useEffect(() => {
    loadConfigurations()
    checkTokenStatus()
  }, [])

  useEffect(() => {
    if (mode === 'osc' && tokenConfigured && showInstanceSelector) {
      loadInstances()
    }
  }, [mode, tokenConfigured, showInstanceSelector])

  const checkTokenStatus = async () => {
    try {
      const response = await fetch('/api/auth/token/status')
      const data = await response.json()
      setTokenConfigured(data.configured)
    } catch (error) {
      console.error('Failed to check token status:', error)
    }
  }

  const handleSaveToken = async () => {
    if (!oscToken.trim()) {
      setTokenError('Please enter your OSC access token')
      return
    }

    setTokenError('')

    try {
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: oscToken.trim() })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save token')
      }

      setTokenConfigured(true)
      setOscToken('')
      loadInstances()
    } catch (error) {
      console.error('Failed to save token:', error)
      setTokenError(error instanceof Error ? error.message : 'Failed to save token')
    }
  }

  const handleClearToken = async () => {
    if (!confirm('Are you sure you want to clear your OSC access token?')) {
      return
    }

    setTokenError('')

    try {
      const response = await fetch('/api/auth/token', {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to clear token')
      }

      setTokenConfigured(false)
      setOscToken('')
    } catch (error) {
      console.error('Failed to clear token:', error)
      setTokenError(error instanceof Error ? error.message : 'Failed to clear token')
    }
  }

  const loadConfigurations = async () => {
    setLoading(true)
    try {
      const configs = await listProxyConfigurations()
      setConfigurations(configs)
    } catch (err) {
      console.error('Failed to load configurations:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadInstances = async () => {
    setLoadingInstances(true)
    setInstancesError('')
    try {
      const list = await listChaosProxyInstances()
      setInstances(list)
      setInstancesError('')
    } catch (error) {
      console.error('Failed to load instances:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load instances'
      setInstancesError(errorMessage)
      setInstances([])
    } finally {
      setLoadingInstances(false)
    }
  }

  const handleManualSubmit = async () => {
    if (!manualUrl.trim()) {
      setValidationState('error')
      setValidationMessage('Please enter a Chaos Stream Proxy URL')
      return
    }

    // Validate URL format
    try {
      new URL(manualUrl)
    } catch {
      setValidationState('error')
      setValidationMessage('Please enter a valid URL (e.g., https://example.com)')
      return
    }

    // Validate that the proxy is responding
    setValidationState('validating')
    setValidationMessage('Checking if proxy is responding...')

    try {
      const result = await validateChaosProxyUrl(manualUrl)

      if (result.valid) {
        setValidationState('success')
        setValidationMessage(`Success! ${result.message} (Status: ${result.statusCode})`)
        setValidationOverride(false)

        const manualInstance: ChaosStreamProxyInstance = {
          name: 'manual',
          url: manualUrl,
          statefulMode: manualStatefulMode
        }

        onInstanceSelect(manualInstance)
        setShowInstanceSelector(false)
      } else {
        setValidationState('error')
        setValidationMessage(`Validation failed: ${result.message}`)
        setValidationOverride(false)
      }
    } catch (error) {
      setValidationState('error')
      setValidationMessage(error instanceof Error ? error.message : 'Failed to validate proxy URL')
      setValidationOverride(false)
    }
  }

  const handleManualOverride = () => {
    if (!manualUrl.trim()) {
      alert('Please enter a URL first')
      return
    }

    try {
      new URL(manualUrl)
    } catch {
      alert('Please enter a valid URL format')
      return
    }

    const manualInstance: ChaosStreamProxyInstance = {
      name: 'manual',
      url: manualUrl,
      statefulMode: manualStatefulMode
    }

    onInstanceSelect(manualInstance)
    setShowInstanceSelector(false)
    setValidationState('idle')
    setValidationMessage('')
    setValidationOverride(false)
  }

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) {
      alert('Please enter an instance name')
      return
    }

    setLoadingInstances(true)
    try {
      const instance = await createChaosProxyInstance(newInstanceName, statefulMode)
      await loadInstances()
      onInstanceSelect(instance)
      setShowCreateForm(false)
      setNewInstanceName('')
      setStatefulMode(false)
      setShowInstanceSelector(false)
    } catch (error) {
      alert(`Failed to create instance: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoadingInstances(false)
    }
  }

  const handleDeleteInstance = async (instanceName: string) => {
    if (!confirm(`Are you sure you want to delete instance "${instanceName}"?`)) {
      return
    }

    try {
      await deleteChaosProxyInstance(instanceName)
      await loadInstances()
      if (selectedInstance?.name === instanceName) {
        onInstanceSelect(null)
      }
    } catch (error) {
      alert(`Failed to delete instance: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCreateNew = () => {
    setIsCreatingNew(true)
    setEditingConfig(null)
    setConfigName('')
    setConfig({
      sourceUrl: '',
      protocol: 'hls',
      streamType: 'live',
      description: '',
      delays: [],
      statusCodes: [],
      timeouts: [],
      throttles: []
    })
    // Show instance selector only if no instance is selected, otherwise hide it
    setShowInstanceSelector(!selectedInstance)
  }

  const handleEdit = (configuration: ProxyConfiguration) => {
    setIsCreatingNew(false)
    setEditingConfig(configuration)
    setConfigName(configuration.name)
    setConfig({
      sourceUrl: configuration.sourceUrl,
      protocol: configuration.protocol,
      streamType: configuration.streamType || 'live', // Default to 'live' for backwards compatibility
      description: configuration.description || '',
      delays: configuration.delays,
      statusCodes: configuration.statusCodes,
      timeouts: configuration.timeouts,
      throttles: configuration.throttles
    })

    // Hide the instance selector when opening edit mode
    setShowInstanceSelector(false)

    // If the current selected instance doesn't match the config's instance,
    // set the instance from the configuration
    if (!selectedInstance || selectedInstance.url !== configuration.instanceUrl) {
      const configInstance: ChaosStreamProxyInstance = {
        name: 'loaded',
        url: configuration.instanceUrl,
        statefulMode: true
      }
      onInstanceSelect(configInstance)
    }
  }

  const handleDuplicate = (configuration: ProxyConfiguration) => {
    setIsCreatingNew(true)
    setEditingConfig(null)
    setConfigName(`${configuration.name}-copy`)
    setConfig({
      sourceUrl: configuration.sourceUrl,
      protocol: configuration.protocol,
      streamType: configuration.streamType || 'live',
      description: configuration.description || '',
      delays: configuration.delays,
      statusCodes: configuration.statusCodes,
      timeouts: configuration.timeouts,
      throttles: configuration.throttles
    })

    // Hide the instance selector when duplicating
    setShowInstanceSelector(false)

    // Set the instance from the configuration
    const configInstance: ChaosStreamProxyInstance = {
      name: 'loaded',
      url: configuration.instanceUrl,
      statefulMode: true
    }
    onInstanceSelect(configInstance)
  }

  const handleCancelEdit = () => {
    setIsCreatingNew(false)
    setEditingConfig(null)
  }

  const handleSaveComplete = async () => {
    await loadConfigurations()
    setIsCreatingNew(false)
    setEditingConfig(null)
  }

  const handleDelete = async (configuration: ProxyConfiguration) => {
    if (!confirm(`Are you sure you want to delete configuration "${configuration.name}" (${configuration.protocol.toUpperCase()})?`)) {
      return
    }

    try {
      await deleteProxyConfiguration(configuration.name, configuration.protocol)
      await loadConfigurations()
    } catch (err) {
      alert(`Failed to delete configuration: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const copyRedirectUrl = async (configuration: ProxyConfiguration) => {
    const url = configuration.redirectUrl || ''

    try {
      await navigator.clipboard.writeText(url)
      alert('Redirect URL copied to clipboard!')
    } catch (err) {
      alert('Failed to copy to clipboard')
    }
  }

  const getRedirectUrl = (configuration: ProxyConfiguration) => {
    return configuration.redirectUrl || ''
  }

  const getProxyUrl = (configuration: ProxyConfiguration) => {
    return configuration.proxyUrl || ''
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert(`${label} copied to clipboard!`)
    } catch (err) {
      alert('Failed to copy to clipboard')
    }
  }

  // Render instance selector content (without wrapper section)
  const renderInstanceSelector = () => (
    <div className="instance-selector-content">
          <div className="mode-selector">
            <button
              className={`btn btn-sm ${mode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('manual')}
            >
              Manual URL
            </button>
            <button
              className={`btn btn-sm ${mode === 'osc' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('osc')}
            >
              OSC Instances
            </button>
          </div>

          {mode === 'manual' && (
            <div className="manual-entry">
              <div className="form-group">
                <label className="form-label">Chaos Stream Proxy URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://your-proxy-url.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={manualStatefulMode}
                    onChange={(e) => setManualStatefulMode(e.target.checked)}
                  />
                  {' '}Stateful Mode (enables sequence-based corruptions)
                </label>
              </div>

              {validationMessage && (
                <div className={`validation-message ${validationState}`}>
                  {validationMessage}
                </div>
              )}

              <div className="button-group">
                <button
                  className="btn btn-primary"
                  onClick={handleManualSubmit}
                  disabled={validationState === 'validating'}
                >
                  {validationState === 'validating' ? 'Validating...' : 'Validate & Use'}
                </button>
                {validationState === 'error' && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleManualOverride}
                  >
                    Use Anyway (Override)
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowInstanceSelector(false)
                    setValidationState('idle')
                    setValidationMessage('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mode === 'osc' && (
            <div className="osc-instances">
              {/* OSC Token Configuration */}
              {!tokenConfigured ? (
                <div className="token-config-inline">
                  <p className="token-info-text">
                    Enter your OSC personal access token to manage instances.{' '}
                    <a href="https://app.osaas.io/personal-access-token" target="_blank" rel="noopener noreferrer">
                      Get your token
                    </a>
                  </p>

                  {tokenError && (
                    <div className="validation-message error">
                      {tokenError}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Personal Access Token</label>
                    <div className="token-input-wrapper">
                      <input
                        type={showToken ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Enter your OSC access token"
                        value={oscToken}
                        onChange={(e) => setOscToken(e.target.value)}
                      />
                      <button
                        className="btn-toggle-visibility"
                        onClick={() => setShowToken(!showToken)}
                        type="button"
                      >
                        {showToken ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleSaveToken}
                    disabled={!oscToken.trim()}
                  >
                    Save Token & Load Instances
                  </button>
                </div>
              ) : (
                <>
                  <div className="token-status-inline">
                    <span className="status-text">✓ OSC Token Configured</span>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={handleClearToken}
                    >
                      Clear Token
                    </button>
                  </div>

                  {!showCreateForm && (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => setShowCreateForm(true)}
                      style={{ marginBottom: '1rem' }}
                    >
                      Create New Instance
                    </button>
                  )}
                </>
              )}

              {showCreateForm && (
                <div className="create-instance-form">
                  <h4>Create New Instance</h4>
                  <div className="form-group">
                    <label className="form-label">Instance Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newInstanceName}
                      onChange={(e) => setNewInstanceName(e.target.value)}
                      placeholder="my-chaos-proxy"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        checked={statefulMode}
                        onChange={(e) => setStatefulMode(e.target.checked)}
                      />
                      {' '}Stateful Mode
                    </label>
                  </div>
                  <div className="button-group">
                    <button
                      className="btn btn-success"
                      onClick={handleCreateInstance}
                      disabled={loadingInstances}
                    >
                      {loadingInstances ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowCreateForm(false)
                        setNewInstanceName('')
                        setStatefulMode(false)
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {loadingInstances && <div className="loading-message">Loading instances...</div>}

              {!loadingInstances && instancesError && (
                <div className="validation-message error">
                  <strong>Error loading instances:</strong> {instancesError}
                  {instancesError.toLowerCase().includes('token') && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.9em' }}>
                      This usually means your OSC Personal Access Token is invalid or expired.
                      Please clear the token above and enter a new one.
                    </div>
                  )}
                </div>
              )}

              {!loadingInstances && !instancesError && instances.length === 0 && !showCreateForm && (
                <div className="empty-state">No instances found. Create one to get started.</div>
              )}

              {!loadingInstances && instances.length > 0 && (
                <div className="instances-list">
                  {instances.map((instance) => (
                    <div key={instance.name} className="instance-item">
                      <div className="instance-info">
                        <strong>{instance.name}</strong>
                        <div className="instance-url">{instance.url}</div>
                      </div>
                      <div className="instance-actions">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            onInstanceSelect(instance)
                            setShowInstanceSelector(false)
                          }}
                        >
                          Select
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteInstance(instance.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
    </div>
  )

  // If editing or creating, show the edit form
  if (isCreatingNew || editingConfig) {
    // Always use selectedInstance (which gets set/updated when editing)
    const instance = selectedInstance

    return (
      <div className="section configuration-manager">
        <div className="section-header">
          <h2 className="section-title">
            {isCreatingNew ? 'Create New Configuration' : `Edit: ${editingConfig?.name} (${editingConfig?.protocol.toUpperCase()})`}
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>
            Cancel
          </button>
        </div>

        {/* Integrated proxy selector */}
        <div className="config-section-group">
          <div className="config-section-header">
            <h3 className="config-section-title">Chaos Stream Proxy</h3>
            {instance && !showInstanceSelector && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setShowInstanceSelector(true)}
              >
                Change Proxy
              </button>
            )}
          </div>

          {instance && !showInstanceSelector && (
            <div className="selected-proxy-info">
              <div className="proxy-detail">
                <strong>Name:</strong> {instance.name}
              </div>
              <div className="proxy-detail">
                <strong>URL:</strong> <code>{instance.url}</code>
              </div>
              <div className="proxy-detail">
                <strong>Stateful Mode:</strong> {instance.statefulMode ? 'Yes' : 'No'}
              </div>
            </div>
          )}

          {(!instance || showInstanceSelector) && renderInstanceSelector()}
        </div>

        {instance && (
          <>

            <StreamConfig config={config} onChange={setConfig} />

            <ChaosConfig
              config={config}
              onChange={setConfig}
              statefulMode={instance.statefulMode}
            />

            <UrlGenerator
              instance={instance}
              config={config}
              configName={configName}
              onConfigNameChange={setConfigName}
              onConfigChange={setConfig}
              onSaveComplete={handleSaveComplete}
              existingProxyUrl={editingConfig?.proxyUrl}
              existingRedirectUrl={editingConfig?.redirectUrl}
              isEditing={!isCreatingNew}
              originalName={editingConfig?.name}
              originalProtocol={editingConfig?.protocol}
            />
          </>
        )}
      </div>
    )
  }

  // Otherwise show the table list
  return (
    <div className="section configuration-manager">
      <div className="section-header">
        <h2 className="section-title">Configurations</h2>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleCreateNew}
        >
          Create New Configuration
        </button>
      </div>

      {loading && (
        <div className="loading-message">Loading configurations...</div>
      )}

      {!loading && configurations.length === 0 && (
        <div className="empty-state">
          No configurations yet. Click "Create New Configuration" to get started.
        </div>
      )}

      {!loading && configurations.length > 0 && (
        <div className="config-table-container">
          <table className="config-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Stream URLs</th>
                <th>Corruptions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {configurations.map((cfg) => {
                const corruptions = []
                if (cfg.delays.length > 0) corruptions.push(`Delays: ${cfg.delays.length}`)
                if (cfg.statusCodes.length > 0) corruptions.push(`Status: ${cfg.statusCodes.length}`)
                if (cfg.timeouts.length > 0) corruptions.push(`Timeouts: ${cfg.timeouts.length}`)
                if (cfg.throttles.length > 0) corruptions.push(`Throttle: ${cfg.throttles.length}`)

                return (
                  <tr key={`${cfg.name}:${cfg.protocol}`}>
                    <td>
                      <div className="config-name-container">
                        <span className="config-name">{cfg.name}</span>
                        {cfg.description && (
                          <span className="config-description">{cfg.description}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="config-type">
                        <span className={`protocol-badge ${cfg.protocol}`}>
                          {cfg.protocol.toUpperCase()}
                        </span>
                        <span className={`stream-type-badge ${cfg.streamType || 'live'}`}>
                          {(cfg.streamType || 'live').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="stream-urls">
                      <div className="url-row">
                        <span className="url-label">Source:</span>
                        <code className="url-value" onClick={() => copyToClipboard(cfg.sourceUrl, 'Source URL')} title="Click to copy">
                          {cfg.sourceUrl}
                        </code>
                      </div>
                      <div className="url-row">
                        <span className="url-label">Proxy:</span>
                        <code className="url-value" onClick={() => copyToClipboard(getProxyUrl(cfg), 'Proxy URL')} title="Click to copy">
                          {getProxyUrl(cfg)}
                        </code>
                      </div>
                      <div className="url-row">
                        <span className="url-label">Redirect:</span>
                        <code className="url-value" onClick={() => copyToClipboard(getRedirectUrl(cfg), 'Redirect URL')} title="Click to copy">
                          {getRedirectUrl(cfg)}
                        </code>
                      </div>
                    </td>
                    <td className="config-corruptions">
                      <div className="corruption-tags-wrapper">
                        {corruptions.length > 0 ? (
                          corruptions.map((c, i) => (
                            <span key={i} className="corruption-tag">{c}</span>
                          ))
                        ) : (
                          <span className="no-corruptions">None</span>
                        )}
                      </div>
                    </td>
                    <td className="config-actions">
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEdit(cfg)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleDuplicate(cfg)}
                        >
                          Duplicate
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(cfg)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ConfigurationManager
