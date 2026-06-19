<template>
  <div class="data-dashboard">
    <!-- 仪表盘区域 -->
    <div class="gauges-section">
      <h3 class="section-title">实时仪表</h3>
      <div class="gauges-grid">
        <!-- 温度仪表 -->
        <div class="gauge-card">
          <div class="gauge-label">温度</div>
          <div class="gauge-value" :class="getTempClass(temperature)">
            {{ temperature.toFixed(1) }}
            <span class="gauge-unit">°C</span>
          </div>
          <el-progress
            :percentage="safePercentage(temperature, GLOBAL_DEVICE_CONFIG.temp_sensor.maxValue)"
            :color="getTempColor(temperature)"
            :stroke-width="8"
          />
          <div class="gauge-quality">
            <span class="quality-dot" :class="getQualityClass('temp_sensor')"></span>
            {{ getNodeQuality('temp_sensor') }}
          </div>
        </div>

        <!-- 压力表 -->
        <div class="gauge-card">
          <div class="gauge-label">压力</div>
          <div class="gauge-value" :class="getPressureClass(pressure)">
            {{ pressure.toFixed(2) }}
            <span class="gauge-unit">MPa</span>
          </div>
          <el-progress
            :percentage="safePercentage(pressure, GLOBAL_DEVICE_CONFIG.pressure_transmitter.maxValue)"
            :color="getPressureColor(pressure)"
            :stroke-width="8"
          />
          <div class="gauge-quality">
            <span class="quality-dot" :class="getQualityClass('pressure_transmitter')"></span>
            {{ getNodeQuality('pressure_transmitter') }}
          </div>
        </div>

        <!-- 流量计 -->
        <div class="gauge-card">
          <div class="gauge-label">流量</div>
          <div class="gauge-value" :class="getFlowClass(flow)">
            {{ flow.toFixed(1) }}
            <span class="gauge-unit">L/min</span>
          </div>
          <el-progress
            :percentage="safePercentage(flow, GLOBAL_DEVICE_CONFIG.flow_meter.maxValue)"
            :color="getFlowColor(flow)"
            :stroke-width="8"
          />
          <div class="gauge-quality">
            <span class="quality-dot" :class="getQualityClass('flow_meter')"></span>
            {{ getNodeQuality('flow_meter') }}
          </div>
        </div>

        <!-- 阀门开度 -->
        <div class="gauge-card">
          <div class="gauge-label">阀门开度</div>
          <div class="gauge-value" :class="getValveClass(valvePosition)">
            {{ valvePosition.toFixed(0) }}
            <span class="gauge-unit">%</span>
          </div>
          <el-progress
            :percentage="safePercentage(valvePosition, 100)"
            :color="getValveColor(valvePosition)"
            :stroke-width="8"
          />
          <div class="gauge-quality">
            <span class="quality-dot" :class="getQualityClass('valve_position')"></span>
            {{ getNodeQuality('valve_position') }}
          </div>
        </div>

        <!-- 电机转速 -->
        <div class="gauge-card">
          <div class="gauge-label">电机转速</div>
          <div class="gauge-value" :class="getSpeedClass(motorSpeed)">
            {{ motorSpeed }}
            <span class="gauge-unit">RPM</span>
          </div>
          <el-progress
            :percentage="safePercentage(motorSpeed, GLOBAL_DEVICE_CONFIG.motor_speed.maxValue)"
            :color="getSpeedColor(motorSpeed)"
            :stroke-width="8"
          />
          <div class="gauge-quality">
            <span class="quality-dot" :class="getQualityClass('motor_speed')"></span>
            {{ getNodeQuality('motor_speed') }}
          </div>
        </div>

        <!-- 泵状态 -->
        <div class="gauge-card">
          <div class="gauge-label">泵运行状态</div>
          <div class="gauge-value" :class="pumpStatus ? 'text-green-400' : 'text-red-400'">
            {{ pumpStatus ? '运行中' : '已停止' }}
          </div>
          <div class="pump-indicator" :class="pumpStatus ? 'pump-on' : 'pump-off'">
            <el-icon :size="32"><CircleCheckFilled v-if="pumpStatus" /><CircleCloseFilled v-else /></el-icon>
          </div>
          <div class="gauge-quality">
            <span class="quality-dot" :class="getQualityClass('pump_status')"></span>
            {{ getNodeQuality('pump_status') }}
          </div>
        </div>
      </div>
    </div>

    <!-- 趋势图区域 -->
    <div class="charts-section">
      <h3 class="section-title">数据趋势</h3>
      <div class="charts-grid">
        <div class="chart-card">
          <v-chart :option="tempChartOption" autoresize class="chart" />
        </div>
        <div class="chart-card">
          <v-chart :option="pressureChartOption" autoresize class="chart" />
        </div>
        <div class="chart-card">
          <v-chart :option="flowChartOption" autoresize class="chart" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, TitleComponent } from 'echarts/components'
import { CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { useOpcuaStore } from '../store/opcua'
import { GLOBAL_DEVICE_CONFIG, clampValue, getValueLevel } from '../types'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, TitleComponent])

const store = useOpcuaStore()

// 获取节点当前值（进行数值夹取，确保在合法范围内）
function getNodeValue(nodeId: string): number | boolean {
  const data = store.realTimeData.get(nodeId)
  let rawValue: number | boolean
  if (data) {
    rawValue = data.value as number | boolean
  } else {
    const node = findNodeById(nodeId)
    rawValue = node?.value ?? 0
  }
  // 对数值进行夹取
  if (typeof rawValue === 'number') {
    const config = GLOBAL_DEVICE_CONFIG[nodeId]
    if (config) {
      rawValue = clampValue(rawValue, config.minValue, config.maxValue)
    }
  }
  return rawValue
}

