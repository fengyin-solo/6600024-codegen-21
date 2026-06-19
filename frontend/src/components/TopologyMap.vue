<template>
  <div class="topology-container">
    <div class="topology-header">
      <h3 class="section-title">
        <el-icon class="text-cyan-400"><Share /></el-icon>
        生产区域拓扑图
      </h3>
      <div class="topology-legend">
        <div class="legend-item">
          <span class="legend-dot bg-green-500"></span>
          <span class="legend-text">运行</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot bg-yellow-500"></span>
          <span class="legend-text">警告</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot bg-red-500"></span>
          <span class="legend-text">故障</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot bg-gray-500"></span>
          <span class="legend-text">停止</span>
        </div>
        <el-divider direction="vertical" class="mx-2" />
        <div class="legend-item">
          <el-icon class="text-cyan-400"><Grid /></el-icon>
          <span class="legend-text">区域</span>
        </div>
        <div class="legend-item">
          <el-icon class="text-purple-400"><SetUp /></el-icon>
          <span class="legend-text">生产线</span>
        </div>
        <div class="legend-item">
          <el-icon class="text-blue-400"><Cpu /></el-icon>
          <span class="legend-text">泵/电机</span>
        </div>
        <div class="legend-item">
          <el-icon class="text-orange-400"><Switch /></el-icon>
          <span class="legend-text">阀门</span>
        </div>
        <div class="legend-item">
          <el-icon class="text-green-400"><Monitor /></el-icon>
          <span class="legend-text">传感器</span>
        </div>
      </div>
    </div>

    <div class="topology-content">
      <v-chart :option="chartOption" autoresize class="topology-chart" @click="handleChartClick" />
    </div>

    <!-- 设备详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      :title="selectedDevice?.name || '设备详情'"
      width="420px"
      class="dark-dialog"
    >
      <div v-if="selectedDevice" class="device-detail">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="设备名称">{{ selectedDevice.name }}</el-descriptions-item>
          <el-descriptions-item label="设备类型">{{ getDeviceTypeLabel(selectedDevice.type) }}</el-descriptions-item>
          <el-descriptions-item label="运行状态">
            <el-tag :type="getStatusType(selectedDevice.status)" effect="dark">
              {{ getStatusLabel(selectedDevice.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedDevice.description" label="描述">
            {{ selectedDevice.description }}
          </el-descriptions-item>
          <template v-if="selectedDevice.type === 'Sensor'">
            <el-descriptions-item label="传感器类型">
              {{ getSensorTypeLabel((selectedDevice as any).sensorType) }}
            </el-descriptions-item>
            <el-descriptions-item label="当前值">
              <span class="text-green-400 font-mono text-lg">
                {{ (selectedDevice as any).value?.toFixed(2) }} {{ (selectedDevice as any).unit }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item v-if="(selectedDevice as any).warningThreshold !== undefined" label="警告阈值">
              {{ (selectedDevice as any).warningThreshold }} {{ (selectedDevice as any).unit }}
            </el-descriptions-item>
            <el-descriptions-item v-if="(selectedDevice as any).criticalThreshold !== undefined" label="危险阈值">
              {{ (selectedDevice as any).criticalThreshold }} {{ (selectedDevice as any).unit }}
            </el-descriptions-item>
          </template>
          <template v-if="selectedDevice.type === 'Pump'">
            <el-descriptions-item label="运行状态">
              {{ (selectedDevice as any).isRunning ? '运行中' : '已停止' }}
            </el-descriptions-item>
            <el-descriptions-item label="转速">
              <span class="text-cyan-400 font-mono">{{ (selectedDevice as any).speed }} {{ (selectedDevice as any).unit }}</span>
            </el-descriptions-item>
            <el-descriptions-item v-if="(selectedDevice as any).flowRate !== undefined" label="流量">
              {{ (selectedDevice as any).flowRate?.toFixed(1) }} L/min
            </el-descriptions-item>
            <el-descriptions-item v-if="(selectedDevice as any).pressure !== undefined" label="压力">
              {{ (selectedDevice as any).pressure?.toFixed(2) }} MPa
            </el-descriptions-item>
          </template>
          <template v-if="selectedDevice.type === 'Valve'">
            <el-descriptions-item label="开关状态">
              {{ (selectedDevice as any).isOpen ? '开启' : '关闭' }}
            </el-descriptions-item>
            <el-descriptions-item label="开度">
              <span class="text-purple-400 font-mono">{{ (selectedDevice as any).value }} {{ (selectedDevice as any).unit }}</span>
            </el-descriptions-item>
            <el-descriptions-item v-if="(selectedDevice as any).targetPosition !== undefined" label="目标开度">
              {{ (selectedDevice as any).targetPosition }} {{ (selectedDevice as any).unit }}
            </el-descriptions-item>
          </template>
        </el-descriptions>

        <div class="detail-actions mt-4">
          <el-button type="primary" size="small" @click="locateInTree">在节点树中定位</el-button>
          <el-button type="info" size="small" @click="detailVisible = false">关闭</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GraphChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent
} from 'echarts/components'
import { ElMessage } from 'element-plus'
import {
  Share,
  Grid,
  SetUp,
  Cpu,
  Switch,
  Monitor
} from '@element-plus/icons-vue'
import { useOpcuaStore } from '../store/opcua'
import type {
  TopologyDevice,
  TopologyDeviceType,
  DeviceStatus,
  SensorType
} from '../types'

use([
  CanvasRenderer,
  GraphChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent
])

const store = useOpcuaStore()
const detailVisible = ref(false)
const selectedDevice = ref<TopologyDevice | null>(null)

function getStatusColor(status: DeviceStatus): string {
  switch (status) {
    case 'Running': return '#10b981'
    case 'Warning': return '#f59e0b'
    case 'Error': return '#ef4444'
    case 'Stopped': return '#6b7280'
    case 'Offline': return '#374151'
    default: return '#6b7280'
  }
}

function getStatusType(status: DeviceStatus): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'Running': return 'success'
    case 'Warning': return 'warning'
    case 'Error': return 'danger'
    default: return 'info'
  }
}

function getStatusLabel(status: DeviceStatus): string {
  switch (status) {
    case 'Running': return '运行中'
    case 'Warning': return '警告'
    case 'Error': return '故障'
    case 'Stopped': return '已停止'
    case 'Offline': return '离线'
    default: return '未知'
  }
}

function getDeviceTypeLabel(type: TopologyDeviceType): string {
  switch (type) {
    case 'Area': return '生产区域'
    case 'ProductionLine': return '生产线'
    case 'Pump': return '泵/电机'
    case 'Valve': return '阀门'
    case 'Sensor': return '传感器'
  }
}

function getSensorTypeLabel(type: SensorType): string {
  switch (type) {
    case 'Temperature': return '温度传感器'
    case 'Pressure': return '压力传感器'
    case 'Flow': return '流量计'
    case 'Level': return '液位传感器'
  }
}

function getDeviceValueLabel(node: TopologyDevice): string {
  if (node.type === 'Sensor') {
    const s = node as any
    return `${s.value?.toFixed(1)} ${s.unit}`
  }
  if (node.type === 'Pump') {
    const p = node as any
    return p.isRunning ? `${p.speed} ${p.unit}` : '已停止'
  }
  if (node.type === 'Valve') {
    const v = node as any
    return `${v.value} ${v.unit}`
  }
  return ''
}

function getNodeSymbolSize(node: TopologyDevice): number {
  switch (node.type) {
    case 'Area': return 80
    case 'ProductionLine': return 60
    case 'Pump':
    case 'Valve':
    case 'Sensor': return 45
    default: return 40
  }
}

const chartOption = computed(() => {
  const nodes = store.topologyData.nodes.map((node: any) => ({
    id: node.id,
    name: node.name,
    x: node.x,
    y: node.y,
    symbolSize: getNodeSymbolSize(node),
    category: node.type,
    itemStyle: {
      color: getStatusColor(node.status),
      borderColor: node.status === 'Warning' ? '#fbbf24' : node.status === 'Error' ? '#f87171' : '#1e293b',
      borderWidth: node.status === 'Warning' || node.status === 'Error' ? 3 : 1,
      shadowBlur: node.status === 'Warning' || node.status === 'Error' ? 15 : 5,
      shadowColor: getStatusColor(node.status),
      opacity: node.status === 'Offline' ? 0.4 : 1
    },
    label: {
      show: true,
      position: 'bottom',
      distance: 8,
      color: '#e2e8f0',
      fontSize: 11,
      fontWeight: 500,
      formatter: (params: any) => {
        const valueLabel = getDeviceValueLabel(node)
        return `{name|${params.name}}${valueLabel ? `\n{value|${valueLabel}}` : ''}`
      },
      rich: {
        name: {
          color: '#cbd5e1',
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 16
        },
        value: {
          color: '#22d3ee',
          fontSize: 10,
          fontFamily: 'monospace',
          lineHeight: 14
        }
      }
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 20,
        shadowColor: getStatusColor(node.status)
      },
      label: {
        fontSize: 12
      }
    }
  }))

  const links = store.topologyData.links.map(link => ({
    source: link.source,
    target: link.target,
    label: {
      show: !!link.label,
      formatter: link.label || '',
      color: '#94a3b8',
      fontSize: 10
    },
    lineStyle: {
      color: link.status === 'Active'
        ? '#06b6d4'
        : link.status === 'Warning'
          ? '#f59e0b'
          : '#374151',
      width: link.status === 'Active' ? 2 : 1.5,
      opacity: link.status === 'Inactive' ? 0.3 : 0.8,
      curveness: 0.15
    }
  }))

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#06b6d4',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0' },
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const node = store.topologyData.nodes.find((n: any) => n.id === params.data.id)
          if (!node) return ''
          const statusColor = getStatusColor(node.status)
          const valueLabel = getDeviceValueLabel(node)
          return `
            <div style="font-weight:bold;margin-bottom:6px;color:${statusColor}">${node.name}</div>
            <div style="color:#94a3b8">类型: ${getDeviceTypeLabel(node.type)}</div>
            <div style="color:#94a3b8">状态: ${getStatusLabel(node.status)}</div>
            ${valueLabel ? `<div style="color:#22d3ee">数值: ${valueLabel}</div>` : ''}
            ${node.description ? `<div style="color:#64748b;margin-top:4px">${node.description}</div>` : ''}
          `
        } else if (params.dataType === 'edge') {
          return params.data.label || '连接'
        }
        return ''
      }
    },
    animationDuration: 300,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        type: 'graph',
        layout: 'none',
        roam: true,
        draggable: true,
        focusNodeAdjacency: true,
        data: nodes,
        links,
        categories: [
          { name: 'Area' },
          { name: 'ProductionLine' },
          { name: 'Pump' },
          { name: 'Valve' },
          { name: 'Sensor' }
        ],
        lineStyle: {
          curveness: 0.15
        },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [0, 8],
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 3
          }
        }
      }
    ]
  }
})

