import { useState } from "react";
import { buyProduct } from "../../api.js";
import { getCurrentInventorySettings } from "../../constants/inventory.js";

function daysSince(dateString) {
  if (!dateString) {
    return 999;
  }

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return 999;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function getPriorityMeta(product) {
  const settings = getCurrentInventorySettings();
  const deficit = Math.max((product.stock_min || 0) - (product.stock || 0), 0);
  const lastPurchaseAge = daysSince(product.last_purchase);

  let score = deficit * 5;

  if ((product.stock || 0) === 0) {
    score += 10;
  }

  if (product.usage_frequency === "high") {
    score += 8;
  } else if (product.usage_frequency === "medium") {
    score += 4;
  }

  if (lastPurchaseAge >= Math.max(Number(settings.alerts.purchase_stale_days || 21), 30)) {
    score += 4;
  }

  if ((product.stock || 0) <= (product.stock_min || 0)) {
    return {
      score,
      label: score >= 18 ? "Urgente" : "Alta",
      tone: score >= 18 ? "critical" : "high",
    };
  }

  if ((product.stock || 0) <= (product.stock_min || 0) * 1.5 || lastPurchaseAge >= 21) {
    return {
      score,
      label: "Media",
      tone: "medium",
    };
  }

  return {
    score,
    label: "Baja",
    tone: "low",
  };
}

function buildSuggestedQuantity(product) {
  const minimum = Number(product.stock_min || 0);
  const currentStock = Number(product.stock || 0);
  const deficit = Math.max(minimum - currentStock, 0);

  if (product.usage_frequency === "high") {
    return Math.max(deficit, minimum || 1, 1);
  }

  if (product.usage_frequency === "medium") {
    return Math.max(deficit, 1);
  }

  return Math.max(deficit || 1, 1);
}

function toPurchaseItem(product) {
  const priority = getPriorityMeta(product);
  const suggestedQuantity = buildSuggestedQuantity(product);
  const estimatedCost = Number(product.price || 0) * suggestedQuantity;

  return {
    ...product,
    priority,
    suggestedQuantity,
    estimatedCost,
    stockGap: Math.max((product.stock_min || 0) - (product.stock || 0), 0),
    lastPurchaseAge: daysSince(product.last_purchase),
  };
}

function isCandidate(product) {
  const settings = getCurrentInventorySettings();
  const belowThreshold = Number(product.stock || 0) <= Number(product.stock_min || 0) * Number(settings.thresholds.purchase_suggestion_stock_ratio || 1);
  const agingPurchase = daysSince(product.last_purchase) >= Number(settings.alerts.purchase_stale_days || 21);
  return belowThreshold || agingPurchase;
}

export function formatPurchaseDate(value) {
  if (!value) {
    return "Sin registro";
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

export function usePurchasesViewController({ products, onDataChanged }) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [processingIds, setProcessingIds] = useState([]);

  const purchaseItems = products
    .filter(isCandidate)
    .map(toPurchaseItem)
    .sort((left, right) => right.priority.score - left.priority.score || left.name.localeCompare(right.name));

  const filteredItems = categoryFilter === "all"
    ? purchaseItems
    : purchaseItems.filter((item) => item.category === categoryFilter);

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const totalEstimated = filteredItems.reduce((sum, item) => sum + item.estimatedCost, 0);
  const urgentCount = filteredItems.filter((item) => item.priority.tone === "critical").length;

  const handleBuy = async (item) => {
    setMessage("");
    setIsError(false);
    setProcessingIds((current) => [...current, item.id]);

    try {
      await buyProduct(item.id, item.suggestedQuantity);
      setMessage(`Compra registrada para ${item.name} por ${item.suggestedQuantity} ${item.unit}.`);
      await onDataChanged();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    } finally {
      setProcessingIds((current) => current.filter((id) => id !== item.id));
    }
  };

  const handleBuyAll = async () => {
    const readyItems = filteredItems.filter((item) => !processingIds.includes(item.id));

    if (readyItems.length === 0) {
      return;
    }

    setMessage("");
    setIsError(false);
    setProcessingIds(readyItems.map((item) => item.id));

    try {
      for (const item of readyItems) {
        await buyProduct(item.id, item.suggestedQuantity);
      }
      setMessage(`Se registraron ${readyItems.length} compras sugeridas.`);
      await onDataChanged();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    } finally {
      setProcessingIds([]);
    }
  };

  return {
    categoryFilter,
    setCategoryFilter,
    message,
    isError,
    processingIds,
    filteredItems,
    groupedItems,
    totalEstimated,
    urgentCount,
    handleBuy,
    handleBuyAll,
  };
}