// 安全计算进度条百分比，始终返回 0-100 之间
function safePercentage(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0
  return clampValue((value / maxValue) * 100, 0, 100)
}

function getNodeQuality(nodeId: string): string {
  const data = store.realTimeData.get(nodeId)
  if (data) return data.quality
  const node = findNodeById(nodeId)
  return node?.quality ?? 'Unknown'
}

function findNodeById(id: string) {
  function search(nodes: any[]): any {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children) {
        const found = search(node.children)
        if (found) return found
      }
    }
    return null
  }
  return search(store.nodeTree)
}

function getQualityClass(nodeId: string): string {
  const quality = getNodeQuality(nodeId)
  return quality === 'Good' ? 'quality-good' : quality === 'Bad' ? 'quality-bad' : 'quality-uncertain'
}

// 实时数值
const temperature = computed(() => getNodeValue('temp_sensor') as number || 25)
const pressure = computed(() => getNodeValue('pressure_transmitter') as number || 3.5)
const flow = computed(() => getNodeValue('flow_meter') as number || 150)
const valvePosition = computed(() => getNodeValue('valve_position') as number || 75)
const motorSpeed = computed(() => getNodeValue('motor_speed') as number || 1480)
const pumpStatus = computed(() => getNodeValue('pump_status') as boolean)

// 根据全局配置统一判断数值等级并返回对应的样式
function getLevelClass(nodeId: string, val: number): string {
  const config = GLOBAL_DEVICE_CONFIG[nodeId]
  if (!config) return 'text-green-400'
  const level = getValueLevel(val, config)
  if (level === 'Critical' || level === 'OutOfRange') return 'text-red-400'
  if (level === 'Warning') return 'text-yellow-400'
  return 'text-green-400'
}

function getLevelColor(nodeId: string, val: number, normalColor: string): string {
  const config = GLOBAL_DEVICE_CONFIG[nodeId]
  if (!config) return normalColor
  const level = getValueLevel(val, config)
  if (level === 'Critical' || level === 'OutOfRange') return '#f56c6c'
  if (level === 'Warning') return '#e6a23c'
  return normalColor
}

// 温度和颜色判断（统一使用全局配置）
function getTempClass(val: number) {
  return getLevelClass('temp_sensor', val)
}

function getTempColor(val: number) {
  return getLevelColor('temp_sensor', val, '#67c23a')
}

function getPressureClass(val: number) {
  return getLevelClass('pressure_transmitter', val).replace('text-green-400', 'text-cyan-400')
}

function getPressureColor(val: number) {
  return getLevelColor('pressure_transmitter', val, '#06b6d4')
}

function getFlowClass(val: number) {
  return getLevelClass('flow_meter', val).replace('text-green-400', 'text-blue-400')
}

function getFlowColor(val: number) {
  return getLevelColor('flow_meter', val, '#60a5fa')
}

function getValveClass(val: number) {
  return getLevelClass('valve_position', val).replace('text-green-400', 'text-purple-400')
}

function getValveColor(val: number) {
  return getLevelColor('valve_position', val, '#a78bfa')
}

function getSpeedClass(val: number) {
  return getLevelClass('motor_speed', val).replace('text-green-400', 'text-emerald-400')
}

function getSpeedColor(val: number) {
  return getLevelColor('motor_speed', val, '#34d399')
}

// 构建趋势图
function buildChartOption(title: string, nodeId: string, color: string, unit: string) {
  const history = store.dataHistory.get(nodeId) || []
  const data = history.map(h => [h.timestamp, h.value])

  return {
    title: { text: title, textStyle: { color: '#e0e0e0', fontSize: 14 }, left: 'center' },
    tooltip: { trigger: 'axis' as const },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'time' as const,
      axisLabel: { color: '#999', formatter: '{HH}:{mm}:{ss}' },
      axisLine: { lineStyle: { color: '#444' } }
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { color: '#999', formatter: `{value} ${unit}` },
      splitLine: { lineStyle: { color: '#333' } }
    },
    series: [{
      type: 'line',
      data,
      smooth: true,
      lineStyle: { color, width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '40' }, { offset: 1, color: color + '05' }] } },
      symbol: 'none'
    }]
  }
}

const tempChartOption = computed(() => buildChartOption('温度趋势', 'temp_sensor', '#67c23a', '°C'))
const pressureChartOption = computed(() => buildChartOption('压力趋势', 'pressure_transmitter', '#06b6d4', 'MPa'))
const flowChartOption = computed(() => buildChartOption('流量趋势', 'flow_meter', '#60a5fa', 'L/min'))
</script>

<style scoped>
.data-dashboard {
  height: 100%;
  overflow-y: auto;
  padding: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #22d3ee;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #06b6d4;
}

.gauges-section {
  margin-bottom: 20px;
}

.gauges-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.gauge-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gauge-label {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

.gauge-value {
  font-size: 28px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
}

.gauge-unit {
  font-size: 14px;
  color: #64748b;
  font-weight: normal;
}

.gauge-quality {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
}

.quality-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.quality-good { background: #67c23a; }
.quality-bad { background: #f56c6c; }
.quality-uncertain { background: #e6a23c; }

.pump-indicator {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.pump-on { color: #67c23a; }
.pump-off { color: #f56c6c; }

.charts-section {
  margin-top: 16px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.chart-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 8px;
  padding: 12px;
}

.chart {
  height: 220px;
  width: 100%;
}

@media (max-width: 1200px) {
  .gauges-grid { grid-template-columns: repeat(2, 1fr); }
  .charts-grid { grid-template-columns: 1fr; }
}
</style>
