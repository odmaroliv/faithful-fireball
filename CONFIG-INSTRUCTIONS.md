# Configuración del Sitio

Este sitio utiliza un archivo de configuración centralizado para gestionar la información que puede variar entre diferentes dominios o instalaciones. A continuación se explica cómo modificar esta configuración.

## Archivo de Configuración

El archivo de configuración principal está ubicado en: `src/config/site.ts`

Este archivo contiene:

- Información básica del sitio (nombre, dominio, título, descripción)
- Información de la empresa
- Información de contacto (teléfono, correo, WhatsApp)
- Enlaces a redes sociales
- Destinos servidos
- Palabras clave para SEO

## Cómo Modificar la Configuración

Para adaptar el sitio a un dominio o configuración diferente:

1. Abra el archivo `src/config/site.ts` en un editor de texto
2. Modifique los valores que necesite cambiar (nombres, teléfonos, correos, etc.)
3. Guarde el archivo
4. Reconstruya el sitio ejecutando `npm run build`

Ejemplo de modificación:

```typescript
// Cambiar el dominio
domain: "otrodominio.com",

// Cambiar información de contacto
contact: {
  phone: "+1-999-888-7777",
  email: "info@otrodominio.com",
  // ...
}
```

## Crear una Configuración Alternativa

Si necesita mantener múltiples configuraciones para diferentes dominios, puede:

1. Duplicar el archivo `site.ts` y nombrarlo según el dominio (`site-dominio1.ts`, `site-dominio2.ts`)
2. Modificar los valores en cada archivo
3. Antes de compilar para un dominio específico, copie el archivo de configuración apropiado a `site.ts`

## Componentes que Usan la Configuración

Los siguientes componentes usan valores del archivo de configuración:

- Layout.astro (meta tags, SEO)
- Contact.astro (información de contacto, redes sociales)
- Footer.astro (redes sociales, copyright, keywords)
- Services.astro (destinos servidos)

## Ventajas

- Cambiar información en todo el sitio desde un solo archivo
- Facilita la creación de versiones para diferentes dominios
- Mantiene la coherencia en todo el sitio