#!/usr/bin/env bash
set -e

echo "Fix import relativi..."

# app/(auth)/login/page.tsx
if [ -f "app/(auth)/login/page.tsx" ]; then
  sed -i 's|@/components/auth/login-form|../../../components/auth/login-form|g' "app/(auth)/login/page.tsx"
fi

# app/(protected)/ingresso/page.tsx
if [ -f "app/(protected)/ingresso/page.tsx" ]; then
  sed -i 's|@/components/layout/topbar|../../../components/layout/topbar|g' "app/(protected)/ingresso/page.tsx"
  sed -i 's|@/components/ingresso/ingresso-form|../../../components/ingresso/ingresso-form|g' "app/(protected)/ingresso/page.tsx"
fi

# app/(protected)/ricerca/page.tsx
if [ -f "app/(protected)/ricerca/page.tsx" ]; then
  sed -i 's|@/components/layout/topbar|../../../components/layout/topbar|g' "app/(protected)/ricerca/page.tsx"
  sed -i 's|@/components/ricerca/ricerca-veicolo|../../../components/ricerca/ricerca-veicolo|g' "app/(protected)/ricerca/page.tsx"
fi

# app/(protected)/home/page.tsx
if [ -f "app/(protected)/home/page.tsx" ]; then
  sed -i 's|@/components/layout/topbar|../../../components/layout/topbar|g' "app/(protected)/home/page.tsx"
fi

# app/(protected)/dashboard/page.tsx
if [ -f "app/(protected)/dashboard/page.tsx" ]; then
  sed -i 's|@/components/layout/topbar|../../../components/layout/topbar|g' "app/(protected)/dashboard/page.tsx"
fi

# components/auth/login-form.tsx
if [ -f "components/auth/login-form.tsx" ]; then
  sed -i 's|@/components/layout/brand-logo|../layout/brand-logo|g' "components/auth/login-form.tsx"
fi

echo "Pulizia cache Next..."
rm -rf .next

echo "Controllo eventuali alias rimasti..."
grep -R "\"@/" -n app components || true
grep -R "'@/" -n app components || true

echo "Fatto."
echo "Ora avvia:"
echo "npm run dev -- --hostname 0.0.0.0"
