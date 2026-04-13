import { useState, useEffect } from "react";
import "./App.css";
import { ProductForm } from "./components/ProductForm.jsx";
import { ProductList } from "./components/ProductList.jsx";
import { listProducts } from "./api.js";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await listProducts();
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <>
      <header className="app-header">
        <h1>Home Manager</h1>
        <p>Inventario diario con acciones rapidas</p>
      </header>

      <main className="layout">
        <ProductForm onProductCreated={loadProducts} />
        <ProductList
          products={products}
          loading={loading}
          onUpdate={loadProducts}
          onDelete={loadProducts}
        />
      </main>
    </>
  );
}

export default App;
