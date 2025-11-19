import React from 'react'
import './HelpModal.css'

interface Props {
  isOpen: boolean
  onClose: () => void
}

function HelpModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2>How to Use Chaos Stream Proxy Configurator</h2>
          <button className="help-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="help-modal-content">
          <section className="help-section">
            <h3>🎯 What is This?</h3>
            <p>
              This tool helps you create configurations for testing video streaming resilience.
              You can simulate various network conditions and stream corruptions to see how your
              video player handles problems like delays, errors, and bandwidth limitations.
              <br></br>The actual corruptions during playback will be done by a Choas Stream Proxy.
              <br></br>
              This tool will:
              <ul>
                <li>help you create the player URLs required by the Chaos Stream Proxy to apply the intended corruptions</li>
                <li>let you select and create Chaos Stream Proxies in Eyevinn Open Souce Cloud (requires <a href="https://app.osaas.io/" target="_blank" rel="noopener noreferrer">OSC account</a> and token)</li>
              </ul>
            </p>
          </section>

          <section className="help-section">
            <h3>🚀 Quick Start</h3>
            <ol>
              <li><strong>Create Configuration:</strong> Click "Create New" button</li>
              <li><strong>Select Proxy:</strong> Choose a Chaos Stream Proxy instance (OSC or manual URL)</li>
              <li><strong>Configure Stream:</strong> Enter your source stream URL and select protocol (HLS or DASH)</li>
              <li><strong>Add Chaos:</strong> Add corruptions like delays, timeouts, errors, or throttling</li>
              <li><strong>Save & Use:</strong> Save configuration and use the generated URLs in your player</li>
            </ol>
          </section>

          <section className="help-section">
            <h3>🎛️ Chaos Corruptions</h3>
            <div className="help-grid">
              <div className="help-item">
                <strong>Delays</strong>
                <p>Add latency to segment requests. Specify delay in milliseconds (ms).</p>
              </div>
              <div className="help-item">
                <strong>Status Codes</strong>
                <p>Return HTTP errors instead of segments. Use codes like 404, 500, 503.</p>
              </div>
              <div className="help-item">
                <strong>Timeouts</strong>
                <p>Cause requests to hang and timeout. No additional parameters needed.</p>
              </div>
              <div className="help-item">
                <strong>Throttling</strong>
                <p>Limit download bandwidth. Specify rate in bytes per second.</p>
              </div>
            </div>
          </section>

          <section className="help-section">
            <h3>🎯 Targeting Segments</h3>
            <p>Control which segments are affected by corruptions:</p>
            <ul>
              <li><strong>None:</strong> Exclude from wildcard targeting</li>
              <li><strong>All Segments (*):</strong> Apply to every segment</li>
              <li><strong>Specific Index (i):</strong> Target by segment index (0-based)</li>
              <li><strong>Media Sequence (sq):</strong> Target by media sequence number (live streams)</li>
              <li><strong>Relative Sequence (rsq):</strong> Target relative to current position (stateful only)</li>
              <li><strong>Bitrate (br):</strong> Target segments at specific bitrate</li>
              <li><strong>Playlist Ladder (l):</strong> Target specific quality ladder (HLS delays only)</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>📤 Using Generated URLs</h3>
            <p>After saving a configuration, you'll get two types of URLs:</p>
            <ul>
              <li>
                <strong>Direct Proxy URL:</strong> Full URL to Chaos Stream Proxy, with all parameters that control the corruptions. Can be used as-is in a player.
              </li>
              <li>
                <strong>Redirect URL:</strong> Short, clean URL that redirects to the direct proxy URL configured.
                This is useful when you want a static playback URL but you can still modify the configuration.
              </li>
            </ul>
          </section>

          <section className="help-section">
            <h3>☁️ Eyevinn Open Source Cloud Integration</h3>
            <p>To manage Chaos Stream Proxy instances in Eyevinn Open Source Cloud:</p>
            <ol>
              <li>Get your Personal Access Token from <a href="https://app.osaas.io/personal-access-token" target="_blank" rel="noopener noreferrer">OSC</a></li>
              <li>Click "Create New" or "Change Proxy"</li>
              <li>Select "OSC Instances" tab</li>
              <li>Enter your token and click "Save Token & Load Instances"</li>
              <li>Create or select an instance</li>
            </ol>
          </section>

          <section className="help-section">
            <h3>💡 Tips</h3>
            <ul>
              <li>Use the example configurations as templates for common scenarios</li>
              <li>Duplicate existing configs to quickly create variations</li>
              <li>Test with different protocols (HLS vs DASH) to ensure compatibility</li>
              <li>Start with simple corruptions before combining multiple effects</li>
              <li>Use the redirect URL when you need to update configs without changing player URLs</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>🔗 More Information</h3>
            <p>
              Learn more about Chaos Stream Proxy: <a href="https://github.com/Eyevinn/chaos-stream-proxy" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
            </p>
          </section>
        </div>

        <div className="help-modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Got it!</button>
        </div>
      </div>
    </div>
  )
}

export default HelpModal
