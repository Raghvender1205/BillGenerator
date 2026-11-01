'use client'
import type { ReactNode } from 'react'
import { GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { LineItem } from '../lib/invoice'

export default function SortableInvoiceRow({
  item,
  index,
  disabled,
  children,
}: {
  item: LineItem
  index: number
  disabled: boolean
  children: ReactNode
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: item.id,
    index,
    disabled,
    transition: null,
  })
  return (
    <div
      ref={ref}
      className={`line-row ${item.chargeId ? 'has-configured-charge' : ''} ${item.type === 'discount' ? 'is-discount' : ''} ${isDragging ? 'is-dragging' : ''}`}
      data-dragging={isDragging}
    >
      <button
        ref={handleRef}
        type="button"
        className="icon-button drag-handle"
        aria-label={`Reorder ${item.title || `item ${index + 1}`}`}
        title="Drag to reorder · Space to pick up, arrow keys to move, Space to drop"
        disabled={disabled}
      >
        <GripVertical size={17} aria-hidden="true" />
      </button>
      {children}
    </div>
  )
}
