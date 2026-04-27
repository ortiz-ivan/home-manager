import { formatGuarani, formatMonthYear } from "./utils.js";

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function FinancialTimelineSection({
  summary,
  events,
  monthlyCloses,
  closeNotes,
  onCloseNotesChange,
  onCloseMonth,
  isClosingMonth,
  closeMessage,
  isCloseError,
}) {
  const currentClose = summary.monthly_close;

  return (
    <article className="panel finance-timeline-panel">
      <div className="panel-title finance-timeline-title">
        <div>
          <h3>Trazabilidad financiera</h3>
          <p>Historial de eventos y cierre contable del periodo actual.</p>
        </div>
        <span className={`status-chip ${currentClose ? "paid" : "pending"}`}>
          {currentClose ? "Mes cerrado" : "Mes abierto"}
        </span>
      </div>

      <div className="financial-close-grid">
        <div className="financial-close-card">
          <strong>{formatMonthYear(summary.month, summary.year)}</strong>
          <small>Saldo actual: {formatGuarani(summary.remaining_balance)}</small>
          <small>
            {currentClose
              ? `Cerrado el ${formatDateTime(currentClose.created_at)}`
              : "Todavia no hay cierre mensual registrado."}
          </small>
        </div>

        <div className="financial-close-form">
          <label>
            Nota del cierre
            <input
              name="close_notes"
              type="text"
              maxLength="255"
              value={closeNotes}
              onChange={onCloseNotesChange}
              placeholder="Resumen, ajuste pendiente, observacion del mes..."
            />
          </label>
          <button
            className={currentClose ? "btn btn-outline" : "btn btn-primary"}
            type="button"
            onClick={onCloseMonth}
            disabled={Boolean(currentClose) || isClosingMonth}
          >
            {isClosingMonth ? "Cerrando..." : currentClose ? "Mes cerrado" : "Cerrar mes"}
          </button>
        </div>
      </div>

      {closeMessage && <p className={`message ${isCloseError ? "error" : ""}`}>{closeMessage}</p>}

      <div className="financial-timeline-columns">
        <div>
          <div className="panel-title compact-title">
            <h3>Eventos del mes</h3>
          </div>

          {events.length === 0 ? (
            <p className="empty-history">Todavia no hay eventos financieros registrados para este mes.</p>
          ) : (
            <div className="financial-event-list">
              {events.map((event) => (
                <div key={event.id} className="financial-event-row">
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.action_label} de {event.entity_label.toLowerCase()}</p>
                    <small>{formatDate(event.effective_date)} | {formatDateTime(event.created_at)}</small>
                    {event.reason && <small>Motivo: {event.reason}</small>}
                  </div>
                  <strong>{event.amount === null ? "-" : formatGuarani(event.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="panel-title compact-title">
            <h3>Cierres registrados</h3>
          </div>

          {monthlyCloses.length === 0 ? (
            <p className="empty-history">Todavia no se registraron cierres mensuales.</p>
          ) : (
            <div className="financial-close-list">
              {monthlyCloses.map((item) => (
                <div key={item.id} className="financial-event-row close-row">
                  <div>
                    <strong>{formatMonthYear(item.month, item.year)}</strong>
                    <p>{item.notes || "Sin observaciones"}</p>
                    <small>{formatDateTime(item.created_at)}</small>
                  </div>
                  <strong>{formatGuarani(item.summary_snapshot?.remaining_balance || 0)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}