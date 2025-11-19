import { exec } from 'child_process'
import { promisify } from 'util'
import { ChaosProxyInstance, OSCInstanceDetails } from '../types'

const execAsync = promisify(exec)

/**
 * OSC Client Service
 *
 * This service interfaces with OSC using the OSC CLI
 * Make sure you have the OSC CLI installed and authenticated:
 *
 * Installation:
 *   npm install -g @osaas/cli
 *
 * Authentication:
 *   osc login
 *
 * The CLI will store credentials in ~/.osc/credentials
 */

class OSCClient {
  private accessToken: string | null = null

  /**
   * Set the OSC access token
   */
  setAccessToken(token: string) {
    this.accessToken = token
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return this.accessToken
  }

  /**
   * Execute OSC CLI command with access token
   */
  private async executeOSCCommand(command: string, timeout: number = 120000): Promise<string> {
    try {
      if (!this.accessToken) {
        throw new Error('OSC access token not set. Please configure your token first.')
      }

      // Set OSC_ACCESS_TOKEN environment variable for the command
      const env = {
        ...process.env,
        OSC_ACCESS_TOKEN: this.accessToken
      }

      const { stdout, stderr } = await execAsync(`osc ${command}`, {
        env,
        timeout, // Default 2 minutes, can be overridden
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      })

      if (stderr && !stderr.includes('Debugger')) {
        console.warn('OSC CLI stderr:', stderr)
      }

      // Check if stdout contains error messages
      if (stdout && (
        stdout.includes('Authorization token is invalid') ||
        stdout.includes('token is malformed') ||
        stdout.includes('token is expired') ||
        stdout.includes('Unauthorized') ||
        stdout.toLowerCase().includes('error:')
      )) {
        throw new Error(stdout.trim())
      }

      return stdout
    } catch (error: any) {
      console.error('OSC CLI error:', error.message)
      if (error.stderr) {
        console.error('stderr:', error.stderr)
      }
      throw new Error(`OSC CLI command failed: ${error.message}`)
    }
  }

  /**
   * Parse JSON output from OSC CLI
   */
  private parseJSON<T>(output: string): T {
    try {
      return JSON.parse(output)
    } catch (error) {
      console.error('Failed to parse OSC output:', output)
      throw new Error('Failed to parse OSC CLI output')
    }
  }

