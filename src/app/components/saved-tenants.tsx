'use client'

import SavedPeople from './saved-people'
import { validTenant, type TenantDetails } from '../lib/tenants'
import {
  tenantCacheLifetime,
  readTenantCache,
  writeTenantCache,
} from '../lib/tenant-cache'

export default function SavedTenants({
  userId,
  tenant,
  onSelect,
  manager = false,
}: {
  userId: string
  tenant: TenantDetails
  onSelect: (tenant: TenantDetails) => void
  manager?: boolean
}) {
  return (
    <SavedPeople
      userId={userId}
      kind="tenant"
      details={tenant}
      onSelect={({ name, contact, address }) =>
        onSelect({ name, contact, address })
      }
      manager={manager}
      valid={validTenant}
      readCache={readTenantCache}
      writeCache={writeTenantCache}
      lifetime={tenantCacheLifetime}
      describe={({ address, contact }) =>
        address || contact || 'No contact saved'
      }
    />
  )
}
