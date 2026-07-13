# HANDOFF — Recreación de vídeo TikTok con la cara de Andres

## Objetivo
Recrear cada escena de un vídeo de TikTok (davidrothstein, countdown "22 days left")
reemplazando SOLO a la persona por Andres. Requisitos de Andres:
- SIN nada en la cabeza (sin kipá, sin gorro), SIN patillas/payot.
- Camiseta negra lisa.
- Máxima fidelidad al frame original: misma composición, ángulo, pose, luz, fondo.

## Prompt aprobado por el usuario (adaptado)
"Replace only the person in the attached reference image with [ANDRES].
Keep everything else 100% identical: same composition, same camera angle, same pose
and body position, same lighting and shadows, same background. Match the new person
to the original lighting and perspective. The new person has short neat dark hair
with no hat, no head covering of any kind and no sidelocks, and wears a plain black
cotton t-shirt. Photorealistic, natural skin texture."

## Frames de referencia (en esta carpeta, extraídos con ffmpeg scene-detect)
| Archivo | Escena |
|---|---|
| f001.jpg / back-view.jpg | De espaldas, nuca, fondo blanco quemado |
| f003.jpg | Tumbado sobre bloque gigante de billetes de $100 |
| f004.jpg | Recostado en diván vintage crema comiendo uvas |
| f006.jpg | Apoyado en Mercedes-Maybach GLS bicolor, estudio blanco |
| f007.jpg / profile-view.jpg | Retrato de perfil a contraluz |
| (título) | Tarjeta "1st August." serif rojo sobre negro (sin persona) |

URLs raw públicas: https://raw.githubusercontent.com/Andrescabamacho/traphoney-hot-blog/eaa1f91ddb75eaf4bef1cd126c25717033bfccdc/.magnific-refs/<archivo>

## Estado del trabajo (Magnific, modelo imagen-nano-banana-2-flash, 2K, 9:16)
Personaje de Magnific: "andres" (library id 1654443).

HECHAS con método bueno (frame adjunto + prompt de reemplazo):
- Diván/uvas:    https://www.magnific.com/app/creation/MXYFchgDCm
- Billetes:      https://www.magnific.com/app/creation/62OdPOJiJO
- Maybach:       https://www.magnific.com/app/creation/brE4HOy5Y2

PENDIENTES (2):
- De espaldas: frame YA subido a Magnific como creation "J9l0JNBOq4" → solo falta images_generate con references [{image, J9l0JNBOq4}, {character, 1654443}].
- Perfil: subir profile-view.jpg (creations_upload_image con la URL raw) y generar igual.
- Nota: el MCP de Magnific devuelve 403 si haces llamadas seguidas — espaciar ~25-60 s entre llamadas.

## Plan OpenAI (nuevo, motivo de la sesión nueva)
El usuario quiere probar GPT Image (el modelo de ChatGPT) por API porque es más barato.
- Requiere: red del entorno con api.openai.com permitido + variable OPENAI_API_KEY (el usuario la configuró en el entorno) + 1-2 fotos reales de Andres (pedírselas; GPT Image no conoce su personaje de Magnific).
- Flujo: POST /v1/images/edits con el frame + foto(s) de Andres y el prompt de arriba, size 1024x1536, quality high.
- Verificar primero conectividad: curl -sS https://api.openai.com/v1/models con la clave.

## Limitaciones de red de la sesión anterior (motivo de este handoff)
La política de red bloqueaba api.openai.com, ak-data.magnific.com (subidas) y
pikaso.cdnpk.net (CDN de descarga → no se podían adjuntar los resultados al chat).
El usuario la cambió a Custom con esos dominios permitidos. Si la nueva sesión ya
los alcanza, además de generar se pueden descargar los PNG y enviarlos al chat.

## Limpieza pendiente
Al terminar todo: borrar la carpeta .magnific-refs del repo (commit de limpieza).
