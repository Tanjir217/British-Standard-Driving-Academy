import { useEffect, useState } from "react";
import { bookingService, type BookingServiceCatalogItem } from "../../services/bookings/bookingService";

type LessonPathRecord = {
  id: string;
  title: string;
  slug: string;
  transmission: string;
  pageHeading: string;
  isActive: unknown;
  fieldNames: string[];
};
type CmsResponse = {
  ok: boolean;
  collectionId: string;
  status: string;
  count?: number;
  limit?: number;
  truncatedPossible?: boolean;
  records?: LessonPathRecord[];
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
        if (!response.ok && data.ok !== false) throw new Error(`LessonPaths request failed (HTTP ${response.status}).`);
        return data;
      }),
      bookingService.listServices(),
    ]);

    if (cmsResult.status === "fulfilled") setCms(cmsResult.value);
    else setCms({
      ok: false,
      collectionId: "LessonPaths",
      status: "request_failed",
      message: cmsResult.reason instanceof Error ? cmsResult.reason.message : "Could not call the LessonPaths debug endpoint.",
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
        <p>Read-only checks for the new LessonPaths collection and the existing Wix Bookings services connection. No records are created or changed.</p>
        <button className="debug-run" type="button" onClick={() => void runChecks()} disabled={loading}>
          {loading ? "Checking Wix…" : "Run checks again"}
        </button>
        {checkedAt && <small>Last checked: {checkedAt}</small>}
      </header>

      <section className="debug-card">
        <div className="debug-card-title">
          <div><span className="debug-eyebrow">CHECK 01</span><h2>LessonPaths CMS</h2></div>
          <Status ok={cms ? cms.ok : null}>{!cms ? "Checking" : cms.ok ? "Connected" : "Failed"}</Status>
        </div>
        <p className="debug-muted">Collection ID: <code>LessonPaths</code> · Query limit: 50 records</p>
        {loading && !cms && <p>Sending read request to Wix CMS…</p>}
        {cms && !cms.ok && <ErrorText>{cms.message || "The LessonPaths collection could not be queried."}</ErrorText>}
        {cms?.ok && (
          <>
            <div className="debug-metrics">
              <div><strong>{cms.count ?? 0}</strong><span>Records returned</span></div>
              <div><strong>{cms.elapsedMs ?? "—"} ms</strong><span>Request time</span></div>
              <div><strong>{cms.truncatedPossible ? "Possibly" : "No"}</strong><span>Limit reached</span></div>
            </div>
            {cms.records?.length ? (
              <div className="debug-table-wrap"><table className="debug-table">
                <thead><tr><th>Title</th><th>Slug</th><th>Transmission</th><th>Heading</th><th>Active</th><th>Detected fields</th></tr></thead>
                <tbody>{cms.records.map((record, index) => (
                  <tr key={record.id || `${record.title}-${index}`}>
                    <td>{record.title || <em>(title empty or field name differs)</em>}<small>{record.id || "No _id returned"}</small></td>
                    <td>{record.slug || "—"}</td>
                    <td>{record.transmission || "—"}</td>
                    <td>{record.pageHeading || "—"}</td>
                    <td>{record.isActive == null ? "—" : String(record.isActive)}</td>
                    <td><code>{record.fieldNames.join(", ")}</code></td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <p className="debug-empty">Connection succeeded, but the collection returned zero records. Add a test record in Wix before testing the matching logic.</p>}
            {cms.truncatedPossible && <p className="debug-warning">The query returned the full 50-record limit. There may be additional records not shown.</p>}
          </>
        )}
      </section>

      <section className="debug-card">
        <div className="debug-card-title">
          <div><span className="debug-eyebrow">CHECK 02</span><h2>Wix Bookings services</h2></div>
          <Status ok={services !== null ? !servicesError : servicesError ? false : null}>{services !== null ? "Connected" : servicesError ? "Failed" : "Checking"}</Status>
        </div>
        <p className="debug-muted">Uses the existing <code>bookingService.listServices()</code> call used by the Packages page. This checks the current services API connection, not a separate CMS collection.</p>
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
          <li><strong>LessonPaths Connected + records returned:</strong> the collection query and its current field names are readable.</li>
          <li><strong>LessonPaths Connected + zero records:</strong> the collection ID/query works, but add a published or query-visible test record.</li>
          <li><strong>LessonPaths Failed:</strong> check the exact collection ID and Wix backend permissions/API configuration; the error is shown above.</li>
          <li><strong>Services Connected:</strong> the same services lookup used by the existing Packages page returned successfully.</li>
        </ul>
        <p className="debug-warning">This diagnostic is intended for development. Remove or protect it before exposing the site publicly; the services list and CMS field names are displayed here.</p>
      </section>
    </main>
  );
}
