#!/usr/bin/env bash
# Despliega las edge functions de IA del admin a Supabase usando el CLI.
#
# Úsalo en lugar del chat de Lovable: Lovable tiende a reescribir las funciones
# con su propia versión; el CLI sube el archivo del repo TAL CUAL.
#
# Uso:
#   ./scripts/deploy-edge-functions.sh            # despliega ambas
#   ./scripts/deploy-edge-functions.sh admin-agent  # solo una
#
# Requisitos: estar logueado (npx supabase login) o exportar SUPABASE_ACCESS_TOKEN.

set -euo pipefail

PROJECT_REF="mphrhcuqzkbbnovmdbpc"

# Funciones a desplegar (puedes pasar nombres como argumentos para acotar).
FUNCTIONS=("admin-agent" "blog-ai-generate")
if [ "$#" -gt 0 ]; then
  FUNCTIONS=("$@")
fi

echo "→ Proyecto: $PROJECT_REF"
echo "→ Funciones: ${FUNCTIONS[*]}"
echo

for fn in "${FUNCTIONS[@]}"; do
  echo "▶ Desplegando $fn ..."
  npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
  echo "✓ $fn desplegada"
  echo
done

echo "✅ Listo. Recuerda tener configurados los secrets en Supabase:"
echo "   OPENAI_API_KEY (texto e imagen) y, opcional, LOVABLE_API_KEY / DEEPSEEK_API_KEY."
