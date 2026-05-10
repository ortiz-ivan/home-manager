function formatMoney(raw) {
  if (raw === "" || raw === null || raw === undefined) return "";
  const str = String(raw);
  const dotIndex = str.indexOf(".");
  const intPart = dotIndex >= 0 ? str.slice(0, dotIndex) : str;
  const decPart = dotIndex >= 0 ? str.slice(dotIndex + 1) : undefined;
  const formattedInt = intPart === "" ? "" : intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt;
}

function parseMoney(str) {
  // Dots are thousand separators, comma is decimal separator
  return str.replace(/\./g, "").replace(",", ".");
}

export function MoneyInput({ name = "", value, onChange, ...props }) {
  const handleChange = (event) => {
    const inputVal = event.target.value;
    if (inputVal === "") {
      onChange({ target: { name, value: "" } });
      return;
    }
    const raw = parseMoney(inputVal);
    if (!/^\d*\.?\d*$/.test(raw)) return;
    onChange({ target: { name, value: raw } });
  };

  return (
    <input
      {...props}
      name={name}
      type="text"
      inputMode="decimal"
      value={formatMoney(value)}
      onChange={handleChange}
    />
  );
}
