'use client'

import SavedPeople from './saved-people'
import { validLandlord, type LandlordDetails } from '../lib/landlords'
import {
  landlordCacheLifetime,
  readLandlordCache,
  writeLandlordCache,
} from '../lib/landlord-cache'

export default function SavedLandlords({
  userId,
  landlord,
  onSelect,
  rememberSelection = true,
}: {
  userId: string
  landlord: LandlordDetails
  onSelect: (landlord: LandlordDetails) => void
  rememberSelection?: boolean
}) {
  return (
    <SavedPeople
      userId={userId}
      kind="landlord"
      details={landlord}
      onSelect={({ name, phone }) => onSelect({ name, phone })}
      manager={!rememberSelection}
      valid={validLandlord}
      readCache={readLandlordCache}
      writeCache={writeLandlordCache}
      lifetime={landlordCacheLifetime}
      describe={({ phone }) => phone || 'No phone saved'}
    />
  )
}
