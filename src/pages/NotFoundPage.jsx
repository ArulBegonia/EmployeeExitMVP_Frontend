import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',gap:16 }}>
      <div style={{ fontSize:72,fontWeight:800,color:'#27235C' }}>404</div>
      <div style={{ fontSize:18,color:'#64748b' }}>Page not found</div>
      <button onClick={() => navigate(-1)} style={{ padding:'10px 24px',background:'#27235C',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600 }}>
        Go Back
      </button>
    </div>
  )
}
