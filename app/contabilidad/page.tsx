import { genPageMetadata } from 'app/seo'
import PnlDashboard from '@/components/contabilidad/PnlDashboard'

export const metadata = genPageMetadata({ title: 'Contabilidad' })

export default function ContabilidadPage() {
  return (
    <div className="py-6">
      <PnlDashboard />
    </div>
  )
}
