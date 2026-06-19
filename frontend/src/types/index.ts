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

// 统一的设备阈值配置
export interface DeviceThresholds {
  minValue: number
  maxValue: number
  warningThreshold: number
  criticalThreshold: number
}

// 全局设备配置映射
export interface DeviceConfigMap {
  [nodeId: string]: DeviceThresholds & { unit: string; label: string }
}

// 全局设备配置常量
export const GLOBAL_DEVICE_CONFIG: DeviceConfigMap = {
  temp_sensor: {
    minValue: -10,
    maxValue: 60,
    warningThreshold: 28,
    criticalThreshold: 35,
    unit: '°C',
    label: '温度传感器'
  },
  pressure_transmitter: {
    minValue: 0,
    maxValue: 10,
    warningThreshold: 4.0,
    criticalThreshold: 5.0,
    unit: 'MPa',
    label: '压力变送器'
  },
  flow_meter: {
    minValue: 0,
    maxValue: 500,
    warningThreshold: 400,
    criticalThreshold: 450,
    unit: 'L/min',
    label: '流量计'
  },
  valve_position: {
    minValue: 0,
    maxValue: 100,
    warningThreshold: 95,
    criticalThreshold: 100,
    unit: '%',
    label: '阀门开度'
  },
  motor_speed: {
    minValue: 0,
    maxValue: 2000,
    warningThreshold: 1550,
    criticalThreshold: 1700,
    unit: 'RPM',
    label: '电机转速'
  }
}

// 数值夹取工具函数
export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// 根据数值和阈值获取状态等级
export type ValueLevel = 'Normal' | 'Warning' | 'Critical' | 'OutOfRange'

export function getValueLevel(
  value: number,
  thresholds: DeviceThresholds
): ValueLevel {
  if (value < thresholds.minValue || value > thresholds.maxValue) return 'OutOfRange'
  if (value >= thresholds.criticalThreshold) return 'Critical'
  if (value >= thresholds.warningThreshold) return 'Warning'
  return 'Normal'
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
