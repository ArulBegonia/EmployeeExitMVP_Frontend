import React, { useEffect, useState } from 'react'
import api from '../../services/api.js'
import Card from '../../components/common/Card.jsx'
import Button from '../../components/common/Button.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import Loader from '../../components/common/Loader.jsx'
import toast from 'react-hot-toast'
import {
  RefreshCw, GitBranch, CheckCircle, Clock,
  Plus, Trash2, Calendar, User
} from 'lucide-react'
import { format } from 'date-fns'
import s from './KnowledgeTransfer.module.css'

function getCurrentEmpId() {
  try {
    const token = localStorage.getItem('em_token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return parseInt(payload['empId'] || payload['sub']) || null
  } catch { return null }
}

export default function KnowledgeTransfer() {
  const [list, setList] = useState([])
  const [loading, setL] = useState(true)
  const [editing, setEdit] = useState(null)
  const [ktMap, setKtMap] = useState({})
  const [ktLoading, setKtL] = useState({})
  const [form, setForm] = useState({ successorId: '', remarks: '', isCompleted: false })
  const [formErrors, setFormErrors] = useState({})      
  const [newTasks, setNewTasks] = useState([])
  const [taskInput, setTaskInput] = useState({ title: '', description: '', deadline: '' })
  const [taskErrors, setTaskErrors] = useState({})      
  const [saving, setSave] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const currentEmpId = getCurrentEmpId()  

  const load = () => {
    setL(true)
    api.get('/Exit/active-for-manager')
      .then(r => setList(r.data?.data || r.data || []))
      .catch(() => setList([]))
      .finally(() => setL(false))
  }
  useEffect(() => { load() }, [])

  const loadKtTasks = async (exitRequestId) => {
    setKtL(p => ({ ...p, [exitRequestId]: true }))
    try {
      const r = await api.get(`/Exit/kt-tasks/${exitRequestId}`)
      setKtMap(p => ({ ...p, [exitRequestId]: r.data?.data || r.data || [] }))
    } catch {
      setKtMap(p => ({ ...p, [exitRequestId]: [] }))
    } finally {
      setKtL(p => ({ ...p, [exitRequestId]: false }))
    }
  }

  const openEdit = async (r) => {
    setEdit(r.id)
    setForm({ successorId: '', remarks: '', isCompleted: r.isKtCompleted })
    setFormErrors({})
    setNewTasks([])
    setTaskInput({ title: '', description: '', deadline: '' })
    setTaskErrors({})
    await loadKtTasks(r.id)
  }

  // ── validate new task input ──
  const validateTaskInput = (lwd) => {
    const errs = {}
    if (!taskInput.title.trim())
      errs.title = 'Task title is required.'
    else if (taskInput.title.trim().length > 200)
      errs.title = 'Title must not exceed 200 characters.'

    // Duplicate title check across both existing and new tasks
    const existingTasks = ktMap[editing] || []
    const allTitles = [
      ...existingTasks.map(t => t.title.trim().toLowerCase()),
      ...newTasks.map(t => t.title.trim().toLowerCase()),
    ]
    if (taskInput.title.trim() &&
      allTitles.includes(taskInput.title.trim().toLowerCase()))
      errs.title = `A task named "${taskInput.title.trim()}" already exists.`

    if (!taskInput.deadline)
      errs.deadline = 'Deadline is required.'
    else if (new Date(taskInput.deadline) < new Date(format(new Date(), 'yyyy-MM-dd')))
      errs.deadline = 'Deadline cannot be in the past.'
    else if (lwd && new Date(taskInput.deadline) > new Date(lwd))
      errs.deadline = `Must be on or before last working day (${new Date(lwd).toLocaleDateString('en-GB')}).`

    if (taskInput.description && taskInput.description.length > 500)
      errs.description = 'Description must not exceed 500 characters.'

    setTaskErrors(errs)
    return Object.keys(errs).length === 0
  }

  const addNewTask = (lwd) => {
    if (!validateTaskInput(lwd)) return
    setNewTasks(p => [...p, { ...taskInput }])
    setTaskInput({ title: '', description: '', deadline: '' })
    setTaskErrors({})
  }

  const removeNewTask = (idx) => setNewTasks(p => p.filter((_, i) => i !== idx))

  const toggleTask = async (task) => {
    setTogglingId(task.id)
    try {
      await api.post('/Exit/update-kt-task', {
        taskId: task.id,
        isCompleted: !task.isCompleted,
        completionNotes: null,
      })
      toast.success(task.isCompleted ? 'Task marked incomplete' : 'Task marked complete ✅')
      await loadKtTasks(task.exitRequestId || editing)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed')
    } finally { setTogglingId(null) }
  }

  // ── validate KT form before save ──
  const validateForm = (employeeId) => {
    const errs = {}

    if (!form.successorId) {
      errs.successorId = 'Successor Employee ID is required.'
    }
    else if (isNaN(parseInt(form.successorId))) {
      errs.successorId = 'Successor ID must be a valid number.'
    }
    else if (currentEmpId && parseInt(form.successorId) === currentEmpId) {
      errs.successorId = 'You cannot assign yourself as the successor.'
    }
    else if (employeeId && parseInt(form.successorId) === employeeId) {
      errs.successorId = 'Successor cannot be the same employee who is exiting.'
    }

    if (form.remarks && form.remarks.length > 1000)
      errs.remarks = 'Remarks must not exceed 1000 characters.'

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const save = async (id, employeeId) => {
    if (!validateForm(employeeId)) {
      toast.error('Please fix the errors before saving.')
      return
    }
    const existingTasks = ktMap[id] || []

    if (existingTasks.length === 0 && newTasks.length === 0) {
      toast.error('At least one KT task is required.')
      return
    }
    setSave(true)
    try {
      await api.post('/Exit/update-knowledge-transfer', {
        exitRequestId: id,
        isCompleted: form.isCompleted,
        successorEmployeeId: form.successorId ? parseInt(form.successorId) : null,
        remarks: form.remarks || null,
        tasks: newTasks.length > 0
          ? newTasks.map(t => ({
            title: t.title,
            description: t.description || null,
            deadline: new Date(t.deadline).toISOString()
          }))
          : null,
      })
      toast.success('KT status updated!')
      setEdit(null)
      setNewTasks([])
      load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed')
    } finally { setSave(false) }
  }

  if (loading) return <Loader />

  if (list.length === 0) return (
    <div className={s.emptyWrap}>
      <div className={s.emptyVisual}>
        <div className={s.emptyRing1} />
        <div className={s.emptyRing2} />
        <div className={s.emptyIconWrap}><GitBranch size={26} /></div>
      </div>
      <div className={s.emptyText}>
        <h3>No Active KT Required</h3>
        <p>No active exit requests require KT management from you right now.</p>
      </div>
      <Button variant="ghost" size="sm" onClick={load}>
        <RefreshCw size={13} /> Refresh
      </Button>
    </div>
  )

  return (
    <div className={s.pg}>

      <div className={s.hdr}>
        <div className={s.hdrGrid} />
        <div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}>
            <span className={s.hdrEyebrowDot} />
            <span>Manager Portal</span>
          </div>
          <div className={s.hdrMain}>
            <div>
              <h2 className={s.hdrTitle}>Knowledge Transfer</h2>
              <p className={s.hdrSub}>
                {list.length} active exit{list.length !== 1 ? 's' : ''} requiring KT management
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={s.cards}>
        {list.map(r => {
          const tasks = ktMap[r.id] || []
          const isEditing = editing === r.id
          const tasksLoading = ktLoading[r.id]
          const completedCount = tasks.filter(t => t.isCompleted).length
          const allDone = tasks.length > 0 && completedCount === tasks.length
          const lwdForInput = r.proposedLastWorkingDate
            ? format(new Date(r.proposedLastWorkingDate), 'yyyy-MM-dd') : undefined
          const daysLeft = Math.max(0, Math.ceil(
            (new Date(r.proposedLastWorkingDate) - new Date()) / 86400000
          ))

          return (
            <Card key={r.id}
              className={`${s.rc} ${isEditing ? s.rcEditing : ''} ${r.isKtCompleted ? s.rcDone : ''}`}>

              <div className={`${s.ktStripe} ${r.isKtCompleted ? s.ktStripeDone : s.ktStripePending}`} />

              <div className={s.rtop}>
                <div className={s.rAvatar}>{r.employeeName?.charAt(0) || 'E'}</div>
                <div className={s.rtopMeta}>
                  <div className={s.rname}>{r.employeeName}</div>
                  <div className={s.rcodeRow}>
                    <span className={s.rcode}>{r.employeeCode}</span>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              </div>

              <div className={s.rfacts}>
                <div className={s.rfact}>
                  <span className={s.rfactLabel}>Last Day</span>
                  <strong className={s.rfactVal}>
                    {new Date(r.proposedLastWorkingDate).toLocaleDateString('en-GB')}
                  </strong>
                </div>
                <div className={s.rfact}>
                  <span className={s.rfactLabel}>Days Left</span>
                  <strong className={`${s.rfactVal} ${daysLeft <= 7 ? s.rfactUrgent : ''}`}>
                    {daysLeft}d
                  </strong>
                </div>
                <div className={s.rfact}>
                  <span className={s.rfactLabel}>KT</span>
                  <strong className={r.isKtCompleted ? s.rfactOk : s.rfactErr}>
                    {r.isKtCompleted ? '✓' : '✗'}
                  </strong>
                </div>
              </div>

              {tasks.length > 0 && !isEditing && (
                <div className={s.progress}>
                  <div className={s.progressTop}>
                    <span className={s.progressLabel}>Tasks</span>
                    <span className={`${s.progressCount} ${allDone ? s.progressCountDone : ''}`}>
                      {completedCount}/{tasks.length}
                    </span>
                  </div>
                  <div className={s.progressBar}>
                    <div
                      className={`${s.progressFill} ${allDone ? s.progressFillDone : ''}`}
                      style={{ width: `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {!isEditing && tasks.length > 0 && (
                <div className={s.taskPreview}>
                  {tasksLoading ? (
                    <div className={s.tasksLoading}>Loading tasks...</div>
                  ) : (
                    tasks.map(t => (
                      <div key={t.id} className={`${s.taskRow} ${t.isCompleted ? s.taskRowDone : ''}`}>
                        <button
                          type="button"
                          className={`${s.taskCheck} ${t.isCompleted ? s.taskCheckDone : ''}`}
                          onClick={() => toggleTask({ ...t, exitRequestId: r.id })}
                          disabled={togglingId === t.id}
                          title={t.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {t.isCompleted ? <CheckCircle size={13} /> : <Clock size={13} />}
                        </button>
                        <div className={s.taskInfo}>
                          <span className={`${s.taskTitle} ${t.isCompleted ? s.taskDone : ''}`}>
                            {t.title}
                          </span>
                          <span className={s.taskDeadline}>
                            <Calendar size={9} />
                            {new Date(t.deadline).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Edit Panel ── */}
              {isEditing ? (
                <div className={s.editPanel}>

                  {/* Successor ID with validation */}
                  <div className={s.fld}>
                    <label className={s.flabel}>
                      <User size={12} />
                      Successor Employee ID <span className={s.req}>*</span>
                    </label>
                    <input
                      className={`${s.finput} ${formErrors.successorId ? s.inputErr : ''}`}
                      type="number"
                      placeholder="e.g. 1042"
                      value={form.successorId}
                      onChange={e => {
                        setForm(p => ({ ...p, successorId: e.target.value }))
                        if (formErrors.successorId)
                          setFormErrors(p => ({ ...p, successorId: undefined }))
                      }}
                    />
                    {formErrors.successorId && (
                      <span className={s.fieldErr}>{formErrors.successorId}</span>
                    )}
                  </div>

                  {/* Remarks with char counter */}
                  <div className={s.fld}>
                    <label className={s.flabel}>Remarks</label>
                    <textarea
                      className={`${s.ftextarea} ${formErrors.remarks ? s.inputErr : ''}`}
                      rows={2}
                      placeholder="KT notes..."
                      value={form.remarks}
                      onChange={e => {
                        setForm(p => ({ ...p, remarks: e.target.value }))
                        if (formErrors.remarks)
                          setFormErrors(p => ({ ...p, remarks: undefined }))
                      }}
                    />
                    <span className={s.charCount}
                      style={{ color: form.remarks.length > 1000 ? '#DC2626' : undefined }}>
                      {form.remarks.length}/1000
                    </span>
                    {formErrors.remarks && (
                      <span className={s.fieldErr}>{formErrors.remarks}</span>
                    )}
                  </div>

                  {/* Add new tasks */}
                  <div className={s.addTaskSection}>
                    <div className={s.addTaskHdr}>
                      <div className={s.addTaskHdrIcon}><GitBranch size={13} /></div>
                      <div>
                        <div className={s.addTaskHdrTitle}>
                          Add New KT Tasks <span className={s.opt}>(Optional)</span>
                        </div>
                        <div className={s.addTaskHdrSub}>
                          Deadlines on or before{' '}
                          {new Date(r.proposedLastWorkingDate).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </div>

                    <div className={s.taskInputRow}>
                      <div className={s.taskInputField}>
                        <input
                          className={`${s.tinput} ${taskErrors.title ? s.inputErr : ''}`}
                          placeholder="Task title *"
                          value={taskInput.title}
                          onChange={e => {
                            setTaskInput(p => ({ ...p, title: e.target.value }))
                            if (taskErrors.title)
                              setTaskErrors(p => ({ ...p, title: undefined }))
                          }}
                        />
                        {taskErrors.title && (
                          <span className={s.fieldErr}>{taskErrors.title}</span>
                        )}
                      </div>
                      <div className={s.taskInputField}>
                        <input
                          className={`${s.tinput} ${taskErrors.description ? s.inputErr : ''}`}
                          placeholder="Description (optional)"
                          value={taskInput.description}
                          onChange={e => {
                            setTaskInput(p => ({ ...p, description: e.target.value }))
                            if (taskErrors.description)
                              setTaskErrors(p => ({ ...p, description: undefined }))
                          }}
                        />
                        {taskErrors.description && (
                          <span className={s.fieldErr}>{taskErrors.description}</span>
                        )}
                      </div>
                      <div className={s.taskInputField}>
                        <input
                          className={`${s.tinput} ${taskErrors.deadline ? s.inputErr : ''}`}
                          type="date"
                          min={format(new Date(), 'yyyy-MM-dd')}
                          max={lwdForInput}
                          value={taskInput.deadline}
                          onChange={e => {
                            setTaskInput(p => ({ ...p, deadline: e.target.value }))
                            if (taskErrors.deadline)
                              setTaskErrors(p => ({ ...p, deadline: undefined }))
                          }}
                        />
                        {taskErrors.deadline && (
                          <span className={s.fieldErr}>{taskErrors.deadline}</span>
                        )}
                      </div>
                      <Button variant="outline" size="sm"
                        onClick={() => addNewTask(r.proposedLastWorkingDate)}
                        disabled={!taskInput.title.trim() || !taskInput.deadline}>
                        <Plus size={12} /> Add
                      </Button>
                    </div>

                    {newTasks.length > 0 && (
                      <div className={s.newTaskList}>
                        {newTasks.map((t, i) => (
                          <div key={i} className={s.newTaskItem}>
                            <div className={s.taskItemIcon}><GitBranch size={11} /></div>
                            <div className={s.taskInfo}>
                              <span className={s.taskTitle}>{t.title}</span>
                              {t.description && (
                                <span className={s.taskDesc}>{t.description}</span>
                              )}
                              <span className={s.taskDeadline}>
                                <Calendar size={9} />
                                Due: {new Date(t.deadline).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                            <button type="button" className={s.removeBtn}
                              onClick={() => removeNewTask(i)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <label className={s.checkRow} htmlFor={`kt-done-${r.id}`}>
                    <input
                      type="checkbox"
                      id={`kt-done-${r.id}`}
                      checked={form.isCompleted}
                      onChange={e => setForm(p => ({ ...p, isCompleted: e.target.checked }))}
                    />
                    <CheckCircle size={15} />
                    Mark Knowledge Transfer as Completed
                  </label>

                  <div className={s.formActions}>
                    <Button variant="ghost" size="sm" onClick={() => setEdit(null)}>Cancel</Button>
                    {/* ── Pass employeeId to save for self-assignment check ── */}
                    <Button variant="primary" size="sm" loading={saving}
                      onClick={() => save(r.id, r.employeeId)}>
                      Save KT Update
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={s.racts}>
                  <button className={`${s.ractIcon} ${s.ractManage}`}
                    title="Manage KT" onClick={() => openEdit(r)}>
                    <GitBranch size={14} />
                    <span className={s.ractLabel}>Manage KT</span>
                  </button>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
