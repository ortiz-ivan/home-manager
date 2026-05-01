export function PurchasesHeader({ canRegisterSuggestedList, onRegisterSuggestedList }) {
  return (
    <div className="section-header purchases-header">
      <div>
        <h2>Centro de compras</h2>
        <p>Prioriza reposiciones, agrupa la compra por categoria y registra la entrada al stock con un clic.</p>
      </div>
      <div className="purchases-header-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={onRegisterSuggestedList}
          disabled={!canRegisterSuggestedList}
        >
          Registrar lista sugerida
        </button>
      </div>
    </div>
  );
}