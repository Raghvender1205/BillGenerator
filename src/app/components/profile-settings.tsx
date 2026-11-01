'use client'
import { useState } from 'react'
import SavedLandlords from './saved-landlords'
import SavedTenants from './saved-tenants'
import { useChargeRates } from '../lib/use-charge-rates'
import ChargePreferencesForm from './charge-preferences-form'

export default function ProfileSettings({ userId }: { userId: string }) {
  const [tenant, setTenant] = useState({ name: '', contact: '', address: '' })
  const [landlord, setLandlord] = useState({ name: '', phone: '' })
  const { rates, loading, error, refresh, savePreferences } =
    useChargeRates(userId)
  return (
    <div className="settings-grid">
      <section className="settings-card" aria-labelledby="landlords-title">
        <h2 id="landlords-title">Saved landlords</h2>
        <p>Add a landlord here, then choose them when creating a bill.</p>
        <SavedLandlords
          userId={userId}
          landlord={landlord}
          onSelect={setLandlord}
          rememberSelection={false}
        />
        <label>
          Landlord name
          <input
            maxLength={100}
            value={landlord.name}
            onChange={(event) =>
              setLandlord({ ...landlord, name: event.target.value })
            }
            placeholder="e.g. Alex Morgan"
          />
        </label>
        <label>
          Landlord phone
          <input
            type="tel"
            maxLength={40}
            value={landlord.phone}
            onChange={(event) =>
              setLandlord({ ...landlord, phone: event.target.value })
            }
            placeholder="e.g. +91 98765 43210"
          />
        </label>
      </section>
      <section className="settings-card" aria-labelledby="tenants-title">
        <h2 id="tenants-title">Saved tenants</h2>
        <p>Save tenant details and their rental address for future bills.</p>
        <SavedTenants
          userId={userId}
          tenant={tenant}
          onSelect={setTenant}
          manager
        />
        <label>
          Tenant name
          <input
            maxLength={100}
            value={tenant.name}
            onChange={(event) =>
              setTenant({ ...tenant, name: event.target.value })
            }
            placeholder="e.g. Jamie Parker"
          />
        </label>
        <label>
          Tenant phone or email
          <input
            maxLength={150}
            value={tenant.contact}
            onChange={(event) =>
              setTenant({ ...tenant, contact: event.target.value })
            }
            placeholder="How to reach your tenant"
          />
        </label>
        <label>
          Rental property address
          <input
            maxLength={300}
            value={tenant.address}
            onChange={(event) =>
              setTenant({ ...tenant, address: event.target.value })
            }
            placeholder="Flat / house number, street, city, postal code"
          />
        </label>
      </section>
      <section className="settings-card" aria-labelledby="rates-title">
        <h2 id="rates-title">Your bill charges</h2>
        <p>
          Choose what you use. Only selected charges appear in the builder.
          Default changes apply to new charges; existing bills keep their
          amounts and rates.
        </p>
        {loading ? (
          <p role="status">Loading your charges…</p>
        ) : error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : (
          <ChargePreferencesForm initialRates={rates} save={savePreferences} />
        )}
        <button
          type="button"
          className="text-button"
          disabled={loading}
          onClick={refresh}
        >
          Reload saved charges
        </button>
      </section>
    </div>
  )
}
