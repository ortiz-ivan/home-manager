import { getCategoryOptions } from "../constants/inventory.js";
import {
  PurchasesHeader,
  PurchaseSuggestionsSection,
  PurchasesSummaryCards,
  usePurchasesViewController,
} from "./purchases/index.js";

export function PurchasesView({ products, onDataChanged }) {
  const {
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
  } = usePurchasesViewController({ products, onDataChanged });
  const categories = getCategoryOptions("inventory");

  return (
    <section className="module-content fade-in purchases-view">
      <PurchasesHeader
        canRegisterSuggestedList={filteredItems.length > 0 && processingIds.length === 0}
        onRegisterSuggestedList={handleBuyAll}
      />

      <PurchasesSummaryCards
        itemCount={filteredItems.length}
        urgentCount={urgentCount}
        totalEstimated={totalEstimated}
        activeCategoryCount={Object.keys(groupedItems).length}
      />

      <PurchaseSuggestionsSection
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        filteredItems={filteredItems}
        groupedItems={groupedItems}
        processingIds={processingIds}
        onBuy={handleBuy}
        message={message}
        isError={isError}
      />
    </section>
  );
}