import { useEffect, useState } from "react";
import { wixClient } from "../services/wix/client";

type DiagnosticState =
  | { status: "loading"; message: string }
  | { status: "success"; message: string; result: unknown }
  | { status: "error"; message: string; details: string };

function describeError(error: unknown): string {
  if (error instanceof Error) {
    // Keep diagnostics useful without printing tokens or request headers.
    return error.message;
  }

  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return "An unknown error occurred.";
  }
}

/**
 * Temporary browser-only diagnostic.
 * Open /debug/video-library to test the public Wix Headless client against
 * the VideoLibrary collection. This does not create, update, or delete data.
 */
export function VideoLibraryCmsDebug() {
  const [state, setState] = useState<DiagnosticState>({
    status: "loading",
    message: "Checking browser access to the Wix VideoLibrary collection…",
  });

  useEffect(() => {
    let cancelled = false;

    async function checkCollection() {
      try {
        const result = await wixClient.items
          .query("VideoLibrary")
          .limit(5)
          .find();

        if (cancelled) return;

        setState({
          status: "success",
          message: "The Wix Data query completed successfully.",
          result,
        });
      } catch (error) {
        if (cancelled) return;

        setState({
          status: "error",
          message: "The Wix Data query failed.",
          details: describeError(error),
        });
      }
    }

    void checkCollection();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="video-library-debug">
      <header>
        <p className="eyebrow">BSDA · Temporary diagnostics</p>
        <h1>VideoLibrary CMS access test</h1>
        <p>
          This page performs a read-only browser request using the existing
          Wix Headless client. It does not add or change CMS records.
        </p>
      </header>

      <section
        className={`result-card result-card--${state.status}`}
        aria-live="polite"
      >
        <h2>
          {state.status === "loading"
            ? "Test running"
            : state.status === "success"
              ? "Request succeeded"
              : "Request failed"}
        </h2>
        <p>{state.message}</p>

        {state.status === "loading" && <p>Waiting for Wix Data…</p>}

        {state.status === "success" && (
          <>
            <p>
              <strong>Collection queried:</strong> VideoLibrary
            </p>
            <p>
              <strong>Maximum records requested:</strong> 5
            </p>
            <h3>Response payload</h3>
            <pre>{JSON.stringify(state.result, null, 2)}</pre>
          </>
        )}

        {state.status === "error" && (
          <>
            <h3>Error details</h3>
            <pre>{state.details}</pre>
            <p className="hint">
              Check the browser Network and Console panels, the exact Wix CMS
              collection ID, the collection read permissions, and whether this
              site's Wix Headless client is correctly configured.
            </p>
          </>
        )}
      </section>

      <p className="warning">
        Temporary developer page. Do not use this page to test private
        collections or expose secrets, access tokens, or personal student data.
      </p>

      <style>{`
        .video-library-debug {
          box-sizing: border-box;
          max-width: 960px;
          margin: 0 auto;
          padding: 40px 24px 64px;
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
        }
        .video-library-debug .eyebrow {
          color: #486581;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .video-library-debug h1 {
          margin: 8px 0 12px;
          font-size: clamp(28px, 5vw, 42px);
        }
        .video-library-debug h2 { margin-top: 0; }
        .video-library-debug .result-card {
          margin-top: 24px;
          padding: 24px;
          border: 1px solid #d8dee8;
          border-radius: 12px;
          background: #fff;
        }
        .video-library-debug .result-card--success { border-left: 5px solid #23845b; }
        .video-library-debug .result-card--error { border-left: 5px solid #bd3434; }
        .video-library-debug .result-card--loading { border-left: 5px solid #5375a5; }
        .video-library-debug pre {
          overflow: auto;
          max-height: 520px;
          padding: 16px;
          border-radius: 8px;
          background: #f3f5f8;
          color: #172033;
          font-size: 12px;
          line-height: 1.55;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .video-library-debug .hint { color: #48566a; }
        .video-library-debug .warning {
          margin-top: 20px;
          color: #72531b;
          font-size: 13px;
        }
      `}</style>
    </main>
  );
}
