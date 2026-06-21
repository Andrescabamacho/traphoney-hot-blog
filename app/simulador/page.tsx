import ConversationSimulator from '@/components/ConversationSimulator'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: 'Simulador de conversaciones' })

export default function SimuladorPage() {
  return (
    <>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="space-y-2 pt-6 pb-8 md:space-y-5">
          <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 dark:text-gray-100">
            Simulador de conversaciones
          </h1>
          <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
            Elige quién habla, escribe el mensaje y descarga la conversación con estilo de DM de
            Instagram.
          </p>
        </div>
        <div className="py-8">
          <ConversationSimulator />
        </div>
      </div>
    </>
  )
}
