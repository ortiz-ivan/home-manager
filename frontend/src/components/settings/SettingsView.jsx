import { SettingsCatalogPanels } from "./SettingsCatalogPanels.jsx";
import { SettingsRulesPanels } from "./SettingsRulesPanels.jsx";
import { useSettingsViewController } from "./useSettingsViewController.js";

export function SettingsView({ settings, loading, onSave }) {
  const controller = useSettingsViewController({ settings, onSave });

  if (loading) {
    return (
      <section className="module-content fade-in">
        <div className="section-header">
          <h2>Configuracion</h2>
          <p>Cargando reglas y catalogos operativos.</p>
        </div>
        <article className="panel">
          <p>Cargando configuracion...</p>
        </article>
      </section>
    );
  }

  return (
    <section className="module-content fade-in settings-view">
      <div className="section-header">
        <h2>Configuracion</h2>
        <p>Edita catalogos, reglas de presupuesto, moneda y criterios de alerta desde un solo lugar.</p>
      </div>

      <form className="settings-grid" onSubmit={controller.handleSubmit}>
        <SettingsCatalogPanels
          formState={controller.formState}
          bucketOptions={controller.bucketOptions}
          categoryScopeOptions={controller.categoryScopeOptions}
          typeOptions={controller.typeOptions}
          onUpdateCategory={controller.updateCategory}
          onAddCategory={controller.addCategory}
          onRemoveCategory={controller.removeCategory}
          onUpdateUnit={controller.updateUnit}
          onAddUnit={controller.addUnit}
          onRemoveUnit={controller.removeUnit}
          onUpdateBucket={controller.updateBucket}
        />

        <SettingsRulesPanels
          formState={controller.formState}
          criticalFrequencyOptions={controller.criticalFrequencyOptions}
          onUpdateThreshold={controller.updateThreshold}
          onUpdateCurrency={controller.updateCurrency}
          onUpdateMonthlyCloseDay={controller.updateMonthlyCloseDay}
          onUpdateAlert={controller.updateAlert}
          onToggleCriticalFrequency={controller.toggleCriticalFrequency}
        />

        <div className="settings-actions">
          <button className="btn btn-primary" type="submit" disabled={controller.isSaving}>
            {controller.isSaving ? "Guardando..." : "Guardar configuracion"}
          </button>
        </div>

        {controller.message && <p className={`message ${controller.isError ? "error" : ""}`}>{controller.message}</p>}
      </form>
    </section>
  );
}