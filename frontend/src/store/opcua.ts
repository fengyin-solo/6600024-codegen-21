import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  OPCUANode,
  DataValue,
  AlarmEvent,
  SubscriptionConfig,
  TopologyData,
  TopologyDevice,
  SensorDevice,
  PumpDevice,
  ValveDevice,
  DeviceStatus
} from '../types'
import { GLOBAL_DEVICE_CONFIG, clampValue, getValueLevel } from '../types'

export const useOpcuaStore = defineStore('opcua', () => {
  // 状态
  const nodeTree = ref<OPCUANode[]>([])
  const selectedNode = ref<OPCUANode | null>(null)
  const subscriptions = ref<Map<string, SubscriptionConfig>>(new Map())
  const alarms = ref<AlarmEvent[]>([])
  const realTimeData = ref<Map<string, DataValue>>(new Map())
  const isConnected = ref(false)
  const dataHistory = ref<Map<string, Array<{ timestamp: number; value: number }>>>(new Map())
  const topologyData = ref<TopologyData>({ nodes: [], links: [] })

  // 初始化模拟节点树
  function initNodeTree() {
    nodeTree.value = [
      {
        id: 'server',
        name: 'Server',
        nodeId: 'ns=0;i=2253',
        type: 'Object',
        description: 'OPC-UA 服务器根节点',
        children: [
          {
            id: 'objects',
            name: 'Objects',
            nodeId: 'ns=0;i=85',
            type: 'Object',
            description: '对象文件夹',
            children: [
              {
                id: 'plc_area1',
                name: 'PLC_Area1',
                nodeId: 'ns=2;i=1001',
                type: 'Object',
                description: '1号生产区域 PLC',
                children: [
                  {
                    id: 'temp_sensor',
                    name: 'Temperature_Sensor',
                    nodeId: 'ns=2;i=1002',
                    type: 'Variable',
                    dataType: 'Double',
                    value: 25.6,
                    unit: '°C',
                    quality: 'Good',
                    description: '温度传感器'
                  },
                  {
                    id: 'pressure_transmitter',
                    name: 'Pressure_Transmitter',
                    nodeId: 'ns=2;i=1003',
                    type: 'Variable',
                    dataType: 'Double',
                    value: 3.45,
                    unit: 'MPa',
                    quality: 'Good',
                    description: '压力变送器'
                  },
                  {
                    id: 'pump_status',
                    name: 'Pump_Status',
                    nodeId: 'ns=2;i=1004',
                    type: 'Variable',
                    dataType: 'Boolean',
                    value: true,
                    quality: 'Good',
                    description: '泵运行状态'
                  }
                ]
              },
              {
                id: 'plc_area2',
                name: 'PLC_Area2',
                nodeId: 'ns=2;i=2001',
                type: 'Object',
                description: '2号生产区域 PLC',
                children: [
                  {
                    id: 'flow_meter',
                    name: 'Flow_Meter',
                    nodeId: 'ns=2;i=2002',
                    type: 'Variable',
                    dataType: 'Double',
                    value: 156.7,
                    unit: 'L/min',
                    quality: 'Good',
                    description: '流量计'
                  },
                  {
                    id: 'valve_position',
                    name: 'Valve_Position',
                    nodeId: 'ns=2;i=2003',
                    type: 'Variable',
                    dataType: 'Double',
                    value: 75,
                    unit: '%',
                    quality: 'Good',
                    description: '阀门开度'
                  },
                  {
                    id: 'motor_speed',
                    name: 'Motor_Speed',
                    nodeId: 'ns=2;i=2004',
                    type: 'Variable',
                    dataType: 'Int32',
                    value: 1480,
                    unit: 'RPM',
                    quality: 'Good',
                    description: '电机转速'
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }

  // 模拟实时数据更新
  function simulateDataUpdate() {
    const nodes = getAllVariableNodes()
    nodes.forEach(node => {
      const currentValue = realTimeData.value.get(node.id)?.value ?? node.value

      let newValue: number | boolean | string
      if (node.dataType === 'Double') {
        const numVal = typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue))
        const variation = (Math.random() - 0.5) * 2
        let rawValue = Math.round((numVal + variation) * 100) / 100
        // 使用全局配置进行数值夹取，确保在合法范围内
        const config = GLOBAL_DEVICE_CONFIG[node.id]
        if (config) {
          rawValue = clampValue(rawValue, config.minValue, config.maxValue)
        }
        newValue = rawValue
      } else if (node.dataType === 'Int32') {
        const numVal = typeof currentValue === 'number' ? currentValue : parseInt(String(currentValue))
        const variation = Math.floor((Math.random() - 0.5) * 10)
        let rawValue = numVal + variation
        // 使用全局配置进行数值夹取，确保在合法范围内
        const config = GLOBAL_DEVICE_CONFIG[node.id]
        if (config) {
          rawValue = Math.round(clampValue(rawValue, config.minValue, config.maxValue))
        }
        newValue = rawValue
      } else if (node.dataType === 'Boolean') {
        newValue = Math.random() > 0.95 ? !currentValue : currentValue
      } else {
        newValue = currentValue
      }

      // 根据数值和全局配置确定数据质量
      let quality: 'Good' | 'Bad' | 'Uncertain' = 'Good'
      if (typeof newValue === 'number') {
        const config = GLOBAL_DEVICE_CONFIG[node.id]
        if (config) {
          const level = getValueLevel(newValue, config)
          if (level === 'Critical') quality = 'Uncertain'
          if (Math.random() > 0.98) quality = 'Uncertain'
        }
      } else if (Math.random() > 0.98) {
        quality = 'Uncertain'
      }

      const dataValue: DataValue = {
        nodeId: node.nodeId,
        value: newValue,
        quality,
        timestamp: Date.now(),
        sourceTimestamp: Date.now(),
        serverTimestamp: Date.now()
      }

      realTimeData.value.set(node.id, dataValue)
      node.value = newValue
      node.quality = dataValue.quality

      // 记录历史数据
      const history = dataHistory.value.get(node.id) || []
      history.push({ timestamp: Date.now(), value: typeof newValue === 'number' ? newValue : 0 })
      if (history.length > 100) history.shift()
      dataHistory.value.set(node.id, history)

      // 检查报警条件
      checkAlarms(node, newValue)
    })

    // 更新拓扑图状态
    updateTopologyStatus()
  }

  // 检查报警（使用全局配置统一阈值）
  function checkAlarms(node: OPCUANode, value: number | boolean | string) {
    const config = GLOBAL_DEVICE_CONFIG[node.id]
    if (!config || typeof value !== 'number') return

    const level = getValueLevel(value, config)
    if (level === 'Warning') {
      addAlarm({
        nodeId: node.nodeId,
        nodeName: node.name,
        severity: 'Medium',
        message: `${config.label}警告: ${value}${config.unit} (阈值: ${config.warningThreshold}${config.unit})`,
        value,
        threshold: config.warningThreshold
      })
    } else if (level === 'Critical') {
      addAlarm({
        nodeId: node.nodeId,
        nodeName: node.name,
        severity: 'Critical',
        message: `${config.label}超限: ${value}${config.unit} (阈值: ${config.criticalThreshold}${config.unit})`,
        value,
        threshold: config.criticalThreshold
      })
    }
  }

  // 添加报警
  function addAlarm(alarm: Omit<AlarmEvent, 'id' | 'timestamp' | 'acknowledged'>) {
    const newAlarm: AlarmEvent = {
      ...alarm,
      id: `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      acknowledged: false
    }
    alarms.value.unshift(newAlarm)
    if (alarms.value.length > 50) alarms.value.pop()
  }

  // 获取所有变量节点
  function getAllVariableNodes(): OPCUANode[] {
    const variables: OPCUANode[] = []
    function traverse(nodes: OPCUANode[]) {
      nodes.forEach(node => {
        if (node.type === 'Variable') {
          variables.push(node)
        }
        if (node.children) {
          traverse(node.children)
        }
      })
    }
    traverse(nodeTree.value)
    return variables
  }

  // 选择节点
  function selectNode(node: OPCUANode) {
    selectedNode.value = node
  }

  // 添加订阅
  function addSubscription(nodeId: string, config: Partial<SubscriptionConfig> = {}) {
    const subscription: SubscriptionConfig = {
      nodeId,
      publishingInterval: config.publishingInterval || 1000,
      samplingInterval: config.samplingInterval || 500,
      queueSize: config.queueSize || 10,
      discardOldest: config.discardOldest ?? true,
      enabled: true
    }
    subscriptions.value.set(nodeId, subscription)
  }

  // 移除订阅
  function removeSubscription(nodeId: string) {
    subscriptions.value.delete(nodeId)
  }

  // 确认报警
  function acknowledgeAlarm(alarmId: string) {
    const alarm = alarms.value.find(a => a.id === alarmId)
    if (alarm) {
      alarm.acknowledged = true
    }
  }

  // 清空报警
  function clearAlarms() {
    alarms.value = []
  }

  // 初始化拓扑图数据
  function initTopologyData() {
    topologyData.value = {
      nodes: [
        {
          id: 'area1',
          name: '1号生产区域',
          type: 'Area',
          status: 'Running',
          description: '主生产车间',
          x: 400, y: 50,
          nodeId: 'ns=2;i=1001'
        },
        {
          id: 'line1',
          name: 'A生产线',
          type: 'ProductionLine',
          status: 'Running',
          description: '主要装配线',
          x: 200, y: 180,
          parentId: 'area1',
          nodeId: 'ns=2;i=1001'
        },
        {
          id: 'line2',
          name: 'B生产线',
          type: 'ProductionLine',
          status: 'Running',
          description: '次要装配线',
          x: 600, y: 180,
          parentId: 'area1',
          nodeId: 'ns=2;i=2001'
        },
        {
          id: 'pump1',
          name: 'Pump-01 冷却泵',
          type: 'Pump',
          status: 'Running',
          description: '生产线A冷却液循环泵',
          x: 80, y: 320,
          parentId: 'line1',
          linkedNodeId: 'pump_status',
          isRunning: true,
          speed: 1480,
          unit: 'RPM',
          flowRate: 156.7,
          pressure: 3.45
        } as PumpDevice & { x: number; y: number; linkedNodeId: string },
        {
          id: 'temp1',
          name: 'Temp-01 温度传感器',
          type: 'Sensor',
          status: 'Running',
          description: '冷却液温度监测',
          x: 200, y: 320,
          parentId: 'line1',
          linkedNodeId: 'temp_sensor',
          sensorType: 'Temperature',
          value: 25.6,
          unit: '°C',
          minValue: -10,
          maxValue: 60,
          warningThreshold: 28,
          criticalThreshold: 35
        } as SensorDevice & { x: number; y: number; linkedNodeId: string },
        {
          id: 'pressure1',
          name: 'Pressure-01 压力传感器',
          type: 'Sensor',
          status: 'Running',
          description: '管路压力监测',
          x: 320, y: 320,
          parentId: 'line1',
          linkedNodeId: 'pressure_transmitter',
          sensorType: 'Pressure',
          value: 3.45,
          unit: 'MPa',
          minValue: 0,
          maxValue: 10,
          warningThreshold: 4.0,
          criticalThreshold: 5.0
        } as SensorDevice & { x: number; y: number; linkedNodeId: string },
        {
          id: 'valve1',
          name: 'Valve-01 调节阀',
          type: 'Valve',
          status: 'Running',
          description: '冷却液流量调节阀',
          x: 80, y: 460,
          parentId: 'line1',
          linkedNodeId: 'valve_position',
          value: 75,
          unit: '%',
          isOpen: true,
          targetPosition: 75
        } as (ValveDevice & { x: number; y: number; linkedNodeId: string; value: number }),
        {
          id: 'flow1',
          name: 'Flow-01 流量计',
          type: 'Sensor',
          status: 'Running',
          description: 'B生产线流量监测',
          x: 500, y: 320,
          parentId: 'line2',
          linkedNodeId: 'flow_meter',
          sensorType: 'Flow',
          value: 156.7,
          unit: 'L/min',
          minValue: 0,
          maxValue: 500,
          warningThreshold: 400,
          criticalThreshold: 450
        } as SensorDevice & { x: number; y: number; linkedNodeId: string },
        {
          id: 'motor1',
          name: 'Motor-01 驱动电机',
          type: 'Pump',
          status: 'Running',
          description: 'B生产线驱动电机',
          x: 620, y: 320,
          parentId: 'line2',
          linkedNodeId: 'motor_speed',
          isRunning: true,
          speed: 1480,
          unit: 'RPM'
        } as PumpDevice & { x: number; y: number; linkedNodeId: string },
        {
          id: 'valve2',
          name: 'Valve-02 截止阀',
          type: 'Valve',
          status: 'Running',
          description: 'B生产线管路截止阀',
          x: 740, y: 320,
          parentId: 'line2',
          linkedNodeId: 'valve_position',
          value: 100,
          unit: '%',
          isOpen: true,
          targetPosition: 100
        } as (ValveDevice & { x: number; y: number; linkedNodeId: string; value: number })
      ],
      links: [
        { id: 'link1', source: 'area1', target: 'line1', status: 'Active', label: '包含' },
        { id: 'link2', source: 'area1', target: 'line2', status: 'Active', label: '包含' },
        { id: 'link3', source: 'line1', target: 'pump1', status: 'Active', label: '设备' },
        { id: 'link4', source: 'line1', target: 'temp1', status: 'Active', label: '监测' },
        { id: 'link5', source: 'line1', target: 'pressure1', status: 'Active', label: '监测' },
        { id: 'link6', source: 'line1', target: 'valve1', status: 'Active', label: '控制' },
        { id: 'link7', source: 'pump1', target: 'temp1', status: 'Active', label: '数据流向' },
        { id: 'link8', source: 'pump1', target: 'valve1', status: 'Active', label: '管路连接' },
        { id: 'link9', source: 'line2', target: 'flow1', status: 'Active', label: '监测' },
        { id: 'link10', source: 'line2', target: 'motor1', status: 'Active', label: '设备' },
        { id: 'link11', source: 'line2', target: 'valve2', status: 'Active', label: '控制' },
        { id: 'link12', source: 'motor1', target: 'flow1', status: 'Active', label: '数据流向' },
        { id: 'link13', source: 'motor1', target: 'valve2', status: 'Active', label: '管路连接' }
      ]
    }
  }

  // 根据数值和阈值计算设备状态（使用全局配置保持一致性）
  function calculateDeviceStatus(
    nodeId: string,
    value: number
  ): DeviceStatus {
    const config = GLOBAL_DEVICE_CONFIG[nodeId]
    if (!config) return 'Running'
    const level = getValueLevel(value, config)
    if (level === 'Critical' || level === 'OutOfRange') return 'Error'
    if (level === 'Warning') return 'Warning'
    return 'Running'
  }

  // 更新拓扑图设备实时状态（对数值进行夹取，确保在合法范围内）
  function updateTopologyStatus() {
    topologyData.value.nodes.forEach(node => {
      const anyNode = node as any
      if (node.type === 'Sensor') {
        const sensor = node as SensorDevice & { linkedNodeId?: string }
        const opcData = sensor.linkedNodeId ? realTimeData.value.get(sensor.linkedNodeId) : undefined
        if (opcData && typeof opcData.value === 'number') {
          // 数值夹取到合法范围
          const config = GLOBAL_DEVICE_CONFIG[sensor.linkedNodeId!]
          let clampedValue = opcData.value
          if (config) {
            clampedValue = clampValue(opcData.value, config.minValue, config.maxValue)
          }
          sensor.value = clampedValue
          // 使用全局配置统一计算状态
          if (sensor.linkedNodeId) {
            sensor.status = calculateDeviceStatus(sensor.linkedNodeId, clampedValue)
          }
          if (opcData.quality !== 'Good') {
            sensor.status = opcData.quality === 'Bad' ? 'Error' : 'Warning'
          }
        }
      } else if (node.type === 'Pump') {
        const pump = node as PumpDevice & { linkedNodeId?: string }
        const opcData = pump.linkedNodeId ? realTimeData.value.get(pump.linkedNodeId) : undefined
        if (opcData) {
          if (typeof opcData.value === 'boolean') {
            pump.isRunning = opcData.value
            pump.status = opcData.value ? 'Running' : 'Stopped'
          } else if (typeof opcData.value === 'number') {
            // 数值夹取到合法范围
            const config = GLOBAL_DEVICE_CONFIG[pump.linkedNodeId!]
            let clampedSpeed = opcData.value
            if (config) {
              clampedSpeed = Math.round(clampValue(opcData.value, config.minValue, config.maxValue))
            }
            pump.speed = clampedSpeed
            pump.isRunning = clampedSpeed > 0
            // 使用全局配置统一计算状态
            if (pump.linkedNodeId && config) {
              pump.status = calculateDeviceStatus(pump.linkedNodeId, clampedSpeed)
            } else {
              pump.status = clampedSpeed > 0 ? 'Running' : 'Stopped'
            }
          }
          if (opcData.quality === 'Bad') pump.status = 'Error'
          else if (opcData.quality === 'Uncertain') pump.status = 'Warning'
        }
      } else if (node.type === 'Valve') {
        const valve = node as (ValveDevice & { linkedNodeId?: string; value: number })
        const opcData = valve.linkedNodeId ? realTimeData.value.get(valve.linkedNodeId) : undefined
        if (opcData && typeof opcData.value === 'number') {
          // 阀门开度严格夹取在 0-100 之间，防止进度条越界
          const clampedValue = clampValue(opcData.value, 0, 100)
          valve.value = clampedValue
          valve.position = clampedValue
          valve.isOpen = clampedValue > 0
          // 使用全局配置统一计算状态
          if (valve.linkedNodeId) {
            valve.status = calculateDeviceStatus(valve.linkedNodeId, clampedValue)
          } else {
            valve.status = clampedValue > 0 ? 'Running' : 'Stopped'
          }
          if (opcData.quality === 'Bad') valve.status = 'Error'
          else if (opcData.quality === 'Uncertain') valve.status = 'Warning'
        }
      }
    })

    topologyData.value.links.forEach(link => {
      const sourceNode = topologyData.value.nodes.find(n => n.id === link.source)
      const targetNode = topologyData.value.nodes.find(n => n.id === link.target)
      if (sourceNode?.status === 'Error' || targetNode?.status === 'Error') {
        link.status = 'Warning'
      } else if (sourceNode?.status === 'Stopped' || targetNode?.status === 'Stopped') {
        link.status = 'Inactive'
      } else {
        link.status = 'Active'
      }
    })
  }

  // 连接模拟
  function connect() {
    isConnected.value = true
    initNodeTree()
    initTopologyData()
  }

  // 断开连接
  function disconnect() {
    isConnected.value = false
  }

  // 计算属性
  const activeAlarmsCount = computed(() => alarms.value.filter(a => !a.acknowledged).length)
  const criticalAlarmsCount = computed(() => alarms.value.filter(a => a.severity === 'Critical' && !a.acknowledged).length)

  return {
    // 状态
    nodeTree,
    selectedNode,
    subscriptions,
    alarms,
    realTimeData,
    isConnected,
    dataHistory,
    topologyData,
    // 方法
    initNodeTree,
    initTopologyData,
    simulateDataUpdate,
    updateTopologyStatus,
    selectNode,
    addSubscription,
    removeSubscription,
    acknowledgeAlarm,
    clearAlarms,
    connect,
    disconnect,
    getAllVariableNodes,
    // 计算属性
    activeAlarmsCount,
    criticalAlarmsCount
  }
})
