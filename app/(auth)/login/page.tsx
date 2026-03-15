import { LoginForm } from "../../../components/auth/login-form"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <LoginForm />
      </div>
    </main>
  )
}
