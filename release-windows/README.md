# Shosso Windows x64 — portable

## Descarga

Esta carpeta contiene el .zip de Shosso para Windows x64 partido en 2 partes
(GitHub limita archivos individuales a 100 MB).

Descarga las dos partes:

- [`Shosso-Windows-x64.zip.part-aa`](./Shosso-Windows-x64.zip.part-aa) (55 MB)
- [`Shosso-Windows-x64.zip.part-ab`](./Shosso-Windows-x64.zip.part-ab) (51 MB)

## Reensamblar en Windows

Abre PowerShell o Command Prompt en la carpeta donde están las dos partes:

```powershell
copy /b Shosso-Windows-x64.zip.part-aa + Shosso-Windows-x64.zip.part-ab Shosso-Windows-x64.zip
```

Resultado: `Shosso-Windows-x64.zip` (106 MB).

## Ejecutar

1. Click derecho en el .zip → **Extraer todo…**
2. Entra a la carpeta `Shosso-Windows-x64/`
3. Doble-click en **`Shosso.exe`**

No requiere instalación. Es 100% portable — la carpeta puedes moverla donde quieras.

### Si Windows Defender lo bloquea

Es porque el .exe no está firmado (firmar requiere certificado de pago).
Pulsa **"Más información"** → **"Ejecutar de todos modos"**.

## Verificación de integridad

```powershell
# SHA256 esperado del archivo reensamblado
certutil -hashfile Shosso-Windows-x64.zip SHA256
```

Compara con el valor más abajo (se imprime al final del README cuando se publica
el release).

**SHA256 (zip reensamblado):** `87f9cb6ab0965cb5c1925423e70d6a4eeac0c7a0290a515b6d6dbda08ecada36`
