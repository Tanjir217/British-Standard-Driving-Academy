import { useEffect, useState } from "react";
import { bookingService, type BookingServiceCatalogItem } from "../../services/bookings/bookingService";

type CmsRecord = {
  id: string;
  fieldNames: string[];
  data: Record<string, unknown>;
};
type CmsCollection = {
  collectionId: string;
  status: string;
  count: number;
  limit: number;
  truncatedPossible: boolean;
  records: CmsRecord[];
};
type CmsResponse = {
  ok: boolean;
  status: string;
  collections?: CmsCollection[];
  message?: string;
  elapsedMs?: number;
};

function Status({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  const cls = ok === null ? "debug-status pending" : ok ? "debug-status success" : "debug-status failure";
  return <span className={cls}>{children}</span>;
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="debug-error">{children}</p>;
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function LessonPathCmsDebug() {
  const [cms, setCms] = useState<CmsResponse | null>(null);
  const [services, setServices] = useState<BookingServiceCatalogItem[] | null>(null);
  const [servicesError, setServicesError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState("");

  const runChecks = async () => {
    setLoading(true);
    setCms(null);
    setServices(null);
    setServicesError("");
    const [cmsResult, servicesResult] = await Promise.allSettled([
      fetch("/api/debug/lesson-path-cms", { cache: "no-store" }).then(async (response) => {
        const data = await response.json() as CmsResponse;
        if (!response.ok && data.ok !== false) throw new Error(`Lesson CMS request failed (HTTP ${response.status}).`);
        return data;
      }),
      bookingService.listServices(),
    ]);

    if (cmsResult.status === "fulfilled") setCms(cmsResult.value);
    else setCms({
      ok: false,
      status: "request_failed",
      message: cmsResult.reason instanceof Error ? cmsResult.reason.message : "Could not call the Lesson CMS debug endpoint.",
    });

    if (servicesResult.status === "fulfilled") {
      if (servicesResult.value.ok) setServices(servicesResult.value.data);
      else setServicesError(servicesResult.value.error.message);
    } else {
      setServicesError(servicesResult.reason instanceof Error ? servicesResult.reason.message : "Unknown Wix Bookings services error.");
    }
    setCheckedAt(new Date().toLocaleString());
    setLoading(false);
  };

  useEffect(() => { void runChecks(); }, []);

  return (
    <main className="debug-page">
      <header className="debug-header">
        <span className="debug-eyebrow">BSDA · DEVELOPMENT DIAGNOSTICS</span>
        <h1>Lesson CMS connection check</h1>
        <p>Read-only queries for both Wix CMS collections, showing every returned field name and its current value, plus the existing Wix Bookings services connection. No records are created or changed.</p>
        <button className="debug-run" type="button" onClick={() => void runChecks()} disabled={loading}>
          {loading ? "Checking Wix…" : "Run checks again"}
        </button>
        {checkedAt && <small>Last checked: {checkedAt}</small>}
      </header>

      <section className="debug-card">
        <div className="debug-card-title">
          <div><span className="debug-eyebrow">CHECK 01</span><h2>LessonPaths + LessonPathPlans CMS</h2></div>
          <Status ok={cms ? cms.ok : null}>{!cms ? "Checking" : cms.ok ? "Connected" : "Failed"}</Status>
        </div>
        <p className="debug-muted">Collection IDs: <code>LessonPaths</code> and <code>LessonPathPlans</code> · Query limit: 50 records per collection.</p>
        {loading && !cms && <p>Sending read requests to Wix CMS…</p>}
        {cms && !cms.ok && <ErrorText>{cms.message || "The Wix CMS collections could not be queried."}</ErrorText>}
        {cms?.ok && cms.collections?.map((collection) => (
          <section className="debug-collection" key={collection.collectionId}>
            <div className="debug-card-title debug-collection-title">
              <h2>{collection.collectionId}</h2>
              <Status ok={collection.status === "connected"}>{collection.status === "connected" ? "Connected" : collection.status}</Status>
            </div>
            <div className="debug-metrics">
              <div><strong>{collection.count}</strong><span>Records returned</span></div>
              <div><strong>{cms.elapsedMs ?? "—"} ms</strong><span>Combined request time</span></div>
              <div><strong>{collection.truncatedPossible ? "Possibly" : "No"}</strong><span>Limit reached</span></div>
            </div>
            {collection.records.length ? collection.records.map((record, index) => (
              <details className="debug-record" key={record.id || `${collection.collectionId}-${index}`} open={collection.records.length === 1}>
                <summary>
                  <strong>Record {index + 1}</strong>
                  <code>{record.id || "No _id returned"}</code>
                  <span>{record.fieldNames.length} fields</span>
                </summary>
                <div className="debug-table-wrap"><table className="debug-table">
                  <thead><tr><th>Field name</th><th>Data / value</th></tr></thead>
                  <tbody>{record.fieldNames.map((fieldName) => (
                    <tr key={fieldName}>
                      <td><code>{fieldName}</code></td>
                      <td><pre className="debug-value">{formatValue(record.data[fieldName])}</pre></td>
                    </tr>
                  ))}</tbody>
                </table></div>
              </details>
            )) : <p className="debug-empty">The collection query succeeded, but returned zero records. Add a record in Wix CMS to inspect its field names and values here.</p>}
            {collection.truncatedPossible && <p className="debug-warning">The query returned the full 50-record limit. Additional records may exist and are not shown.</p>}
          </section>
        ))}
        {cms?.ok && <p className="debug-muted">Combined CMS query completed in {cms.elapsedMs ?? "—"} ms.</p>}
      </section>

      <section className="debug-card">
        <div className="debug-card-title">
          <div><span className="debug-eyebrow">CHECK 02</span><h2>Wix Bookings services</h2></div>
          <Status ok={services !== null ? !servicesError : servicesError ? false : null}>{services !== null ? "Connected" : servicesError ? "Failed" : "Checking"}</Status>
        </div>
        <p className="debug-muted">Uses the existing <code>bookingService.listServices()</code> call used by the Packages page. This checks the current services API connection, not a CMS collection.</p>
        {loading && services === null && !servicesError && <p>Sending request to Wix Bookings…</p>}
        {servicesError && <ErrorText>{servicesError}</ErrorText>}
        {services && (
          <>
            <div className="debug-metrics">
              <div><strong>{services.length}</strong><span>Visible services</span></div>
              <div><strong>{services.filter((service) => Boolean(service.id)).length}</strong><span>With service IDs</span></div>
              <div><strong>{services.filter((service) => Boolean(service.name)).length}</strong><span>With names</span></div>
            </div>
            {services.length ? <div className="debug-table-wrap"><table className="debug-table">
              <thead><tr><th>Service name</th><th>Service ID</th><th>Price</th><th>Currency</th></tr></thead>
              <tbody>{services.map((service) => <tr key={service.id}><td>{service.name}</td><td><code>{service.id}</code></td><td>{(service.priceMinor / 100).toFixed(2)}</td><td>{service.currency}</td></tr>)}</tbody>
            </table></div> : <p className="debug-empty">The request succeeded, but Wix returned no visible services.</p>}
          </>
        )}
      </section>

      <section className="debug-card debug-next">
        <h2>How to interpret the result</h2>
        <ul>
          <li><strong>Connected + records returned:</strong> the collection is queryable, and each record displays its returned field names and values.</li>
          <li><strong>Connected + zero records:</strong> the collection query works, but there are no records visible to this query yet.</li>
          <li><strong>Failed:</strong> check the exact collection ID and Wix backend permissions/API configuration; the error is shown above.</li>
          <li><strong>Services Connected:</strong> the existing services lookup used by the Packages page returned successfully.</li>
        </ul>
        <p className="debug-warning">Development diagnostic only. Protect or remove this page before exposing it publicly; it displays CMS record data and field names.</p>
      </section>
    </main>
  );
}
