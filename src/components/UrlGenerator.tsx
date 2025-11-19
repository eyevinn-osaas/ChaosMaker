import React, { useState } from 'react'
import { ChaosStreamProxyInstance, ProxyConfig } from '../types'
import { saveProxyConfiguration, getProxyConfiguration } from '../services/osc'
import './UrlGenerator.css'

interface Props {
  instance: ChaosStreamProxyInstance
  config: ProxyConfig
  configName: string
  onConfigNameChange: (name: string) => void
  onConfigChange: (config: ProxyConfig) => void
  onSaveComplete?: () => void
  existingProxyUrl?: string
  existingRedirectUrl?: string
  isEditing?: boolean
  originalName?: string
  originalProtocol?: 'hls' | 'dash'
}

function UrlGenerator({ instance, config, configName, onConfigNameChange, onConfigChange, onSaveComplete, existingProxyUrl, existingRedirectUrl, isEditing, originalName, originalProtocol }: Props) {
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedConfig, setSavedConfig] = useState<{ proxyUrl?: string; redirectUrl?: string } | null>(
    existingProxyUrl || existingRedirectUrl ? { proxyUrl: existingProxyUrl, redirectUrl: existingRedirectUrl } : null
  )

  const handleSaveConfiguration = async () => {
    if (!configName.trim()) {
      setSaveError('Please enter a configuration name')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(configName)) {
      setSaveError('Name must contain only letters, numbers, hyphens, and underscores')
      return
    }

    if (!config.sourceUrl) {
      setSaveError('Please enter a source URL first')
      return
    }

    // Check if this is a duplicate (name + protocol already exists)
    // Skip check if we're editing the same config (name and protocol haven't changed)
    const isNameOrProtocolChanged = !isEditing ||
      configName !== originalName ||
      config.protocol !== originalProtocol

    if (isNameOrProtocolChanged) {
      try {
        const existing = await getProxyConfiguration(configName, config.protocol)
        if (existing) {
          const confirmed = window.confirm(
            `A configuration named "${configName}" for ${config.protocol.toUpperCase()} already exists.\n\n` +
            `Do you want to overwrite it?`
          )
          if (!confirmed) {
            return
          }
        }
      } catch (error) {
        // If config doesn't exist, getProxyConfiguration will throw 404 - that's fine, continue
      }
    }

    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    setSavedConfig(null)

    try {
      await saveProxyConfiguration({
        name: configName,
        instanceUrl: instance.url,
        sourceUrl: config.sourceUrl,
        protocol: config.protocol,
        streamType: config.streamType,
        description: config.description,
        delays: config.delays,
        statusCodes: config.statusCodes,
        timeouts: config.timeouts,
        throttles: config.throttles
      })

      // Fetch the saved configuration to get backend-generated URLs
      const savedConfiguration = await getProxyConfiguration(configName, config.protocol)
      if (savedConfiguration) {
        setSavedConfig({
          proxyUrl: savedConfiguration.proxyUrl,
          redirectUrl: savedConfiguration.redirectUrl
        })
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      // Call the completion callback if provided
      if (onSaveComplete) {
        onSaveComplete()
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('Failed to copy to clipboard')
    }
  }

  const hasCorruptions =
    config.delays.length > 0 ||
    config.statusCodes.length > 0 ||
    config.timeouts.length > 0 ||
    config.throttles.length > 0

  return (
    <>
      {/* Save Configuration Section */}
      <div className="config-section-group">
        <div className="config-section-header">
          <h3 className="config-section-title">Save Configuration</h3>
        </div>
        <div className="form-group">
          <label className="form-label">Configuration Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., channel88, test-stream, my-config"
            value={configName}
            onChange={(e) => onConfigNameChange(e.target.value)}
          />
          <p className="form-hint">
            Use only letters, numbers, hyphens, and underscores. This name will be used in the redirect URL.
            <br />
            <strong>Note:</strong> You can use the same name for both HLS and DASH configurations - they are stored separately.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Description (optional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., Production channel 88, Test stream for live sports, Backup configuration"
            value={config.description || ''}
            onChange={(e) => onConfigChange({ ...config, description: e.target.value })}
          />
          <p className="form-hint">
            Add a description to help identify this configuration
          </p>
        </div>

        {saveError && (
          <div className="save-error">
            {saveError}
          </div>
        )}

        {saveSuccess && (
          <div className="save-success">
            ✓ Configuration saved successfully!
          </div>
        )}

        <button
          className={`btn ${saveSuccess ? 'btn-success' : 'btn-primary'}`}
          onClick={handleSaveConfiguration}
          disabled={saving || !config.sourceUrl}
        >
          {saving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save Configuration'}
        </button>

        {!config.sourceUrl && (
          <div className="warning">
            Please enter a source stream URL first
          </div>
        )}

        {config.sourceUrl && !hasCorruptions && (
          <div className="info">
            Add chaos corruptions to see them reflected in the URL
          </div>
        )}
      </div>

      {/* Generated URLs Section - Output (only shown after save) */}
      {savedConfig && (
        <div className="output-section-group">
          <div className="output-section-header">
            <h3 className="output-section-title">📤 Generated URLs</h3>
          </div>

          {savedConfig.proxyUrl && (
            <div className="url-section">
              <div className="url-header">
                <h4 className="url-section-title">Direct Proxy URL</h4>
                <p className="url-description">
                  Use this URL directly in your video player to test with chaos corruptions
                </p>
              </div>
              <div className="url-display">
                <code>{savedConfig.proxyUrl}</code>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => copyToClipboard(savedConfig.proxyUrl!)}
              >
                Copy URL
              </button>
            </div>
          )}

          {savedConfig.redirectUrl && (
            <div className="url-section">
              <div className="url-header">
                <h4 className="url-section-title">Redirect URL</h4>
                <p className="url-description">
                  This URL redirects to the configured proxy URL. Perfect for use in players that need a static URL.
                </p>
              </div>
              <div className="url-display">
                <code>{savedConfig.redirectUrl}</code>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => copyToClipboard(savedConfig.redirectUrl!)}
              >
                Copy URL
              </button>
            </div>
          )}

          <div className="usage-info">
            <h4 className="url-section-title">How to Use</h4>
            <ol>
              <li>Copy the generated URL above</li>
              <li>Use it in your video player instead of the original stream URL</li>
              <li>The chaos proxy will apply the configured corruptions to the stream</li>
              <li>Monitor your player's behavior to test resilience and error handling</li>
            </ol>
          </div>
        </div>
      )}

      {/* Show info message if not saved yet */}
      {!savedConfig && config.sourceUrl && configName && (
        <div className="output-section-group">
          <div className="info">
            💡 Save the configuration to generate proxy and redirect URLs
          </div>
        </div>
      )}
    </>
  )
}

export default UrlGenerator