  /**
   * Parse text output from list command
   * Expected format is one instance name per line
   */
  private parseListOutput(output: string): string[] {
    if (!output || output.trim() === '') {
      return []
    }

    // Split by newlines and filter out empty lines
    return output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.includes('─') && !line.toLowerCase().includes('name'))
  }

  /**
   * List all chaos stream proxy instances in OSC
   */
  async listInstances(): Promise<ChaosProxyInstance[]> {
    try {
      console.log('Listing chaos proxy instances from OSC...')

      // osc list <serviceId>
      const output = await this.executeOSCCommand('list eyevinn-chaos-stream-proxy')

      console.log('List command output:', output)

      // Parse the text output to get instance names
      const instanceNames = this.parseListOutput(output)

      console.log('Parsed instance names:', instanceNames)

      // For each instance, get its details
      const chaosProxyInstances: ChaosProxyInstance[] = []

      for (const name of instanceNames) {
        try {
          const instance = await this.describeInstance(name)
          if (instance) {
            chaosProxyInstances.push({
              name: instance.name,
              url: instance.url || `https://${name}.osc.eyevinn.technology`,
              statefulMode: instance.statefulmode === true || String(instance.statefulmode) === 'true'
            })
          }
        } catch (error) {
          console.warn(`Failed to get details for instance ${name}:`, error)
          // Add with minimal info if describe fails
          chaosProxyInstances.push({
            name,
            url: `https://${name}.osc.eyevinn.technology`,
            statefulMode: false
          })
        }
      }

      return chaosProxyInstances
    } catch (error) {
      console.error('Failed to list instances:', error)
      // Re-throw the original error message instead of a generic one
      throw error
    }
  }

  /**
   * Parse the JavaScript-style object output from OSC create command
   * Example output:
   * Instance created:
   * [1] {
   * [1]   name: 'test5',
   * [1]   url: 'https://...',
   * [1]   statefulmode: true
   * [1] }
   */
  private parseCreateOutput(output: string): any {
    try {
      console.log('=== Parse Create Output Debug ===')

      // Remove ANSI color codes (e.g., \u001b[32m, \u001b[39m)
      // eslint-disable-next-line no-control-regex
      const cleanOutput = output.replace(/\u001b\[\d+m/g, '')

      console.log('Cleaned output (first 100 chars):', JSON.stringify(cleanOutput.substring(0, 100)))

      // Extract name - looking for: name: 'value'
      const nameMatch = cleanOutput.match(/name:\s*'([^']+)'/)

      // Extract url - looking for: url: 'https://...'
      const urlMatch = cleanOutput.match(/url:\s*'(https:\/\/[^']+)'/)

      // Extract statefulmode - looking for: statefulmode: true/false
      const statefulMatch = cleanOutput.match(/statefulmode:\s*(true|false)/)

      console.log('Name match:', nameMatch)
      console.log('URL match:', urlMatch)
      console.log('Stateful match:', statefulMatch)

      if (!nameMatch || !urlMatch) {
        throw new Error('Could not extract required fields from output')
      }

      const parsed = {
        name: nameMatch[1],
        url: urlMatch[1],
        statefulmode: statefulMatch ? statefulMatch[1] === 'true' : false
      }

      console.log('Parsed create output:', parsed)
      return parsed
    } catch (error) {
      console.error('Failed to parse create output:', error)
      console.error('Raw output:', output)
      throw new Error('Failed to parse instance creation response')
    }
  }

  /**
   * Create a new chaos stream proxy instance
   */
  async createInstance(name: string, statefulMode: boolean): Promise<ChaosProxyInstance> {
    try {
      console.log(`Creating chaos proxy instance: ${name} (stateful: ${statefulMode})`)

      // Build the create command using correct OSC CLI syntax
      // osc create eyevinn-chaos-stream-proxy <name> -o STATEFUL=<true|false>
      const statefulValue = statefulMode ? 'true' : 'false'
      const command = `create eyevinn-chaos-stream-proxy ${name} -o STATEFUL=${statefulValue}`

      console.log('Executing command:', command)
      console.log('Note: This may take up to 1 minute...')

      // Use longer timeout for create command (2 minutes)
      const output = await this.executeOSCCommand(command, 120000)

      console.log('Create command output:', output)

      // Check if the command failed
      if (output.includes('Error') || output.includes('Failed') || output.includes('error')) {
        throw new Error(`Failed to create instance: ${output}`)
      }

      // Check for success message
      if (!output.includes('Instance created:')) {
        throw new Error(`Unexpected output: ${output}`)
      }

      // Parse the JavaScript object output
      const result = this.parseCreateOutput(output)

      // Note: OSC CLI always returns statefulmode: true in the response,
      // so we use the value we sent in the request instead
      return {
        name: result.name,
        url: result.url,
        statefulMode: statefulMode
      }
    } catch (error) {
      console.error('Failed to create instance:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to create chaos proxy instance')
    }
  }

  /**
   * Delete a chaos stream proxy instance
   */
  async deleteInstance(name: string): Promise<void> {
    try {
      console.log(`Deleting chaos proxy instance: ${name}`)

      // osc remove <serviceId> <name>
      await this.executeOSCCommand(`remove eyevinn-chaos-stream-proxy ${name}`)

      console.log(`Successfully deleted instance: ${name}`)
    } catch (error) {
      console.error('Failed to delete instance:', error)
      throw new Error('Failed to delete chaos proxy instance')
    }
  }

  /**
   * Parse describe output in colon-separated format
   * Example:
   * name: dfdfg
   * url: https://...
   * statefulmode: true
   */
  private parseDescribeOutput(output: string): OSCInstanceDetails | null {
    try {
      const result: any = {}

      const lines = output.split('\n').filter(line => line.trim().length > 0)

      for (const line of lines) {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim()
          const value = line.substring(colonIndex + 1).trim()
          result[key] = value
        }
      }

      if (!result.name) {
        return null
      }

      return {
        name: result.name,
        url: result.url,
        statefulmode: result.statefulmode === 'true' || result.statefulmode === true,
        status: result.status
      }
    } catch (error) {
      console.error('Failed to parse describe output:', error)
      return null
    }
  }

  /**
   * Get details about a specific chaos stream proxy instance
   */
  async describeInstance(name: string): Promise<OSCInstanceDetails | null> {
    try {
      console.log(`Describing chaos proxy instance: ${name}`)

      // osc describe <serviceId> <name>
      const output = await this.executeOSCCommand(`describe eyevinn-chaos-stream-proxy ${name}`)

      console.log(`Describe output for ${name}:`, output)

      // Parse the colon-separated output
      return this.parseDescribeOutput(output)
    } catch (error) {
      console.error('Failed to describe instance:', error)
      return null
    }
  }
}

export default new OSCClient()
