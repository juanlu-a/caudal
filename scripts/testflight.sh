#!/bin/bash
#
# Archiva la app y la sube a App Store Connect.
#
# Xcode se encarga de la firma: con -allowProvisioningUpdates y la clave de la
# API crea el certificado de distribución en la nube y el perfil, sin depender
# de que haya una sesión de Apple ID abierta en la máquina.
#
# Entorno:
#   APPLE_TEAM_ID                          equipo con el que se firma
#   ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH  clave de App Store Connect
#   BUILD_NUMBER                           opcional; por defecto, fecha y hora
#
# Sin clave de API no sube: deja el .ipa para arrastrarlo al Organizer.
set -euo pipefail

cd "$(dirname "$0")/.."

: "${APPLE_TEAM_ID:?falta APPLE_TEAM_ID}"

WORKSPACE=$(ls -d ios/*.xcworkspace | head -1)
ESQUEMA=$(basename "$WORKSPACE" .xcworkspace)
PLIST="ios/$ESQUEMA/Info.plist"
ARCHIVO="build/$ESQUEMA.xcarchive"
SALIDA="build/ipa"

# La fecha y hora siempre sube y nunca se repite, que es todo lo que App Store
# Connect pide del número de build.
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d%H%M)}"

# Expo escribe CFBundleVersion como literal en el Info.plist, así que pasarle
# CURRENT_PROJECT_VERSION a xcodebuild no alcanza: hay que tocar el plist.
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$PLIST"
echo "==> $ESQUEMA build $BUILD_NUMBER"

FIRMA=()
if [ -n "${ASC_KEY_ID:-}" ] && [ -n "${ASC_ISSUER_ID:-}" ] && [ -n "${ASC_KEY_PATH:-}" ]; then
  FIRMA=(-allowProvisioningUpdates
         -authenticationKeyID "$ASC_KEY_ID"
         -authenticationKeyIssuerID "$ASC_ISSUER_ID"
         -authenticationKeyPath "$ASC_KEY_PATH")
else
  echo "    sin clave de API: se archiva y exporta, pero no se sube"
fi

echo "==> Archivando"
rm -rf "$ARCHIVO" "$SALIDA"
xcodebuild -workspace "$WORKSPACE" \
  -scheme "$ESQUEMA" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVO" \
  "${FIRMA[@]}" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  archive

# Con clave, exportar y subir es un solo paso: destination upload se lo manda a
# Apple sin pasar por altool.
DESTINO=upload
[ ${#FIRMA[@]} -eq 0 ] && DESTINO=export

OPCIONES="$SALIDA/ExportOptions.plist"
mkdir -p "$SALIDA"
cat > "$OPCIONES" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>$DESTINO</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>$APPLE_TEAM_ID</string>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict>
</plist>
PLIST

echo "==> Exportando y subiendo ($DESTINO)"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVO" \
  -exportPath "$SALIDA" \
  -exportOptionsPlist "$OPCIONES" \
  "${FIRMA[@]}"

echo "$BUILD_NUMBER" > "$SALIDA/build-number.txt"
echo "==> Listo. Build $BUILD_NUMBER"
