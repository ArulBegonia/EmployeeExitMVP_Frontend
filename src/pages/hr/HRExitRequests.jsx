import React, { useEffect, useState, useMemo } from 'react'
import api from '../../services/api.js'
import Card from '../../components/common/Card.jsx'
import Button from '../../components/common/Button.jsx'
import Modal from '../../components/common/Modal.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import RiskBadge from '../../components/common/RiskBadge.jsx'
import StepTimeline from '../../components/common/StepTimeline.jsx'
import Loader from '../../components/common/Loader.jsx'
import toast from 'react-hot-toast'
import {
Search, CheckCircle, XCircle, Eye,
User, Clock
} from 'lucide-react'
import s from './HRExitRequests.module.css'

const ALL_STATUSES = [
'PendingL1Approval','PendingL2Approval','PendingHrReview',
'ClearanceInProgress','SettlementPending','Completed','Rejected'
]

export default function HRExitRequests(){

const [list,setList] = useState([])
const [loading,setL] = useState(true)

const [search,setSearch] = useState('')
const [statusF,setStatusF] = useState('')
const [riskF,setRiskF] = useState('')

const [selected,setSel] = useState(null)
const [viewMode,setVM] = useState('view')

const [dec,setDec] = useState({isApproved:true,remarks:''})
const [remarksErr,setRemarksErr] = useState('')

const [saving,setSave] = useState(false)

const [history,setHist] = useState([])
const [histLoading,setHL] = useState(false)

const load=()=>{
setL(true)
api.get('/Exit/all-requests')
.then(r=>setList(r.data?.data || r.data || []))
.catch(()=>setList([]))
.finally(()=>setL(false))
}

useEffect(()=>{load()},[])

const loadHistory = async(id)=>{
setHL(true)
try{
const r = await api.get(`/Exit/history/${id}`)
setHist(r.data?.data || r.data || [])
}catch{
setHist([])
}
finally{
setHL(false)
}
}

const filtered = useMemo(()=>{
return list.filter(r=>{

const q = search.toLowerCase()

const matchSearch =
!q ||
r.employeeName?.toLowerCase().includes(q) ||
r.employeeCode?.toLowerCase().includes(q) ||
r.id?.toString().includes(q)

const matchStatus = !statusF || r.status===statusF
const matchRisk = !riskF || r.riskLevel===riskF

return matchSearch && matchStatus && matchRisk

})
},[list,search,statusF,riskF])


const openDetail=(r)=>{
setSel(r)
setVM('view')
setDec({isApproved:true,remarks:''})
setRemarksErr('')
loadHistory(r.id)
}

const validateRemarks=()=>{

if(!dec.isApproved && !dec.remarks.trim()){
setRemarksErr('Rejection reason is required.')
return false
}

if(dec.remarks.length>1000){
setRemarksErr('Remarks must not exceed 1000 characters.')
return false
}

setRemarksErr('')
return true
}

const submitDecision=async()=>{

if(!validateRemarks()) return

setSave(true)

try{

await api.post('/Exit/hr-approval',{
exitRequestId:selected.id,
isApproved:dec.isApproved,
remarks:dec.remarks || null
})

toast.success(dec.isApproved
? 'Exit request approved by HR!'
: 'Request rejected.')

setSel(null)
load()

}catch(e){

toast.error(e.response?.data?.message || 'Action failed')

}
finally{
setSave(false)
}

}

if(loading) return <Loader/>

return(

<div className={s.pg}>

{/* HEADER */}

<div className={s.hdr}>
<div className={s.hdrGrid}/>
<div className={s.hdrOrb}/>

<div className={s.hdrContent}>

<div className={s.hdrEyebrow}>
<span className={s.hdrEyebrowDot}/>
<span>HR Portal</span>
</div>

<div className={s.hdrMain}>
<div>
<h2 className={s.hdrTitle}>All Exit Requests</h2>
<p className={s.hdrSub}>
<span className={s.pendingBadge}>
{list.length} total exit requests
</span>
</p>
</div>
</div>

</div>
</div>

{/* FILTERS */}

<Card style={{padding:'14px 18px'}}>

<div className={s.filters}>

<div className={s.searchWrap}>
<Search size={14} className={s.si}/>
<input
className={s.search}
placeholder="Search by name, code or request ID..."
value={search}
onChange={e=>setSearch(e.target.value)}
/>
</div>

<select className={s.sel}
value={statusF}
onChange={e=>setStatusF(e.target.value)}
>
<option value="">All Statuses</option>

{ALL_STATUSES.map(st=>(
<option key={st} value={st}>
{st.replace(/([A-Z])/g,' $1').trim()}
</option>
))}
</select>

<select className={s.sel}
value={riskF}
onChange={e=>setRiskF(e.target.value)}
>
<option value="">All Risk Levels</option>

{['Low','Medium','High','Critical'].map(r=>(
<option key={r} value={r}>{r}</option>
))}
</select>

</div>

</Card>

{/* CARDS */}

<div className={s.cards}>

{filtered.map(r=>{

const daysLeft = Math.max(
0,
Math.ceil(
(new Date(r.proposedLastWorkingDate)-new Date())/86400000
)
)

return(

<Card key={r.id} className={s.rc}>

<div className={s.rtop}>

<div className={s.rAvatar}>
{r.employeeName?.charAt(0) || 'E'}
</div>

<div>
<div className={s.rname}>{r.employeeName}</div>
<div className={s.rcode}>{r.employeeCode}</div>
</div>

</div>

<div className={s.rbadges}>
<StatusBadge status={r.status}/>
<RiskBadge risk={r.riskLevel}/>
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
<strong className={s.rfactVal}>{daysLeft}d</strong>
</div>

<div className={s.rfact}>
<span className={s.rfactLabel}>Request</span>
<strong className={s.rfactVal}>#{r.id}</strong>
</div>

</div>

<div className={s.rreason}>
{r.resignationReason || '—'}
</div>

<div className={s.racts}>

<button
className={`${s.ractIcon} ${s.ractView}`}
onClick={()=>openDetail(r)}
>
<Eye size={14}/> View
</button>

{r.status==='PendingHrReview' && (

<>

<button
className={`${s.ractIcon} ${s.ractApprove}`}
onClick={()=>{

setSel(r)
setVM('approve')
setDec({isApproved:true,remarks:''})
setRemarksErr('')

}}
>
<CheckCircle size={14}/> Approve
</button>

<button
className={`${s.ractIcon} ${s.ractReject}`}
onClick={()=>{

setSel(r)
setVM('approve')
setDec({isApproved:false,remarks:''})
setRemarksErr('')

}}
>
<XCircle size={14}/> Reject
</button>

</>

)}

</div>

</Card>

)

})}

</div>

{/* VIEW MODAL */}

{selected && viewMode==='view' && (

<Modal
title={`Exit Details — ${selected.employeeName}`}
onClose={()=>setSel(null)}
size="lg"
>

<div className={s.detail}>

<div className={s.dGrid}>

<div className={s.dCell}>
<span>Employee</span>
<strong>{selected.employeeName}</strong>
</div>

<div className={s.dCell}>
<span>Code</span>
<strong>{selected.employeeCode}</strong>
</div>

<div className={s.dCell}>
<span>Status</span>
<StatusBadge status={selected.status}/>
</div>

<div className={s.dCell}>
<span>Risk</span>
<RiskBadge risk={selected.riskLevel}/>
</div>

<div className={s.dCell}>
<span>Reason</span>
<strong>{selected.resignationReason || '—'}</strong>
</div>

<div className={s.dCell}>
<span>Last Day</span>
<strong>
{new Date(selected.proposedLastWorkingDate)
.toLocaleDateString('en-GB',{
day:'2-digit',
month:'long',
year:'numeric'
})}
</strong>
</div>

</div>

<div>

<div className={s.subHdr}>
<div className={s.subHdrIcon}>
<Clock size={13}/>
</div>
Approval Flow
</div>

<div className={s.timelineWrap}>
<StepTimeline status={selected.status}/>
</div>

</div>

<div>

<div className={s.subHdr}>
<div className={s.subHdrIcon}>
<User size={13}/>
</div>
Approval History
</div>

{histLoading ? (

<div className={s.histMsg}>Loading history...</div>

) : history.length === 0 ? (

<div className={s.histMsg}>No history recorded yet.</div>

) : (

<div className={s.hist}>

{history.map((h,i)=>(

<div key={i} className={s.hItem}>

<div
className={`${s.hDot} ${
h.action?.toLowerCase().includes('reject')
? s.hDotRed
: s.hDotGreen
}`}
/>

<div className={s.hBody}>

<div className={s.hTop}>
<strong className={s.hActor}>
{h.performedBy || h.role}
</strong>

<span className={s.hAction}>
{h.action}
</span>

<span className={s.hTime}>
{h.performedAt
? new Date(h.performedAt).toLocaleDateString(
'en-GB',
{day:'2-digit',month:'short',year:'numeric'}
)
: ''}
</span>
</div>

{h.remarks && (
<div className={s.hRemarks}>
"{h.remarks}"
</div>
)}

</div>

</div>

))}

</div>

)}

</div>

<div className={s.modalActions}>

<Button
variant="ghost"
onClick={()=>setSel(null)}
>
Close
</Button>

{selected.status === 'PendingHrReview' && (

<Button
variant="success"
onClick={()=>{

setVM('approve')
setDec({isApproved:true,remarks:''})

}}
>
Approve This Request
</Button>

)}

</div>

</div>

</Modal>

)}

{/* APPROVE / REJECT MODAL */}

{selected && viewMode==='approve' && (

<Modal
title={`${dec.isApproved?'Approve':'Reject'} — ${selected.employeeName}`}
onClose={()=>setSel(null)}
size="lg"
>

<div className={s.conf}>

<div className={dec.isApproved ? s.intentApprove : s.intentReject}>

<div className={s.intentIcon}>
{dec.isApproved
? <CheckCircle size={18}/>
: <XCircle size={18}/>
}
</div>

<div className={s.intentBody}>

<strong>
{dec.isApproved
? 'Approving this request'
: 'Rejecting this request'}
</strong>

<p>
{dec.isApproved
? 'This will move the request to the next approval stage.'
: 'This will reject the request and notify the employee.'}
</p>

</div>

</div>

<div className={s.cInfo}>

<div className={s.dCell}>
<span>Employee</span>
<strong>
{selected.employeeName} ({selected.employeeCode})
</strong>
</div>

<div className={s.dCell}>
<span>Last Day</span>
<strong>
{new Date(selected.proposedLastWorkingDate).toLocaleDateString('en-GB')}
</strong>
</div>

<div className={s.dCell}>
<span>Stage</span>
<StatusBadge status={selected.status}/>
</div>

<div className={s.dCell}>
<span>Risk</span>
<RiskBadge risk={selected.riskLevel}/>
</div>

</div>

<div className={s.fld}>

<label>
Remarks
{!dec.isApproved
? <span className={s.req}>*</span>
: <span className={s.opt}> (Optional)</span>}
</label>

<textarea
className={s.ftextarea}
placeholder={
dec.isApproved
? 'Add any optional remarks...'
: 'Reason for rejection (required)'
}
value={dec.remarks}
onChange={e=>setDec(p=>({...p,remarks:e.target.value}))}
/>

<span className={s.charCount}>
{dec.remarks.length}/1000
</span>

{remarksErr && (
<span className={s.fieldErr}>{remarksErr}</span>
)}

</div>

<div className={s.ca}>

<Button
variant="ghost"
onClick={()=>setSel(null)}
>
Cancel
</Button>

<Button
variant={dec.isApproved?'success':'danger'}
loading={saving}
onClick={submitDecision}
>
{dec.isApproved
? <CheckCircle size={14}/>
: <XCircle size={14}/>
}

{dec.isApproved
? 'Confirm Approval'
: 'Confirm Rejection'}

</Button>

</div>

</div>

</Modal>

)}

</div>

)

}