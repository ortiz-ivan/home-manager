import { useState } from "react";
import { createProduct } from "../api.js";

export function ProductForm({ onProductCreated }) {
  const [formData, setFormData] = useState({
    name: "",
    category: "food",
    stock: 0,
    stock_min: 1,
    unit: "unidad",
    usage_frequency: "medium",
    last_purchase: "",
  });

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "stock" || name === "stock_min" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    try {
      await createProduct(formData);
      setFormData({
        name: "",
        category: "food",
        stock: 0,
        stock_min: 1,
        unit: "unidad",
        usage_frequency: "medium",
        last_purchase: "",
      });
      setMessage("Producto guardado");
      onProductCreated();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  };

  return (
    <section className="panel">
      <h2>Nuevo producto</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Nombre
          <input
            name="name"
            type="text"
            required
            maxLength="100"
            value={formData.name}
            onChange={handleChange}
          />
        </label>

        <label>
          Categoria
          <select
            name="category"
            required
            value={formData.category}
            onChange={handleChange}
          >
            <option value="food">Alimentos</option>
            <option value="cleaning">Limpieza</option>
            <option value="hygiene">Higiene</option>
            <option value="home">Hogar</option>
          </select>
        </label>

        <label>
          Stock actual
          <input
            name="stock"
            type="number"
            min="0"
            required
            value={formData.stock}
            onChange={handleChange}
          />
        </label>

        <label>
          Stock minimo
          <input
            name="stock_min"
            type="number"
            min="0"
            required
            value={formData.stock_min}
            onChange={handleChange}
          />
        </label>

        <label>
          Unidad
          <input
            name="unit"
            type="text"
            maxLength="20"
            required
            value={formData.unit}
            onChange={handleChange}
          />
        </label>

        <label>
          Frecuencia de uso
          <select
            name="usage_frequency"
            required
            value={formData.usage_frequency}
            onChange={handleChange}
          >
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </label>

        <label>
          Ultima compra
          <input
            name="last_purchase"
            type="date"
            value={formData.last_purchase}
            onChange={handleChange}
          />
        </label>

        <button className="btn btn-primary" type="submit">
          Guardar producto
        </button>
      </form>
      {message && <p className={`message ${isError ? "error" : ""}`}>{message}</p>}
    </section>
  );
}
