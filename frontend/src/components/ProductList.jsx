import { useMemo, useState } from "react";
import { ProductCard } from "./ProductCard.jsx";

const CATEGORY_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "food", label: "Alimentos" },
  { value: "cleaning", label: "Limpieza" },
  { value: "hygiene", label: "Higiene" },
  { value: "home", label: "Hogar" },
];

export function ProductList({ products, loading, onUpdate, onDelete }) {
  const [categoryFilter, setCategoryFilter] = useState("all");

  const visibleProducts = useMemo(() => {
    if (categoryFilter === "all") {
      return products;
    }

    return products.filter((product) => product.category === categoryFilter);
  }, [categoryFilter, products]);

  const lowStockCount = visibleProducts.filter((item) => item.stock <= item.stock_min).length;

  if (loading) {
    return (
      <section className="panel">
        <div className="panel-title">
          <h2>Inventario</h2>
        </div>
        <p>Cargando productos...</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Inventario</h2>
        <div className="inventory-stats">
          <span className="badge">Total: {visibleProducts.length}</span>
          <span className="badge low-stock">Bajo stock: {lowStockCount}</span>
        </div>
      </div>

      <div className="inventory-controls">
        {CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`btn btn-filter ${categoryFilter === option.value ? "active" : ""}`}
            onClick={() => setCategoryFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {visibleProducts.length === 0 ? (
        <p>No hay productos cargados todavia.</p>
      ) : (
        <div className="products">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
