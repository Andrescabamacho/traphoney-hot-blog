import siteMetadata from '@/data/siteMetadata'

export default function Footer() {
  return (
    <footer>
      <div className="mt-12 mb-8 flex flex-col items-center border-t border-gray-200 pt-6">
        <div className="text-sm text-gray-400">
          {siteMetadata.headerTitle} · Contabilidad · © {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  )
}
