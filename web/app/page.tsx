"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toHex } from "viem";
import {
  type BaseError,
  useConnect,
  useConnection,
  useConnectors,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import {
  CONTRACT_ADDRESS,
  FUJI_CHAIN_ID,
  selloRegistryAbi,
} from "@/lib/contract";

const SNOWTRACE = "https://testnet.snowtrace.io";

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  const base = error as BaseError;
  return base.shortMessage || (error as Error).message || String(error);
}

async function sha256Hex(file: File): Promise<`0x${string}`> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return toHex(new Uint8Array(digest));
}

function WalletBar() {
  const { address, isConnected, chain } = useConnection();
  const connectors = useConnectors();
  const { connect, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const isOnFuji = chain?.id === FUJI_CHAIN_ID;

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="dot" />
          Sello
        </div>
        <div className="wallet">
          {isConnected ? (
            <>
              <span className={`chip ${isOnFuji ? "ok" : "warn"}`}>
                {isOnFuji
                  ? `Fuji · ${FUJI_CHAIN_ID}`
                  : (chain?.name ?? "Red desconocida")}
              </span>
              <span className="chip mono">{shortAddress(address!)}</span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => disconnect()}
              >
                Salir
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={isPending || !connectors[0]}
              onClick={() => connect({ connector: connectors[0] })}
            >
              {isPending ? "Conectando…" : "Conectar wallet"}
            </button>
          )}
        </div>
      </header>

      {isConnected && !isOnFuji && (
        <div className="banner warn">
          <span>
            Estás conectado a {chain?.name ?? "otra red"}. Sello registra en
            Avalanche Fuji (Chain ID {FUJI_CHAIN_ID}).
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: avalancheFuji.id })}
          >
            {isSwitching ? "Cambiando…" : "Cambiar a Fuji"}
          </button>
        </div>
      )}

      {connectError && (
        <div className="banner error">
          No se pudo conectar: {errorMessage(connectError)}. ¿Tienes una wallet
          instalada (MetaMask, Core o Rabby)?
        </div>
      )}
    </>
  );
}

