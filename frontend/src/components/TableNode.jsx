import React from 'react'
import { Handle, Position } from 'reactflow'
import { Database, Key, Link2 } from 'lucide-react'

export default function TableNode({ data }) {
  return (
    <div className="bg-dark-900 border border-white/10 rounded-xl overflow-hidden min-w-[250px] shadow-xl">
      {/* Target Handle (for incoming connections) */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary border-2 border-dark-950" />
      
      {/* Table Header */}
      <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-3 border-b border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm text-white tracking-wide">{data.name}</h3>
        </div>
        <span className="text-[10px] text-gray-400 font-mono px-2 py-0.5 bg-dark-950 rounded-md border border-white/10">
          {data.records ? `${(data.records / 1000).toFixed(1)}k rows` : 'Table'}
        </span>
      </div>

      {/* Columns List */}
      <div className="p-2 flex flex-col gap-1 bg-dark-950/50">
        {(data.columns || []).map((col, index) => (
          <div key={index} className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-2">
              {col.pk ? (
                <Key className="w-3 h-3 text-yellow-500" title="Primary Key" />
              ) : col.fk ? (
                <Link2 className="w-3 h-3 text-primary" title="Foreign Key" />
              ) : (
                <div className="w-3 h-3" /> /* Spacer */
              )}
              <span className={`text-xs font-mono ${col.pk ? 'text-yellow-100 font-bold' : col.fk ? 'text-primary-100' : 'text-gray-300'}`}>
                {col.name}
              </span>
            </div>
            <span className="text-[10px] text-gray-500 font-mono uppercase">
              {col.type?.split('(')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Source Handle (for outgoing connections) */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-secondary border-2 border-dark-950" />
    </div>
  )
}
