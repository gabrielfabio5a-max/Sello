# Sello — integridad verificable de noticias y videos

Un medio u operador de seguridad registra la huella digital (SHA-256) de una
noticia o video original en un contrato inteligente, y cualquiera puede
comprobar si el archivo fue adulterado sin depender de un servidor central.

> Prototipo para el hackathon Avalanche Fuji (Chain ID 43113).
> "Sello" es un nombre de trabajo.

**Demo publicada:** https://sello-tau.vercel.app/ — la verificación es pública;
para registrar una huella necesitas una wallet conectada a Fuji.

## Cómo funciona

1. La web calcula el SHA-256 del archivo **en el navegador** con Web Crypto
   (el archivo nunca se sube a un servidor).
2. El operador registra esa huella en el contrato `SelloRegistry` desplegado en
   Fuji, firmando con su wallet. El contrato guarda quién la registró, cuándo y
   un título descriptivo.
3. Cualquiera calcula el SHA-256 del archivo que recibió y lo consulta en el
   contrato:
   - Si coincide con una huella registrada, es el original.
   - Si no existe, el archivo no es el original o nunca fue registrado.

La garantía que aporta la blockchain: nadie puede alterar ni borrar un registro
ya escrito, y la verificación no depende de la base de datos de una empresa.

## Contrato en Avalanche Fuji

| Campo          | Valor                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Red            | Avalanche Fuji C-Chain (testnet)                                                                  |
| Chain ID       | `43113`                                                                                           |
| Contrato       | [`0x9C0eb8Ab3A42EEB122d774B6089AAEfcdA6BD4aB`](https://testnet.snowtrace.io/address/0x9C0eb8Ab3A42EEB122d774B6089AAEfcdA6BD4aB) |
| Despliegue     | [tx `0x120e…a6d5`](https://testnet.snowtrace.io/tx/0x120ee3ae666aa54b463658164dc09025029592492f75eb9bdd4592b8671aa6d5) |
| Huellas registradas | 2 (al 25-11-2026)                                                                             |

### Registros de ejemplo

Todos firmados por la cuenta de pruebas `0x5F029883a86931816D8328a14DeBf1CC1FB8549c`.

| Huella (SHA-256)                                             | Título                                       | Transacción |
| ------------------------------------------------------------ | -------------------------------------------- | ----------- |
| `0x6b08a43da5e5c27b63f1e2943c7dc5016b070fd358eb55f02e3deaa0e8295ec8` | Comisión aprueba corredor logístico (demo)   | [tx](https://testnet.snowtrace.io/tx/0x2bf8bc7253b7e9ce679eb89bea3e41a34098715691fcf2be5f4c0727f3a000b2) |
| `0xe6c6d6a5178a221c74a1ed5e4dcfa4c6a7d96e858dc8083690d6587dcf3618fa` | CV Gabriel Fabio                             | [tx](https://testnet.snowtrace.io/tx/0x9d87fb240d5e04624cab14cc07a8235ea60cc96ed42c8b51e3cda6bce7050378) |

La primera huella corresponde a [`demo/noticia-original.txt`](demo/noticia-original.txt).
[`demo/noticia-adulterada.txt`](demo/noticia-adulterada.txt) es una versión
alterada a propósito: su hash no coincide y el contrato responde "no
registrada", que es lo que se ve en la demo.

## Estructura

```
contracts/   Contrato Solidity + Hardhat 3 (viem) + despliegue con Ignition
web/         App Next.js (wagmi + viem), una sola pantalla
demo/        Archivos de ejemplo (original y adulterado) para la demostración
```

El contrato expone tres funciones:

- `registerFingerprint(bytes32 fingerprint, string title)` — registra una
  huella (rechaza duplicados y la huella vacía).
- `verifyFingerprint(bytes32 fingerprint)` — devuelve si está registrada y, si
  lo está, quién, cuándo y con qué título.
- `totalFingerprints()` — contador total de huellas registradas.

El registro es abierto: cualquiera puede registrar una huella, y queda
atribuida a la dirección que firmó.

## Cómo correrlo

Requisitos: Node.js 22 o superior.

### Contrato

```bash
cd contracts
npm install
npx hardhat test                                   # 5 tests
npx hardhat keystore set FUJI_PRIVATE_KEY           # clave cifrada, nunca en archivos
npx hardhat ignition deploy ignition/modules/SelloRegistry.ts --network fuji
```

### Web

```bash
cd web
npm install
cp .env.example .env.local   # y completar con la dirección del contrato
npm run dev                  # http://localhost:3000
```

Para registrar desde la web necesitas una wallet del navegador (MetaMask, Core
o Rabby) con la red Fuji (Chain ID 43113) y algo de AVAX de prueba del
[faucet de Avalanche](https://faucet.avax.network/). La verificación, en cambio,
es pública: funciona sin conectar wallet.

## Seguridad

- Usa una wallet **solo de pruebas**, sin dinero real.
- La clave privada nunca se escribe en archivos ni se pega en el chat:
  - Opción recomendada: keystore cifrado de Hardhat
    (`npx hardhat keystore set FUJI_PRIVATE_KEY`).
  - Alternativa: archivo `contracts/.env` local (está en `.gitignore`).
- Las variables `NEXT_PUBLIC_*` son públicas por diseño: solo direcciones y
  números de red, nunca secretos.

## Limitaciones honestas

- El registro es abierto: la primera persona que registra una huella se queda
  con la atribución. Para un medio real convendría una lista blanca de firmantes
  (cambio acotado al contrato).
- El contrato prueba **integridad**, no veracidad: que un archivo no cambió
  desde que se registró, no que su contenido sea cierto.
- Re-codificar un video o cambiar un espacio en el texto cambia el hash: el
  archivo debe ser byte a byte el registrado.
- Todo corre en testnet; no hay valor económico involucrado.
