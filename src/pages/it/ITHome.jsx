import React from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/common/Card.jsx'
import { Shield, ArrowRight, Monitor, Key, Wifi } from 'lucide-react'
import styles from './ITHome.module.css'

export default function ITHome() {
  return (
    <div className={styles.pg}>

      {/* Header */}
      <div className={styles.hdr}>
        <div className={styles.hdrGrid}></div>
        <div className={styles.hdrOrb}></div>

        <div className={styles.hdrContent}>
          <div className={styles.hdrText}>
            <h2>IT Department Portal</h2>
            <p>Manage hardware and system access clearances for exiting employees</p>
          </div>
        </div>
      </div>


      {/* CTA */}
      <Link to="/it/clearance" className={styles.ctaCard}>
        <div className={styles.ctaIcon}>
          <Shield size={26} color="#0369A1"/>
        </div>

        <div className={styles.ctaBody}>
          <div className={styles.ctaTitle}>Process IT Clearance</div>
          <div className={styles.ctaDesc}>
            Update clearance status for exit requests assigned to IT
          </div>
        </div>

        <ArrowRight size={18} className={styles.ctaArrow}/>
      </Link>


      {/* Checklist */}
      <Card>

        <h3 className={styles.checklistTitle}>
          IT Clearance Checklist
        </h3>

        <div className={styles.checklist}>

          {[
            {
              icon: <Monitor size={18}/>,
              label: 'Laptop / Desktop Return',
              desc: 'Collect all company hardware',
              bg: 'rgba(3,105,161,0.08)',
              c: '#0369A1',
            },
            {
              icon: <Key size={18}/>,
              label: 'Access Revocation',
              desc: 'Remove system and application access',
              bg: 'rgba(39,35,92,0.08)',
              c: '#27235C',
            },
            {
              icon: <Wifi size={18}/>,
              label: 'Network Access',
              desc: 'Disable VPN and network accounts',
              bg: 'rgba(157,36,125,0.08)',
              c: '#9D247D',
            }
          ].map((item,i)=>(
            <div key={i} className={styles.checkItem}>

              <div
                className={styles.checkIcon}
                style={{background:item.bg,color:item.c}}
              >
                {item.icon}
              </div>

              <div>
                <div className={styles.checkLabel}>
                  {item.label}
                </div>

                <div className={styles.checkDesc}>
                  {item.desc}
                </div>
              </div>

            </div>
          ))}

        </div>

      </Card>

    </div>
  )
}