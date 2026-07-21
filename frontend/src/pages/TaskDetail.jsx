import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TaskDetailModal from '../components/TaskDetailModal'

const TaskDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="py-12 flex justify-center items-center">
      <TaskDetailModal
        taskId={id}
        onClose={() => navigate('/kanban')}
        onTaskUpdated={() => {}}
      />
    </div>
  )
}

export default TaskDetail
