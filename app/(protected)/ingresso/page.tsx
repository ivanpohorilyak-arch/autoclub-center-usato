import { Topbar } from "../../../components/layout/topbar"
import { IngressoForm } from "../../../components/ingresso/ingresso-form"

export default function IngressoPage() {
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <Topbar />

      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-900">Ingresso Veicolo</h2>
        <p className="mt-1 text-sm text-slate-500">
          Registrazione ingresso vettura con scansione QR zona obbligatoria.
        </p>
      </div>

      <IngressoForm />
    </div>
  )
}
