# Caudal

App de finanzas personales en React Native/Expo, iOS primero. La plata del usuario
entra por PDFs del banco y tiene que cuadrar con lo que dice el banco.

**Antes de escribir código, leé la skill `convenciones`** (`.claude/skills/convenciones/`):
tiene el modelo de datos, las reglas de marca y las trampas que ya nos costaron una
corrida. Acá está solo lo que no se puede ignorar.

## Ramas

`staging` es la rama por defecto. **Nunca commitees en `staging` ni en `main`**: rama
de feature desde `staging` al día → PR a `staging`. Promover a producción es un PR de
`staging` a `main`.

Cada merge dispara un build de TestFlight. `staging` va al grupo interno, donde lo ve
primero Juan y nadie más; lo que le convence pasa a `main`, que va al grupo externo
«Testers» y sale por el link público.

## Antes de pushear

```sh
npm run lint && npm run typecheck && npm test
```

Los tres corren en CI y en el workflow de TestFlight. Un build de iOS no baja de 16
minutos de runner: que falle ahí por un tipo mal puesto es tiempo tirado.

## Cómo se escribe acá

- **Código, comentarios, commits y PRs en español**, con voseo. Sin emojis.
- Los comentarios dicen **por qué**, no qué. Si el código ya lo dice, sobra el comentario.
- Los nombres son en español y describen el dominio: `planificar`, `descuadre`,
  `entreCuentasPropias`, `saldoDeApertura`.
- Los mensajes de commit son una línea en imperativo y después el porqué en prosa,
  como los que ya están (`git log`). **Sin trailers de co-autoría de IA.**

## Cosas que rompen si no se saben

- **No hay rojo para gastos.** Un gasto va en Espuma con signo menos real (−). El
  coral es para errores. Todo lo visual sale de `src/theme` y del manual de marca.
- **`new Date('2026-08-01')` da 31 de julio** en Montevideo y vacía el mes. Para fechas
  ISO va `parseFechaISO` de `src/lib/format.ts`, siempre.
- **`revision@caudal.app` es la cuenta con la que Apple revisa la app.** Si te piden
  vaciar la base para probar de cero, esa no se toca: sin movimientos, el revisor abre
  una app en blanco.
- **Los PDFs de banco no entran al repo**: son extractos reales. Los tests usan líneas
  escritas a mano.
- **El simulador necesita `PARA_SIMULADOR=1 npx expo prebuild -p ios --no-clean`.** Sin
  eso falla al linkear SwiftUICore. Para dispositivo y para CI va sin la variable.
- **Expo Go no se usa**: build nativo y TestFlight. No aclares en el código ni en la
  doc que algo «no anda en Expo Go».
