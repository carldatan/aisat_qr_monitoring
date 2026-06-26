import type { EquipmentStatus } from '@/types'

export const RETURN_QR_PREFIX = 'AISAT_RETURN|'

export const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  'Available',
  'Borrowed',
  'Maintenance',
  'Lost',
]

export interface ReturnItem {
  baseName: string
  totalBorrowed: number
  returnQty: number
  lenderUsername: string
  category: string
  location: string
  returnLocation: string
}

export interface ReturnSession {
  borrowerKey: string
  fullName: string
  idNumber: string
  items: ReturnItem[]
}

export interface InventoryGroup {
  name: string
  category: string
  location: string
  status: EquipmentStatus
  borrower: string
  lender: string
  count: number
}
