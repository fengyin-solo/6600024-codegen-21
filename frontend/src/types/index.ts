// OPC-UA 节点类型定义
export interface OPCUANode {
  id: string
  name: string
  nodeId: string
  type: 'Object' | 'Variable' | 'Method' | 'DataType'
  dataType?: string
  value?: any
  unit?: string
  quality?: 'Good' | 'Bad' | 'Uncertain'
  children?: OPCUANode[]
  description?: string
  browseName?: string
}

// 数据值模型
export interface DataValue {
  nodeId: string
  value: number | boolean | string
  quality: 'Good' | 'Bad' | 'Uncertain'
  timestamp: number
  sourceTimestamp?: number
  serverTimestamp?: number
}

// 报警事件
export interface AlarmEvent {
  id: string
  nodeId: string
  nodeName: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'
  message: string
  timestamp: number
  acknowledged: boolean
  value?: number | boolean | string
  threshold?: number
}

// 订阅配置
export interface SubscriptionConfig {
  nodeId: string
  publishingInterval: number
  samplingInterval: number
  queueSize: number
  discardOldest: boolean
  enabled: boolean
}

// 历史数据点
export interface HistoryDataPoint {
  timestamp: number
  value: number
  quality: 'Good' | 'Bad' | 'Uncertain'
}

// 节点详情
export interface NodeDetail {
  node: OPCUANode
  currentValue?: DataValue
  history?: HistoryDataPoint[]
  subscriptions?: SubscriptionConfig[]
}

// 拓扑图设备类型
export type TopologyDeviceType = 'Area' | 'ProductionLine' | 'Pump' | 'Valve' | 'Sensor'

// 拓扑图设备状态
export type DeviceStatus = 'Running' | 'Stopped' | 'Warning' | 'Error' | 'Offline'

// 传感器类型
export type SensorType = 'Temperature' | 'Pressure' | 'Flow' | 'Level'

// 拓扑图设备基础接口
export interface TopologyDevice {
  id: string
  name: string
  type: TopologyDeviceType
  status: DeviceStatus
  nodeId?: string
  description?: string
  position?: { x: number; y: number }
  parentId?: string
}

// 传感器设备
export interface SensorDevice extends TopologyDevice {
  type: 'Sensor'
  sensorType: SensorType
  value: number
  unit: string
  minValue?: number
  maxValue?: number
  warningThreshold?: number
  criticalThreshold?: number
}

// 泵设备
export interface PumpDevice extends TopologyDevice {
  type: 'Pump'
  isRunning: boolean
  speed: number
  unit: string
  flowRate?: number
  pressure?: number
}

// 阀门设备
export interface ValveDevice extends TopologyDevice {
  type: 'Valve'
  position: number
  unit: string
  isOpen: boolean
  targetPosition?: number
}

// 生产区域
export interface ProductionArea extends TopologyDevice {
  type: 'Area'
}

// 生产线
export interface ProductionLine extends TopologyDevice {
  type: 'ProductionLine'
}

// 拓扑图连接关系
export interface TopologyLink {
  id: string
  source: string
  target: string
  label?: string
  status?: 'Active' | 'Inactive' | 'Warning'
}

// 拓扑图数据
export interface TopologyData {
  nodes: TopologyDevice[]
  links: TopologyLink[]
}
