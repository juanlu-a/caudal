#!/bin/bash
#
# Sube un build a TestFlight.
#
# Necesita, en el entorno:
#   APPLE_TEAM_ID   el equipo pago (10 caracteres, sale de developer.apple.com)
#   ASC_KEY_ID      Key ID de la App Store Connect API
#   ASC_ISSUER_ID   Issuer ID de esa misma API
# y la clave privada .p8 guardada en ~/.appstoreconnect/private_keys/
#
# La app tiene que existir en App Store Connect con el bundle id
# com.juanabreu.caudal antes del primer envío.
#
# Uso:  npm run testflight
set -euo pipefail

cd "$(dirname "$0")/.."

: "${APPLE_TEAM_ID:?falta APPLE_TEAM_ID}"
: "${ASC_KEY_ID:?falta ASC_KEY_ID}"
: "${ASC_ISSUER_ID:?falta ASC_ISSUER_ID}"

ARCHIVO="build/Caudal.xcarchive"
SALIDA="build/ipa"

echo "==> Regenerando el proyecto nativo"
npx expo prebuild -p ios --no-clean

echo "==> Archivando (esto tarda: se compila todo desde fuente)"
rm -rf "$ARCHIVO" "$SALIDA"
xcodebuild -workspace ios/Caudal.xcworkspace \
  -scheme Caudal \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVO" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  archive

echo "==> Exportando el .ipa"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVO" \
  -exportPath "$SALIDA" \
  -exportOptionsPlist scripts/ExportOptions.plist \
  -allowProvisioningUpdates

IPA=$(find "$SALIDA" -name "*.ipa" | head -1)
echo "==> Subiendo $IPA a App Store Connect"
xcrun altool --upload-app \
  --type ios \
  --file "$IPA" \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID"

echo
echo "Listo. En App Store Connect el build queda unos minutos «Procesando»"
echo "y después aparece en TestFlight."
