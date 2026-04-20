import { formatGuarani } from "./utils.js";

export function IncomeSection({ incomes, onEdit, onDelete }) {
  return (
    <article className="panel">
      <div className="panel-title">
        <h3>Ingresos registrados</h3>
      </div>

      {incomes.length === 0 ? (
        <p>No hay ingresos cargados en este momento.</p>
      ) : (
        <div className="income-list">
          {incomes.map((income) => (
            <div className="income-row" key={income.id}>
              <div>
                <strong>{formatGuarani(income.amount)}</strong>
                <p>{income.source || "Sin fuente"}</p>
                <small>{income.date}</small>
              </div>
              <div className="row-actions">
                <button className="btn btn-secondary" type="button" onClick={() => onEdit(income)}>
                  Editar
                </button>
                <button className="btn btn-outline" type="button" onClick={() => onDelete(income)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}