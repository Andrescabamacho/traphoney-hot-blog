import { genPageMetadata } from 'app/seo'
import TesoreriaDashboard from '@/components/contabilidad/TesoreriaDashboard'

export const metadata = genPageMetadata({ title: 'Tesorería' })

export default function TesoreriaPage() {
  return (
    <div className="py-6">
      <TesoreriaDashboard />
    </div>
  )
}
