import React, { useEffect, useState } from 'react'
import { llmRouter, LLMModel } from '../lib/llmRouter'
import useStore from '../lib/store'

interface RouterStats {
  [modelId: string]: {
    count: number
    avgLatency: number
    successRate: number
  }
}

export const LLMRouterDashboard: React.FC = () => {
  const { agents } = useStore()
  const [stats, setStats] = useState<RouterStats>({})

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(llmRouter.getPerformanceStats())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">LLM Router Dashboard</h2>
      
      {/* Active Agent Models */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Active Agents</h3>
        <div className="grid grid-cols-2 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="bg-gray-800 p-3 rounded">
              <div className="flex justify-between items-center">
                <span className="font-medium">{agent.name}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  agent.status === 'active' ? 'bg-green-600' : 
                  agent.status === 'idle' ? 'bg-yellow-600' : 'bg-red-600'
                }`}>
                  {agent.status}
                </span>
              </div>
              {agent.currentModel && (
                <div className="mt-2 text-sm text-gray-300">
                  Model: {agent.currentModel.name}
                  <br />
                  Task: {agent.taskType || 'none'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Performance Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Model Performance</h3>
        <div className="space-y-2">
          {Object.entries(stats).map(([modelId, stat]) => (
            <div key={modelId} className="bg-gray-800 p-3 rounded flex justify-between">
              <span>{modelId}</span>
              <div className="text-sm text-gray-300">
                {stat.count} calls | {Math.round(stat.avgLatency)}ms avg | {Math.round((stat.successRate / stat.count) * 100)}% success
              </div>
            </div>
          ))}
        </div>
