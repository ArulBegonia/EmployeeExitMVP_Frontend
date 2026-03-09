import React from 'react'
import styles from './Button.module.css'

export default function Button({ children, variant = 'primary', size = 'md', loading, disabled, onClick, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <span className={styles.spinner} /> : children}
    </button>
  )
}
