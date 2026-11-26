# Inicio de sesión con Google y Supabase

El botón de acceso usa Supabase Auth con el proveedor Google. La aplicación no valida contraseñas de Google ni recibe el secreto OAuth: delega la autenticación a Google y Supabase.

## Qué es un cliente OAuth de Google Cloud

Un cliente OAuth es una credencial que identifica a una aplicación ante Google cuando solicita autorización. Para este proyecto, el tipo esperado es una aplicación web:

- **ID de cliente**: identifica la aplicación/proveedor en el flujo OAuth.
- **Secreto de cliente**: demuestra a Google que el intercambio de autorización lo realiza el proveedor configurado.
- **Orígenes JavaScript autorizados**: orígenes desde los que se inicia el flujo web.
- **URI de redirección autorizados**: URL a la que Google devuelve la respuesta OAuth.

No es una cuenta de usuario, no es la clave pública de Supabase y no crea por sí solo usuarios o roles en la aplicación. Google confirma la identidad; Supabase Auth crea o recupera el usuario y mantiene la sesión.

## Configuración

### 1. Crear las credenciales en Google Cloud

1. Selecciona o crea un proyecto de Google Cloud y configura la pantalla de consentimiento OAuth.
2. Crea un ID de cliente OAuth de tipo **Aplicación web**.
3. Añade el origen local de desarrollo `http://localhost:8080` a los orígenes JavaScript autorizados.
4. Añade como URI de redirección autorizado el callback que muestra el panel de Supabase Auth. Normalmente tiene esta forma:

   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

   Usa exactamente el callback de tu proyecto Supabase; no pongas allí el URL de la landing de la aplicación.
5. Guarda el ID y el secreto de cliente. No los agregues al repositorio ni al `.env` del frontend.

### 2. Activar Google en Supabase

1. En el proyecto Supabase correcto, abre la configuración de autenticación y los proveedores.
2. Habilita Google e introduce el ID y el secreto OAuth de Google Cloud.
3. En la configuración URL de Supabase Auth, configura el Site URL de la aplicación desplegada.
4. Añade las URLs permitidas de redirección de desarrollo y producción, incluida `http://localhost:8080` para este proyecto. El código usa `window.location.origin` como destino, así que permite ese origen exacto.
5. Guarda y prueba el flujo con una cuenta autorizada.

Para producción, registra también el dominio de la aplicación en Google Cloud y la URL de retorno correspondiente en Supabase. Mantén callback de Supabase y URL de retorno de la aplicación como destinos distintos del flujo.

## Qué hace el código

`src/components/rh/GoogleButton.tsx` llama a:

```ts
supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: window.location.origin },
});
```

Supabase inicia la redirección hacia Google. Al terminar, Supabase retorna al origen de la aplicación. El cliente Supabase persiste la sesión en el navegador; `src/routes/index.tsx` escucha `INITIAL_SESSION` y `SIGNED_IN`, carga perfil y roles y redirige según el tipo de usuario.

## Asignación de roles

Un inicio de sesión correcto no significa que la cuenta sea administrador. La migración `0004_perfil_google.sql` crea el perfil y consulta `lista_blanca` usando el correo normalizado:

- Si el correo está autorizado, asigna el rol guardado en la lista blanca.
- Si no está autorizado como personal, asigna `CLIENTE`.

Para administrar accesos, utiliza la sección Personal con una cuenta administradora ya habilitada. El cambio del rol controla navegación y acciones, mientras que RLS y las RPC deben validar de nuevo los permisos en PostgreSQL.

## Seguridad y resolución básica de problemas

- Mantén el secreto OAuth de Google en la configuración del proveedor de Supabase. Nunca uses un prefijo `VITE_` para secretos.
- En el navegador solo se usa la URL de Supabase y su clave publicable. Nunca expongas `service_role`.
- Si Google muestra `redirect_uri_mismatch`, compara el callback exacto mostrado por Supabase con el URI autorizado en Google Cloud.
- Si Supabase rechaza la URL de retorno, agrega el origen exacto en la lista de redirect URLs permitidas de Auth.
- Si el acceso funciona pero el usuario recibe un rol incorrecto, verifica el correo/perfil y `lista_blanca` en la base correcta. El OAuth autentica identidad; el trigger y los datos de la aplicación asignan roles.