function handleChartClick(params: any) {
  if (params.dataType === 'node') {
    const node = store.topologyData.nodes.find((n: any) => n.id === params.data.id)
    if (node) {
      selectedDevice.value = node as TopologyDevice
      detailVisible.value = true
    }
  }
}

function locateInTree() {
  if (!selectedDevice.value) return
  const linkedNodeId = (selectedDevice.value as any).linkedNodeId
  if (linkedNodeId) {
    function search(nodes: any[]): any {
      for (const node of nodes) {
        if (node.id === linkedNodeId) return node
        if (node.children) {
          const found = search(node.children)
          if (found) return found
        }
      }
      return null
    }
    const found = search(store.nodeTree)
    if (found) {
      store.selectNode(found)
      detailVisible.value = false
      ElMessage.success(`已定位到节点: ${found.name}`)
    }
  }
}

watch(
  () => store.isConnected,
  (connected) => {
    if (!connected) {
      store.topologyData.nodes.forEach((node: any) => {
        node.status = 'Offline'
      })
    }
  }
)
</script>

<style scoped>
.topology-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px;
}

.topology-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  color: #22d3ee;
  padding-left: 8px;
  border-left: 3px solid #06b6d4;
  margin: 0;
}

.topology-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.legend-text {
  font-size: 12px;
  color: #94a3b8;
}

.topology-content {
  flex: 1;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 8px;
  overflow: hidden;
  min-height: 400px;
}

.topology-chart {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.device-detail {
  padding: 4px 0;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.el-descriptions) {
  --el-descriptions-item-bordered-label-background: #1f2937;
  --el-descriptions-text-color: #e2e8f0;
  --el-descriptions-label-text-color: #94a3b8;
}

:deep(.el-dialog) {
  background: #1e293b;
  border: 1px solid #334155;
}

:deep(.el-dialog__title) {
  color: #e2e8f0;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #94a3b8;
}

:deep(.el-divider) {
  --el-border-color: #334155;
}
</style>
