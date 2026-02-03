import React from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

export default function TempChart({ labels = [], max = [], min = [] }){
  const data = {
    labels,
    datasets: [
      { label: 'Max °C', data: max, borderColor: '#ff6b6b', backgroundColor: 'rgba(255,107,107,0.08)', tension: 0.3 },
      { label: 'Min °C', data: min, borderColor: '#4caf50', backgroundColor: 'rgba(76,175,80,0.08)', tension: 0.3 }
    ]
  }
  const options = { responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'top'}} }
  return (
    <div style={{height: '260px'}}>
      <Line data={data} options={options} />
    </div>
  )
}