function VerifyPanel({
  fingerprint,
  onRegistered,
}: {
  fingerprint: `0x${string}`;
  onRegistered: () => void;
}) {
  const { isConnected, chain } = useConnection();
  const isOnFuji = chain?.id === FUJI_CHAIN_ID;
  const [title, setTitle] = useState("");

  const {
    data: verification,
    isPending: isVerifying,
    error: verifyError,
    refetch: refetchVerification,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: selloRegistryAbi,
    functionName: "verifyFingerprint",
    args: [fingerprint],
  });

  const {
    writeContract,
    data: txHash,
    isPending: isSending,
    isSuccess: isSent,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const handledTx = useRef<string | null>(null);
  useEffect(() => {
    if (!isConfirmed || !txHash || handledTx.current === txHash) return;
    handledTx.current = txHash;
    void refetchVerification();
    onRegistered();
  }, [isConfirmed, txHash, refetchVerification, onRegistered]);

  const [registered, registeredBy, registeredAt, registeredTitle] =
    verification ?? [];

  function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: selloRegistryAbi,
      functionName: "registerFingerprint",
      args: [fingerprint, title.trim()],
    });
  }

  const alreadyRegistered =
    writeError?.message.includes("AlreadyRegistered") ?? false;
  const resultState = isVerifying
    ? "loading"
    : registered
      ? "ok"
      : verifyError
        ? ""
        : "no";

  return (
    <>
      <div className={`result ${resultState}`}>
        {isVerifying ? (
          <p className="hint">Consultando el registro en Fuji…</p>
        ) : verifyError ? (
          <p className="error-text">
            No se pudo consultar el contrato: {errorMessage(verifyError)}
          </p>
        ) : registered ? (
          <>
            <h3>Original registrado en la blockchain</h3>
            <dl className="meta">
              <dt>Título</dt>
              <dd>{registeredTitle}</dd>
              <dt>Registrado por</dt>
              <dd className="mono">{registeredBy}</dd>
              <dt>Fecha</dt>
              <dd>
                {new Date(Number(registeredAt) * 1000).toLocaleString("es-CL")}
              </dd>
            </dl>
          </>
        ) : (
          <>
            <h3>Esta huella no está registrada</h3>
            <p>
              Puede ser un archivo adulterado… o un original legítimo que aún
              nadie registró.
            </p>

            {!isConnected ? (
              <p className="hint">
                Conecta tu wallet (arriba a la derecha) para registrar esta
                huella.
              </p>
            ) : !isOnFuji ? (
              <p className="hint">
                Cambia tu wallet a Avalanche Fuji (botón de arriba) para
                registrar.
              </p>
            ) : (
              <form onSubmit={submitRegister}>
                <div className="field">
                  <label htmlFor="title">Título de la pieza</label>
                  <input
                    id="title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={120}
                    placeholder="Ej: Comisión aprueba corredor logístico"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    !title.trim() ||
                    isSending ||
                    isConfirming ||
                    isConfirmed
                  }
                >
                  {isSending
                    ? "Confirma en tu wallet…"
                    : isConfirming
                      ? "Confirmando en Fuji…"
                      : "Registrar huella en Fuji"}
                </button>
                <p className="hint">
                  Cuesta una fracción mínima de AVAX de prueba. La huella no se
                  puede editar ni borrar después.
                </p>
              </form>
            )}

            {writeError && (
              <p className="error-text">
                {alreadyRegistered
                  ? "Esta huella ya fue registrada (quizá por otra cuenta hace un momento)."
                  : errorMessage(writeError)}
              </p>
            )}
          </>
        )}
      </div>

      {txHash && (
        <p className="tx-status">
          {isSent && isConfirmed ? (
            <>
              <strong>Registro confirmado.</strong>{" "}
              <a
                href={`${SNOWTRACE}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                Ver la transacción en Snowtrace ↗
              </a>
            </>
          ) : (
            "Transacción enviada. Esperando confirmación en Fuji…"
          )}
        </p>
      )}
    </>
  );
}

export default function Home() {
  const [fingerprint, setFingerprint] = useState<`0x${string}` | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: total, refetch: refetchTotal } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: selloRegistryAbi,
    functionName: "totalFingerprints",
  });

  const refreshTotal = useCallback(() => {
    void refetchTotal();
  }, [refetchTotal]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setHashing(true);
    setFileError(null);
    setFingerprint(null);
    try {
      setFingerprint(await sha256Hex(file));
      setFileName(file.name);
    } catch {
      setFileError("No se pudo leer el archivo. Intenta con otro.");
      setFileName(null);
    } finally {
      setHashing(false);
    }
  }

  async function copyFingerprint() {
    if (!fingerprint) return;
    await navigator.clipboard.writeText(fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="shell">
      <WalletBar />

      <p className="eyebrow">Avalanche Fuji · Chain ID {FUJI_CHAIN_ID}</p>
      <h1>Sello</h1>
      <p className="lede">
        Registra la huella digital (SHA-256) de una noticia o video y deja que
        cualquiera verifique si el archivo que recibió es el original, sin
        depender de un servidor central.
      </p>

      <section className="card">
        <h2>
          <span className="step">1</span>Elige la pieza original
        </h2>
        <p>
          La huella se calcula en tu navegador con SHA-256. El archivo nunca se
          sube a ningún servidor.
        </p>
        <div className="drop">
          <div>
            <strong>{fileName ?? "Noticia, video o documento"}</strong>
            {hashing ? (
              <p className="hint">Calculando SHA-256…</p>
            ) : (
              !fileName && (
                <p className="hint">
                  Selecciona el archivo que quieres verificar o registrar.
                </p>
              )
            )}
          </div>
          <input
            type="file"
            className="file-input"
            onChange={handleFile}
            disabled={hashing}
          />
        </div>
        {fileError && <p className="error-text">{fileError}</p>}
        {fingerprint && (
          <div className="fp">
            <p className="fp-label">Huella SHA-256</p>
            <div className="fp-value">
              <code>{fingerprint}</code>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={copyFingerprint}
              >
                {copied ? "Copiada" : "Copiar"}
              </button>
            </div>
          </div>
        )}
      </section>

      {fingerprint && (
        <section className="card">
          <h2>
            <span className="step">2</span>Verifica o registra
          </h2>
          <p>
            El resultado viene directo del contrato en Fuji, no de un servidor
            central.
          </p>
          <VerifyPanel
            key={fingerprint}
            fingerprint={fingerprint}
            onRegistered={refreshTotal}
          />
        </section>
      )}

      <div className="footer-note">
        <span>
          Huellas registradas en el contrato:{" "}
          <strong>{total !== undefined ? total.toString() : "…"}</strong>
        </span>
        <a
          href={`${SNOWTRACE}/address/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          Ver contrato en Snowtrace ↗
        </a>
      </div>
    </main>
  );
}
