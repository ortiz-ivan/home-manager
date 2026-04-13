import { ProductCard } from "./ProductCard.jsx";

export function ProductList({ products, loading, onUpdate, onDelete }) {
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
      </div>

      {products.length === 0 ? (
        <p>No hay productos cargados todavia.</p>
      ) : (
        <div className="products">
          {products.map((product) => (
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
