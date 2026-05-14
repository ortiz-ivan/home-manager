import { useEffect, useState } from "react";
import { getFinancialAnomalies } from "../../api.js";
import { formatGuarani } from "./utils.js";

const LEVEL_CLASS = { danger: "is-danger", warning: "is-warning", info: "" };

const TYPE_LABEL = {
  category_spike: "Categoria",
  fast_restock: "Reposicion rapida",
  slow_restock: "Sin reposicion",
};

function AnomalyDetail({ anomaly }) {
  if (anomaly.type === "category_spike") {
    return (
      <small>
        Este mes: {formatGuarani(anomaly.current_amount)} | Promedio hist.: {formatGuarani(anomaly.reference_amount)}
      </small>
    );
  }
  if (anomaly.type === "fast_restock" || anomaly.type === "slow_restock") {
    return (
      <small>
        {anomaly.days_since_last_restock} días desde último restock · promedio: {Math.round(anomaly.avg_restock_interval_days)} días
      </small>
    );
  }
  return <small>{anomaly.description}</small>;
}

export function FinancialAnomaliesSection({ summary }) {
  const [report, setReport] = useState(null);

  const refreshKey = summary
    ? `${summary.month}-${summary.year}-${summary.variable_expenses}-${summary.fixed_estimated_expenses}`
    : null;

  useEffect(() => {
    if (!refreshKey) return;
    getFinancialAnomalies(summary.month, summary.year)
      .then(setReport)
      .catch(() => {});
  }, [refreshKey]);

  if (!report || report.anomalies.length === 0) return null;

  return (
    <div className="anomalies-section">
      <div className="anomalies-header">
        <span className="projection-label">Anomalias detectadas</span>
        {report.lookback_months > 0 && (
          <span className="projection-days">
            Comparacion contra los ultimos {report.lookback_months} mes{report.lookback_months !== 1 ? "es" : ""}
          </span>
        )}
      </div>

      <div className="anomalies-list">
        {report.anomalies.map((anomaly, i) => (
          <div key={i} className={`reminder-strip ${LEVEL_CLASS[anomaly.level] ?? ""}`}>
            <div>
              <strong>{anomaly.title}</strong>
              <AnomalyDetail anomaly={anomaly} />
            </div>
            <span className="anomaly-badge">{TYPE_LABEL[anomaly.type] ?? anomaly.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
