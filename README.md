# Parqueadero PWA - Frontend

Frontend de la PWA para la gestión del parqueadero. Ha sido construida utilizando React, Ionic Framework y Tailwind CSS.

## Requisitos Previos

Asegúrate de tener instalado en tu sistema:
- [Node.js](https://nodejs.org/) (versión 16 o superior recomendada)
- `npm` 

## Instalación y Ejecución Local

Para correr este proyecto en tu entorno local, sigue estos sencillos pasos:

1. **Instalar las dependencias:**
   Dentro de la carpeta del proyecto, ejecuta el siguiente comando para descargar todos los paquetes necesarios de Node:
   ```bash
   npm install
   ```
   *(Este proceso puede tardar un par de minutos dependiendo de tu conexión a internet).*

2. **Levantar el servidor de desarrollo:**
   Una vez instaladas las dependencias, inicia la aplicación en tu navegador ejecutando:
   ```bash
   npm run dev
   ```
   *Si se presenta algún problema de caché con Vite al correr el proyecto, puedes forzar la recarga con:*
   ```bash
   npm run dev -- --force
   ```

   *Para ejecución de tests:*
   ```bash
   npm run test.unit -- --run --reporter=verbose
   ```

   *Para coverage:*
   ```bash
   npm run test.unit -- --run --coverage
   ```  

**Nota:**

Genera el resumen en consola y además el reporte HTML.  
El HTML queda en coverage/index.html, ábrelo en el navegador para navegar el reporte interactivo.


Revisar *comandos-test.md*
