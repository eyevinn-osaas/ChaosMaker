export interface ChaosProxyInstance {
  name: string
  url: string
  statefulMode: boolean
}

export interface OSCListResponse {
  instances: any[]
  total: number
}

export interface OSCInstanceDetails {
  name: string
  url?: string
  statefulmode?: boolean
  status?: string
}
