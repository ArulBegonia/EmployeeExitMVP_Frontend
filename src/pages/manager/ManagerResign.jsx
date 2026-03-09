import React from 'react'
import ResignationForm from '../employee/ResignationForm.jsx'
import { Info } from 'lucide-react'
import s from './ManagerResign.module.css'

export default function ManagerResign() {
  return (
    <div className={s.pg}>
      <ResignationForm />
    </div>
  )
}
