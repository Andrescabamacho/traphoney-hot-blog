import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Empieza aquí',
  description: 'Tu guía paso a paso para arrancar en la Academia. Todo lo que necesitas en un solo sitio.',
})

// ─────────────────────────────────────────────────────────────
//  👇  REEMPLAZA ESTOS LINKS POR LOS TUYOS REALES
// ─────────────────────────────────────────────────────────────
const LINKS = {
  discord: 'https://discord.gg/hu8VjjYCS', // 👈 Link de invitación a tu Discord
  whop: 'https://whop.com/profit-lab-b584?a=cabamacho', // 👈 Link de tu Whop
  magnific: 'https://magnific.ai/', // 👈 Link directo a Magnific (plan PREMIUM+)
  formacion: 'https://discord.gg/hu8VjjYCS', // 👈 Link a la formación grabada (de momento apunta a Discord)
}
// ─────────────────────────────────────────────────────────────

type Step = {
  n: number
  emoji: string
  title: string
  body: React.ReactNode
  cta?: { label: string; href: string }
}

const steps: Step[] = [
  {
    n: 1,
    emoji: '💬',
    title: 'Únete al Discord',
    body: (
      <>
        Es el corazón de la comunidad. Ahí tendrás <strong>todo</strong>: avisos, soporte y
        tu <strong>ticket privado</strong> (un canal solo para ti que creamos nosotros).
        <br />
        👉 Haz clic, acepta la invitación y ¡listo!
      </>
    ),
    cta: { label: 'Entrar al Discord', href: LINKS.discord },
  },
  {
    n: 2,
    emoji: '🛒',
    title: 'Entra en tu Whop',
    body: (
      <>
        Whop es tu <strong>panel privado</strong>. Es muy fácil:
        <ul className="mt-3 ml-1 space-y-2">
          <li>1️⃣ Haz clic en el botón de abajo.</li>
          <li>2️⃣ Inicia sesión con el mismo correo del pago.</li>
          <li>3️⃣ Dentro verás los accesos y materiales. Solo tienes que ir tocando cada apartado. 😉</li>
        </ul>
      </>
    ),
    cta: { label: 'Abrir mi Whop', href: LINKS.whop },
  },
  {
    n: 3,
    emoji: '🤖',
    title: 'Activa Magnific (nuestro sistema vive aquí)',
    body: (
      <>
        Nuestro sistema funciona <strong>dentro de Magnific</strong>. Necesitas su suscripción
        de <strong>40&nbsp;€/mes</strong> con el plan <strong>PREMIUM+</strong>.
        <br />
        Con ese plan tendrás contenido <strong>prácticamente ilimitado</strong> para crear
        imágenes y vídeos con nuestro sistema. 🎨🎬
        <div className="mt-4 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-200">
          ⚠️ <strong>MUY IMPORTANTE:</strong> elige el pago <strong>MENSUAL</strong>, NO el
          anual. La inteligencia artificial avanza superrápido y no quieres quedarte atado a un
          plan viejo.
        </div>
        <p className="mt-3 text-sm opacity-80">
          ¿Aún no te has registrado? Usa el botón de abajo (te llevamos directo).
        </p>
      </>
    ),
    cta: { label: 'Ir a Magnific (PREMIUM+ mensual)', href: LINKS.magnific },
  },
  {
    n: 4,
    emoji: '🎓',
    title: 'Ve la formación grabada (tu PRIMER paso real)',
    body: (
      <>
        Antes de tocar nada, mira la formación. Aquí entiendes <strong>cómo funciona el juego</strong>:
        <ul className="mt-3 ml-1 space-y-2">
          <li>🧠 La <strong>psicología humana</strong> para crear contenido que se hace viral.</li>
          <li>💸 Cómo <strong>monetizar</strong> ese contenido (de nada sirve viralizar si no ganas dinero).</li>
          <li>🚀 <strong>Casos de uso prácticos</strong> para empezar a monetizar YA.</li>
        </ul>
        <p className="mt-3">
          Cuando termines la formación, lo vas a entender <strong>todo</strong>. 💪
        </p>
      </>
    ),
    cta: { label: 'Ver la formación', href: LINKS.formacion },
  },
  {
    n: 5,
    emoji: '🔑',
    title: 'Pide el SISTEMA por tu ticket privado',
    body: (
      <>
        Cuando ya hayas visto la formación, pídenos <strong>el sistema</strong> por tu
        <strong> ticket privado de Discord</strong>. Te enviamos ahí mismo el link para que
        empieces a usarlo. ✅
      </>
    ),
  },
  {
    n: 6,
    emoji: '🔥',
    title: 'Empieza a crear contenido',
    body: (
      <>
        Ya tienes todo. Abre <strong>Magnific</strong> y a crear:
        <ul className="mt-3 ml-1 space-y-2">
          <li>✨ Usa nuestro <strong>sistema</strong> tal cual.</li>
          <li>🎨 O crea <strong>cosas nuevas</strong> tú mismo.</li>
        </ul>
        <p className="mt-3">
          Para eso está la formación: para que sepas usar <strong>cada herramienta</strong>.
          ¡A por ello! 🚀
        </p>
      </>
    ),
  },
]

export default function Empezar() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      {/* Hero */}
      <div className="py-10 text-center sm:py-14">
        <span className="inline-block rounded-full bg-primary-500/10 px-4 py-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400">
          ✅ Pago confirmado — ¡Bienvenido/a!
        </span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-100">
          Empieza aquí 👇
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-400">
          Sigue estos <strong>6 pasos en orden</strong>. Es facilísimo: solo tienes que ir
          tocando cada botón. En menos de 10 minutos lo tendrás todo listo. 🎯
        </p>
      </div>

      {/* Steps */}
      <ol className="space-y-6">
        {steps.map((step) => (
          <li
            key={step.n}
            className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-7 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xl font-bold text-white">
                {step.n}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-gray-100">
                  <span className="mr-2">{step.emoji}</span>
                  {step.title}
                </h2>
                <div className="mt-2 leading-relaxed text-gray-700 dark:text-gray-300">
                  {step.body}
                </div>
                {step.cta && (
                  <a
                    href={step.cta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-3 font-semibold text-white shadow transition hover:bg-primary-600"
                  >
                    {step.cta.label}
                    <span aria-hidden>→</span>
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {/* Resumen rápido */}
      <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8 dark:border-gray-700 dark:bg-gray-800/50">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          📌 Resumen para que no te pierdas
        </h3>
        <ol className="mt-4 space-y-2 text-gray-700 dark:text-gray-300">
          <li><strong>1.</strong> Discord → comunidad + tu ticket privado.</li>
          <li><strong>2.</strong> Whop → tu panel, inicia sesión y explora.</li>
          <li><strong>3.</strong> Magnific PREMIUM+ → 40&nbsp;€/mes (MENSUAL, nunca anual).</li>
          <li><strong>4.</strong> Mira la formación grabada (psicología + monetización).</li>
          <li><strong>5.</strong> Pide el sistema por tu ticket privado de Discord.</li>
          <li><strong>6.</strong> ¡A crear contenido y monetizar! 🔥</li>
        </ol>
        <p className="mt-5 text-center text-gray-600 dark:text-gray-400">
          ¿Dudas? Escríbenos por tu <strong>ticket privado de Discord</strong>. Estamos para
          ayudarte. 🤝
        </p>
      </div>
    </div>
  )
}
