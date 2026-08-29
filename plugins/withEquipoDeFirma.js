const { withXcodeProject } = require('expo/config-plugins');

/**
 * Deja fijado el equipo de firma en el proyecto de Xcode.
 *
 * `expo prebuild` regenera ios/ desde cero, asi que sin esto hay que volver a
 * elegir el equipo a mano cada vez que se regenera el proyecto nativo.
 *
 * Por defecto usa el Apple ID personal (team "Juan Abreu"), que es gratis: firma
 * para el telefono propio y el build vence a los 7 dias. Para TestFlight se
 * exporta APPLE_TEAM_ID con el equipo pago y ese gana.
 */
module.exports = function withEquipoDeFirma(config, { teamId } = {}) {
  return withXcodeProject(config, (cfg) => {
    // El entorno gana sobre la config: así se firma con el equipo pago para
    // TestFlight sin tocar el código, y sin él sigue el Apple ID personal.
    const equipo = process.env.APPLE_TEAM_ID ?? teamId;
    if (!equipo) return cfg;

    const proyecto = cfg.modResults;
    const configuraciones = proyecto.pbxXCBuildConfigurationSection();

    for (const clave of Object.keys(configuraciones)) {
      const entrada = configuraciones[clave];
      if (!entrada || typeof entrada !== 'object' || !entrada.buildSettings) continue;
      if (!entrada.buildSettings.PRODUCT_BUNDLE_IDENTIFIER) continue;

      entrada.buildSettings.DEVELOPMENT_TEAM = `"${equipo}"`;
      entrada.buildSettings.CODE_SIGN_STYLE = 'Automatic';
    }

    // El target tambien lleva el equipo, para que Xcode no lo muestre vacio.
    const targets = proyecto.pbxNativeTargetSection();
    for (const clave of Object.keys(targets)) {
      const target = targets[clave];
      if (!target || typeof target !== 'object' || !target.uuid) continue;
      proyecto.addTargetAttribute('DevelopmentTeam', equipo, target);
    }

    return cfg;
  });
};
