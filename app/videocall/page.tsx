import { genPageMetadata } from 'app/seo'
import CallSimulator from '@/components/CallSimulator'

export const metadata = genPageMetadata({
  title: 'Videollamada',
  description:
    'Practica hablar a cámara con la interfaz de una videollamada para perder el miedo a hablar en público.',
})

export default function Page() {
  return <CallSimulator />
}
