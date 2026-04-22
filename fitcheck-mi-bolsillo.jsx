import { useState, useEffect, useReducer, useRef, useCallback } from "react";

// ─── MOCK DATA LAYER (mirrors Python PricingService / DB) ────────────────────
const INGREDIENT_PRICES_DB = {
  // { ingredient_key: { price_per_unit, unit, unit_label } }
  "pechuga de pollo":   { per100g: 850,  unit: "kg",  label: "$/kg" },
  "filete de salmón":   { per100g: 2800, unit: "kg",  label: "$/kg" },
  "claras de huevo":    { per100g: 320,  unit: "ud",  label: "$/ud" },
  "quinoa":             { per100g: 980,  unit: "kg",  label: "$/kg" },
  "avena":              { per100g: 420,  unit: "kg",  label: "$/kg" },
  "arroz integral":     { per100g: 350,  unit: "kg",  label: "$/kg" },
  "espinaca":           { per100g: 290,  unit: "kg",  label: "$/kg" },
  "brócoli":            { per100g: 380,  unit: "kg",  label: "$/kg" },
  "tomate cherry":      { per100g: 250,  unit: "kg",  label: "$/kg" },
  "aguacate":           { per100g: 650,  unit: "ud",  label: "$/ud" },
  "aceite de oliva":    { per100g: 120,  unit: "ml",  label: "$/100ml" },
  "salsa de soja":      { per100g: 95,   unit: "ml",  label: "$/100ml" },
  "miel":               { per100g: 380,  unit: "kg",  label: "$/kg" },
  "jengibre":           { per100g: 150,  unit: "kg",  label: "$/kg" },
  "fresas":             { per100g: 480,  unit: "kg",  label: "$/kg" },
  "arándanos":          { per100g: 720,  unit: "kg",  label: "$/kg" },
  "miel de agave":      { per100g: 420,  unit: "kg",  label: "$/kg" },
  "canela":             { per100g: 220,  unit: "kg",  label: "$/kg" },
  "default":            { per100g: 350,  unit: "kg",  label: "$/kg" },
};

// Mock store network in Buenos Aires (2km radius simulation)
const MOCK_STORES = [
  { id: "s1", name: "Jumbo Palermo",     chain: "Jumbo",     markup: 1.05, lat: -34.5865, lng: -58.4280, dist: 0.4, emoji: "🟡", color: "#FFD600" },
  { id: "s2", name: "Carrefour Soho",    chain: "Carrefour", markup: 0.93, lat: -34.5901, lng: -58.4195, dist: 0.8, emoji: "🔵", color: "#0055A5" },
  { id: "s3", name: "Día Serrano",       chain: "Día",       markup: 0.79, lat: -34.5934, lng: -58.4341, dist: 1.2, emoji: "🔴", color: "#E30020" },
  { id: "s4", name: "Coto Scalabrini",   chain: "Coto",      markup: 0.87, lat: -34.5878, lng: -58.4420, dist: 1.5, emoji: "🟠", color: "#FF6900" },
  { id: "s5", name: "Dietética Vital",   chain: "Orgánica",  markup: 1.22, lat: -34.5820, lng: -58.4155, dist: 1.9, emoji: "🌿", color: "#2ECC71" },
];

// ─── PRICING SERVICE (Python equivalent in JS) ───────────────────────────────
function calculateRecipeCost(ingredients, storeMarkup = 1.0) {
  let total = 0;
  const breakdown = [];

  for (const ing of ingredients) {
    const key = ing.name.toLowerCase();
    const priceData = INGREDIENT_PRICES_DB[key] || INGREDIENT_PRICES_DB["default"];
    const rawCost = (ing.grams / 100) * priceData.per100g;
    const cost = rawCost * storeMarkup;
    total += cost;
    breakdown.push({
      name: ing.name,
      amount: ing.amount,
      grams: ing.grams,
      unitCost: priceData.per100g,
      unitLabel: priceData.label,
      total: Math.round(cost),
    });
  }

  return {
    total: Math.round(total),
    perServing: Math.round(total / 2), // 2 porciones default
    breakdown,
  };
}

function getStoreResults(ingredients) {
  return MOCK_STORES.map(store => {
    const pricing = calculateRecipeCost(ingredients, store.markup);
    return { ...store, ...pricing };
  }).sort((a, b) => a.total - b.total);
}

// ─── MOCK RECIPES (same as previous module) ──────────────────────────────────
const MOCK_RECIPES = [
  {
    id: "r1",
    name: "Power Bowl de Pollo y Quinoa",
    emoji: "🥗",
    calories: 520,
    prepTime: "25 min",
    macros: { protein: 48, carbs: 52, fat: 14, fiber: 8 },
    ingredients: [
      { name: "Pechuga de pollo", amount: "200g", grams: 200 },
      { name: "Quinoa", amount: "80g", grams: 80 },
      { name: "Espinaca", amount: "100g", grams: 100 },
      { name: "Tomate cherry", amount: "80g", grams: 80 },
      { name: "Aguacate", amount: "60g", grams: 60 },
      { name: "Aceite de oliva", amount: "10ml", grams: 9 },
    ],
    tags: ["alto proteína", "sin gluten"],
  },
  {
    id: "r2",
    name: "Salmón Teriyaki con Brócoli",
    emoji: "🐟",
    calories: 480,
    prepTime: "20 min",
    macros: { protein: 42, carbs: 38, fat: 18, fiber: 6 },
    ingredients: [
      { name: "Filete de salmón", amount: "180g", grams: 180 },
      { name: "Brócoli", amount: "200g", grams: 200 },
      { name: "Salsa de soja", amount: "20ml", grams: 20 },
      { name: "Miel", amount: "10g", grams: 10 },
      { name: "Jengibre", amount: "5g", grams: 5 },
      { name: "Arroz integral", amount: "60g", grams: 60 },
    ],
    tags: ["omega-3", "antiinflamatorio"],
  },
  {
    id: "r3",
    name: "Tortilla de Claras con Avena",
    emoji: "🍳",
    calories: 380,
    prepTime: "15 min",
    macros: { protein: 28, carbs: 45, fat: 4, fiber: 7 },
    ingredients: [
      { name: "Claras de huevo", amount: "4 uds", grams: 120 },
      { name: "Avena", amount: "50g", grams: 50 },
      { name: "Fresas", amount: "100g", grams: 100 },
      { name: "Arándanos", amount: "50g", grams: 50 },
      { name: "Miel de agave", amount: "10g", grams: 10 },
    ],
    tags: ["desayuno", "bajo grasa"],
  },
  {
    id: "r4",
    name: "Ensalada Mediterránea de Quinoa",
    emoji: "🫙",
    calories: 410,
    prepTime: "10 min",
    macros: { protein: 18, carbs: 55, fat: 12, fiber: 10 },
    ingredients: [
      { name: "Quinoa", amount: "100g", grams: 100 },
      { name: "Tomate cherry", amount: "120g", grams: 120 },
      { name: "Espinaca", amount: "80g", grams: 80 },
      { name: "Aceite de oliva", amount: "15ml", grams: 14 },
    ],
    tags: ["vegano", "rápido"],
  },
  {
    id: "r5",
    name: "Bowl Energético de Avena",
    emoji: "🥣",
    calories: 340,
    prepTime: "5 min",
    macros: { protein: 14, carbs: 58, fat: 6, fiber: 9 },
    ingredients: [
      { name: "Avena", amount: "80g", grams: 80 },
      { name: "Fresas", amount: "80g", grams: 80 },
      { name: "Arándanos", amount: "60g", grams: 60 },
      { name: "Miel de agave", amount: "15g", grams: 15 },
    ],
    tags: ["vegano", "sin cocción"],
  },
];

// Pre-calculate base costs for each recipe (cheapest store as reference)
const RECIPES_WITH_COSTS = MOCK_RECIPES.map(r => {
  const storeResults = getStoreResults(r.ingredients);
  const cheapest = storeResults[0];
  const priciest = storeResults[storeResults.length - 1];
  return {
    ...r,
    baseCost: cheapest.total,
    maxCost: priciest.total,
    perServing: cheapest.perServing,
    storeResults,
  };
});

// ─── CART REDUCER ─────────────────────────────────────────────────────────────
const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD": {
      const exists = state.find(i => i.name === action.item.name);
      return exists ? state : [...state, action.item];
    }
    case "REMOVE": return state.filter(i => i.name !== action.name);
    case "CLEAR": return [];
    default: return state;
  }
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = "", suffix = "" }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const diff = end - start;
    const steps = 20;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (step >= steps) {
        clearInterval(timer);
        prevRef.current = end;
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{display.toLocaleString("es-AR")}{suffix}</span>;
}

function BudgetSlider({ value, onChange, min = 500, max = 15000 }) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ position: "relative", padding: "12px 0" }}>
      <div style={{ position: "relative", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${pct}%`, background: "linear-gradient(90deg, #C8FF57, #57FFC8)",
          borderRadius: "2px", transition: "width 0.1s ease",
          boxShadow: "0 0 12px rgba(200,255,87,0.4)",
        }} />
        <input
          type="range" min={min} max={max} step={100} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: "absolute", inset: "-10px 0",
            width: "100%", opacity: 0, cursor: "pointer", height: "24px",
          }}
        />
        <div style={{
          position: "absolute", top: "50%", left: `${pct}%`,
          transform: "translate(-50%, -50%)",
          width: "18px", height: "18px",
          background: "#C8FF57", borderRadius: "50%",
          boxShadow: "0 0 20px rgba(200,255,87,0.6)",
          transition: "left 0.1s ease",
          pointerEvents: "none",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#444" }}>$500</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#444" }}>$15.000</span>
      </div>
    </div>
  );
}

function StoreMapPin({ store, cheapest, closest, selected, onClick }) {
  const isCheapest = cheapest?.id === store.id;
  const isClosest = closest?.id === store.id;

  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left: `${store._mapX}%`, top: `${store._mapY}%`,
        transform: "translate(-50%, -100%)",
        cursor: "pointer", zIndex: selected ? 10 : 1,
        transition: "all 0.3s ease",
      }}
    >
      <div style={{
        background: selected ? store.color : "#1a1a1a",
        border: `2px solid ${store.color}`,
        borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)",
        width: selected ? "36px" : "28px", height: selected ? "36px" : "28px",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: selected ? `0 0 20px ${store.color}80` : "0 4px 12px rgba(0,0,0,0.4)",
        transition: "all 0.3s ease",
      }}>
        <span style={{ transform: "rotate(45deg)", fontSize: selected ? "14px" : "11px" }}>{store.emoji}</span>
      </div>
      {(isCheapest || isClosest || selected) && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)",
          background: "#0d0d0d", border: `1px solid ${store.color}60`,
          borderRadius: "8px", padding: "4px 8px", whiteSpace: "nowrap",
          fontSize: "10px", fontFamily: "'DM Mono', monospace",
          color: store.color, boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        }}>
          {isCheapest ? "💰 Más barata" : isClosest ? "📍 Más cerca" : store.name}
        </div>
      )}
    </div>
  );
}

function MapView({ stores, selectedStore, onSelectStore }) {
  // Assign pseudo-map positions based on relative coordinates
  const latMin = Math.min(...stores.map(s => s.lat));
  const latMax = Math.max(...stores.map(s => s.lat));
  const lngMin = Math.min(...stores.map(s => s.lng));
  const lngMax = Math.max(...stores.map(s => s.lng));

  const storesWithPos = stores.map(store => ({
    ...store,
    _mapX: ((store.lng - lngMin) / (lngMax - lngMin)) * 80 + 10,
    _mapY: ((latMax - store.lat) / (latMax - latMin)) * 70 + 10,
  }));

  const cheapest = [...stores].sort((a, b) => a.total - b.total)[0];
  const closest = [...stores].sort((a, b) => a.dist - b.dist)[0];

  return (
    <div style={{
      position: "relative",
      height: "280px",
      background: "#0a0f0a",
      borderRadius: "16px",
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Grid lines (map aesthetic) */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06 }}>
        {[...Array(8)].map((_, i) => (
          <line key={`h${i}`} x1="0" y1={`${i * 14.3}%`} x2="100%" y2={`${i * 14.3}%`} stroke="#C8FF57" strokeWidth="0.5" />
        ))}
        {[...Array(10)].map((_, i) => (
          <line key={`v${i}`} x1={`${i * 11.1}%`} y1="0" x2={`${i * 11.1}%`} y2="100%" stroke="#C8FF57" strokeWidth="0.5" />
        ))}
      </svg>

      {/* Radius circle from user location */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: "200px", height: "200px",
        border: "1px dashed rgba(200,255,87,0.15)",
        borderRadius: "50%",
      }} />
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: "14px", height: "14px",
        background: "#C8FF57", borderRadius: "50%",
        boxShadow: "0 0 20px rgba(200,255,87,0.8), 0 0 40px rgba(200,255,87,0.3)",
      }} />
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, calc(-50% + 20px))",
        fontFamily: "'DM Mono', monospace", fontSize: "9px",
        color: "#C8FF57", whiteSpace: "nowrap", letterSpacing: "0.08em",
      }}>📍 TU UBICACIÓN</div>

      {/* Store pins */}
      {storesWithPos.map(store => (
        <StoreMapPin
          key={store.id}
          store={store}
          cheapest={cheapest}
          closest={closest}
          selected={selectedStore?.id === store.id}
          onClick={() => onSelectStore(store)}
        />
      ))}

      {/* Scale indicator */}
      <div style={{
        position: "absolute", bottom: "12px", right: "12px",
        fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#444",
        background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: "6px",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>⌀ 2km radio</div>

      {/* Leaflet attribution placeholder */}
      <div style={{
        position: "absolute", bottom: "12px", left: "12px",
        fontFamily: "'DM Mono', monospace", fontSize: "8px", color: "#333",
      }}>Leaflet.js / OpenStreetMap en prod</div>
    </div>
  );
}

function StoreCard({ store, rank, isSelected, isCheapest, isClosest, maxCost, onClick }) {
  const savings = maxCost - store.total;
  const savingsPct = Math.round((savings / maxCost) * 100);

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${isSelected ? store.color + "60" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "14px", padding: "16px",
        cursor: "pointer",
        transition: "all 0.25s ease",
        transform: isSelected ? "translateY(-2px)" : "translateY(0)",
        boxShadow: isSelected ? `0 8px 32px ${store.color}20` : "none",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
    >
      {/* Rank badge */}
      <div style={{
        position: "absolute", top: "-1px", right: "14px",
        background: rank === 1 ? "#C8FF57" : "rgba(255,255,255,0.06)",
        color: rank === 1 ? "#000" : "#555",
        fontFamily: "'DM Mono', monospace", fontSize: "9px", fontWeight: "700",
        padding: "2px 8px", borderRadius: "0 0 6px 6px", letterSpacing: "0.1em",
      }}>
        {rank === 1 ? "MÁS BARATA" : `#${rank}`}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>{store.emoji}</span>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: "700", fontSize: "14px", color: "#e8e8e8" }}>{store.name}</div>
            <div style={{ display: "flex", gap: "8px", marginTop: "3px" }}>
              <span style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#555" }}>📍 {store.dist}km</span>
              {isCheapest && <span style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#C8FF57" }}>💰 MÁS BARATA</span>}
              {isClosest && <span style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#57C8FF" }}>🏃 MÁS CERCA</span>}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: "700", fontSize: "20px", color: store.color }}>
            ${store.total.toLocaleString("es-AR")}
          </div>
          <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#555" }}>
            ${store.perServing.toLocaleString("es-AR")}/porción
          </div>
        </div>
      </div>

      {/* Savings bar */}
      {savings > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#555" }}>Ahorro vs. más caro</span>
            <span style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#C8FF57" }}>-{savingsPct}% | ${savings.toLocaleString("es-AR")}</span>
          </div>
          <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
            <div style={{
              height: "100%", width: `${savingsPct}%`,
              background: "linear-gradient(90deg, #C8FF57, #57FFC8)",
              borderRadius: "2px", transition: "width 0.6s ease",
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeFilterCard({ recipe, fits, budget, animKey }) {
  const cheapest = recipe.storeResults[0];

  return (
    <div
      key={animKey}
      style={{
        background: fits ? "rgba(200,255,87,0.05)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${fits ? "rgba(200,255,87,0.2)" : "rgba(255,255,255,0.05)"}`,
        borderRadius: "14px", padding: "18px 20px",
        display: "flex", alignItems: "center", gap: "16px",
        opacity: fits ? 1 : 0.4,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: fits ? "scale(1)" : "scale(0.98)",
        filter: fits ? "none" : "grayscale(60%)",
      }}
    >
      <span style={{ fontSize: "28px", flexShrink: 0 }}>{recipe.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: "700", fontSize: "14px", color: fits ? "#e8e8e8" : "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {recipe.name}
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#666" }}>{recipe.calories} kcal</span>
          <span style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#666" }}>{recipe.prepTime}</span>
          {recipe.tags.map(t => (
            <span key={t} style={{ fontSize: "9px", fontFamily: "'DM Mono', monospace", color: fits ? "#888" : "#444", background: "rgba(255,255,255,0.04)", padding: "1px 6px", borderRadius: "10px" }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: "700", fontSize: "16px", color: fits ? "#C8FF57" : "#555" }}>
          ${cheapest.total.toLocaleString("es-AR")}
        </div>
        <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#555" }}>
          desde {cheapest.name.split(" ")[0]}
        </div>
        {fits ? (
          <div style={{ fontSize: "9px", fontFamily: "'DM Mono', monospace", color: "#C8FF57", marginTop: "3px" }}>✓ ENTRA</div>
        ) : (
          <div style={{ fontSize: "9px", fontFamily: "'DM Mono', monospace", color: "#ff4444", marginTop: "3px" }}>
            +${(cheapest.total - budget).toLocaleString("es-AR")} extra
          </div>
        )}
      </div>
    </div>
  );
}

function CostBreakdownTable({ ingredients, stores }) {
  const [selectedStore, setSelectedStore] = useState(stores[0]?.id);
  const store = stores.find(s => s.id === selectedStore) || stores[0];

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", overflow: "hidden" }}>
      {/* Store selector tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
        {stores.slice(0, 4).map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedStore(s.id)}
            style={{
              flex: "0 0 auto", padding: "10px 16px",
              background: selectedStore === s.id ? "rgba(255,255,255,0.04)" : "transparent",
              border: "none", borderBottom: `2px solid ${selectedStore === s.id ? s.color : "transparent"}`,
              color: selectedStore === s.id ? s.color : "#555",
              fontFamily: "'DM Mono', monospace", fontSize: "11px",
              cursor: "pointer", transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
          >
            {s.emoji} {s.chain}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 70px 80px", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {["Ingrediente", "Cantidad", "Precio/u", "Subtotal"].map(h => (
          <span key={h} style={{ fontSize: "9px", fontFamily: "'DM Mono', monospace", color: "#444", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      {store.breakdown.map((item, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 70px 80px", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <span style={{ fontSize: "13px", color: "#ccc" }}>{item.name}</span>
          <span style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#666" }}>{item.amount}</span>
          <span style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#555" }}>{item.unitLabel}</span>
          <span style={{ fontSize: "13px", fontFamily: "'DM Mono', monospace", color: "#e8e8e8" }}>${item.total.toLocaleString("es-AR")}</span>
        </div>
      ))}

      {/* Total */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 70px 80px", padding: "14px 16px", background: "rgba(200,255,87,0.04)", borderTop: "1px solid rgba(200,255,87,0.15)" }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: "800", fontSize: "13px", color: "#e8e8e8", gridColumn: "1 / 4" }}>TOTAL RECETA</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: "700", fontSize: "16px", color: "#C8FF57" }}>${store.total.toLocaleString("es-AR")}</span>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function MiBolsillo() {
  const [activeTab, setActiveTab] = useState("bolsillo"); // bolsillo | recetas | map
  const [budget, setBudget] = useState(6000);
  const [selectedRecipe, setSelectedRecipe] = useState(RECIPES_WITH_COSTS[0]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | locating | found | denied
  const [userCoords, setUserCoords] = useState(null);
  const [cart, cartDispatch] = useReducer(cartReducer, []);
  const [budgetAnimKey, setBudgetAnimKey] = useState(0);

  const storesForRecipe = selectedRecipe.storeResults;
  const cheapestStore = storesForRecipe[0];
  const closestStore = [...storesForRecipe].sort((a, b) => a.dist - b.dist)[0];

  const fittingRecipes = RECIPES_WITH_COSTS.filter(r => r.baseCost <= budget);
  const maxCostInSet = Math.max(...storesForRecipe.map(s => s.total));

  const handleBudgetChange = (v) => {
    setBudget(v);
    setBudgetAnimKey(k => k + 1);
  };

  const handleGeolocate = () => {
    setLocating(true);
    setLocationStatus("locating");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationStatus("found");
          setLocating(false);
        },
        () => {
          // Fallback to Buenos Aires
          setUserCoords({ lat: -34.5901, lng: -58.4195 });
          setLocationStatus("found");
          setLocating(false);
        },
        { timeout: 5000 }
      );
    } else {
      setUserCoords({ lat: -34.5901, lng: -58.4195 });
      setLocationStatus("found");
      setLocating(false);
    }
  };

  const tabs = [
    { id: "bolsillo", label: "Mi Bolsillo", icon: "💰" },
    { id: "recetas", label: "Recetas Filtradas", icon: "🍽️" },
    { id: "mapa", label: "Mapa de Tiendas", icon: "🗺️" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060809; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes scanline { from { background-position: 0 0; } to { background-position: 0 100%; } }
        @keyframes ripple { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes filterIn { from { opacity: 0; transform: translateX(-8px) scale(0.98); } to { opacity: 1; transform: translateX(0) scale(1); } }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#060809", color: "#e8e8e8", fontFamily: "'Syne', sans-serif", padding: "0 0 80px" }}>

        {/* ── TOP HEADER ── */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(6,8,9,0.95)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>⚡</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px", letterSpacing: "0.06em" }}>
                  Fit<span style={{ color: "#C8FF57" }}>Check</span>
                  <span style={{ color: "#444", marginLeft: "8px" }}>/ Mi Bolsillo</span>
                </span>
              </div>
              <button
                onClick={handleGeolocate}
                disabled={locating}
                style={{
                  background: locationStatus === "found" ? "rgba(200,255,87,0.1)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${locationStatus === "found" ? "rgba(200,255,87,0.3)" : "rgba(255,255,255,0.1)"}`,
                  color: locationStatus === "found" ? "#C8FF57" : "#888",
                  borderRadius: "20px", padding: "7px 14px",
                  fontFamily: "'DM Mono', monospace", fontSize: "11px",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "7px",
                  transition: "all 0.3s ease",
                }}
              >
                <span style={{ animation: locating ? "pulse 1s ease infinite" : "none" }}>
                  {locationStatus === "found" ? "✓" : "📍"}
                </span>
                {locationStatus === "found" ? "Ubicación activa" : locating ? "Localizando..." : "Activar GPS"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px 0" }}>

          {/* ── BUDGET HERO ── */}
          <div style={{ marginBottom: "40px", animation: "fadeUp 0.5s ease both" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "6px" }}>
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "#555", textTransform: "uppercase", marginBottom: "8px" }}>Presupuesto Máximo</p>
                <div style={{ fontSize: "clamp(42px, 7vw, 68px)", fontWeight: "800", letterSpacing: "-0.04em", lineHeight: 1, color: "#f0f0f0" }}>
                  $<AnimatedNumber value={budget} />
                  <span style={{ fontSize: "0.3em", color: "#555", marginLeft: "8px", letterSpacing: "0.05em" }}>ARS</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#C8FF57" }}>
                  {fittingRecipes.length} de {RECIPES_WITH_COSTS.length} recetas
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#555" }}>
                  se ajustan a tu presupuesto
                </div>
              </div>
            </div>
            <BudgetSlider value={budget} onChange={handleBudgetChange} />
          </div>

          {/* ── SUMMARY CHIPS ── */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "32px", animation: "fadeUp 0.5s 0.1s ease both" }}>
            {[
              { label: "Más barata", value: `$${cheapestStore?.total?.toLocaleString("es-AR")}`, sub: cheapestStore?.name, color: "#C8FF57" },
              { label: "Más cerca", value: `${closestStore?.dist}km`, sub: closestStore?.name, color: "#57C8FF" },
              { label: "Por porción", value: `$${cheapestStore?.perServing?.toLocaleString("es-AR")}`, sub: "2 porciones", color: "#FF8C57" },
              { label: "Ahorro máx.", value: `$${(maxCostInSet - cheapestStore?.total)?.toLocaleString("es-AR")}`, sub: "vs. tienda cara", color: "#C857FF" },
            ].map(chip => (
              <div key={chip.label} style={{
                flex: "1 1 140px",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${chip.color}20`,
                borderRadius: "12px", padding: "14px 16px",
              }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px" }}>{chip.label}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: "700", fontSize: "20px", color: chip.color }}>{chip.value}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#555", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chip.sub}</div>
              </div>
            ))}
          </div>

          {/* ── RECIPE SELECTOR ── */}
          <div style={{ marginBottom: "32px", animation: "fadeUp 0.5s 0.15s ease both" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", color: "#555", textTransform: "uppercase", marginBottom: "12px" }}>Calcular para:</p>
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
              {RECIPES_WITH_COSTS.map(r => (
                <button
                  key={r.id}
                  onClick={() => { setSelectedRecipe(r); setSelectedStore(null); }}
                  style={{
                    flex: "0 0 auto",
                    background: selectedRecipe.id === r.id ? "rgba(200,255,87,0.1)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedRecipe.id === r.id ? "rgba(200,255,87,0.4)" : "rgba(255,255,255,0.07)"}`,
                    color: selectedRecipe.id === r.id ? "#C8FF57" : "#888",
                    borderRadius: "20px", padding: "8px 14px",
                    fontFamily: "'Syne', sans-serif", fontWeight: "700", fontSize: "12px",
                    cursor: "pointer", transition: "all 0.2s ease",
                    display: "flex", alignItems: "center", gap: "6px",
                  }}
                >
                  <span>{r.emoji}</span>
                  <span style={{ whiteSpace: "nowrap" }}>{r.name.split(" ").slice(0, 2).join(" ")}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── TABS ── */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "28px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "4px", animation: "fadeUp 0.5s 0.2s ease both" }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: "10px 8px",
                  background: activeTab === tab.id ? "rgba(255,255,255,0.07)" : "transparent",
                  border: "none", borderRadius: "9px",
                  color: activeTab === tab.id ? "#e8e8e8" : "#555",
                  fontFamily: "'Syne', sans-serif", fontWeight: "700", fontSize: "12px",
                  cursor: "pointer", transition: "all 0.2s ease",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                }}
              >
                <span>{tab.icon}</span>
                <span style={{ display: "none", "@media (minWidth: 480px)": { display: "inline" } }}>{tab.label}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── TAB: MI BOLSILLO ── */}
          {activeTab === "bolsillo" && (
            <div style={{ animation: "fadeUp 0.4s ease both" }}>
              {/* Stores list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
                {storesForRecipe.map((store, i) => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    rank={i + 1}
                    isSelected={selectedStore?.id === store.id}
                    isCheapest={i === 0}
                    isClosest={closestStore?.id === store.id}
                    maxCost={maxCostInSet}
                    onClick={() => setSelectedStore(s => s?.id === store.id ? null : store)}
                  />
                ))}
              </div>

              {/* Cost Breakdown */}
              <div style={{ marginBottom: "12px" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", color: "#555", textTransform: "uppercase", marginBottom: "14px" }}>
                  Desglose por Ingrediente
                </p>
                <CostBreakdownTable
                  ingredients={selectedRecipe.ingredients}
                  stores={storesForRecipe}
                />
              </div>
            </div>
          )}

          {/* ── TAB: RECETAS FILTRADAS ── */}
          {activeTab === "recetas" && (
            <div style={{ animation: "fadeUp 0.4s ease both" }}>
              <div style={{
                background: fittingRecipes.length === 0 ? "rgba(255,68,68,0.05)" : "rgba(200,255,87,0.05)",
                border: `1px solid ${fittingRecipes.length === 0 ? "rgba(255,68,68,0.2)" : "rgba(200,255,87,0.15)"}`,
                borderRadius: "12px", padding: "14px 18px", marginBottom: "20px",
                display: "flex", alignItems: "center", gap: "12px",
              }}>
                <span style={{ fontSize: "20px" }}>{fittingRecipes.length === 0 ? "❌" : "✅"}</span>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: "700", fontSize: "13px", color: "#e8e8e8" }}>
                    {fittingRecipes.length === 0
                      ? "Ninguna receta entra en el presupuesto"
                      : `${fittingRecipes.length} receta${fittingRecipes.length > 1 ? "s" : ""} dentro del presupuesto`}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#666", marginTop: "2px" }}>
                    Presupuesto: ${budget.toLocaleString("es-AR")} ARS · Precios desde {cheapestStore?.chain}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {RECIPES_WITH_COSTS
                  .sort((a, b) => (a.baseCost <= budget ? -1 : 1) - (b.baseCost <= budget ? -1 : 1))
                  .map((recipe, i) => (
                    <div key={`${recipe.id}-${budgetAnimKey}`} style={{ animation: `filterIn 0.3s ${i * 0.05}s ease both` }}>
                      <RecipeFilterCard
                        recipe={recipe}
                        fits={recipe.baseCost <= budget}
                        budget={budget}
                        animKey={budgetAnimKey}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── TAB: MAPA ── */}
          {activeTab === "mapa" && (
            <div style={{ animation: "fadeUp 0.4s ease both" }}>
              {locationStatus !== "found" && (
                <div style={{
                  background: "rgba(200,255,87,0.05)", border: "1px solid rgba(200,255,87,0.15)",
                  borderRadius: "12px", padding: "14px 18px", marginBottom: "20px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>📍</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#888" }}>Activar GPS para ver tiendas reales cercanas</span>
                  </div>
                  <button
                    onClick={handleGeolocate}
                    style={{ background: "#C8FF57", color: "#000", border: "none", borderRadius: "8px", padding: "8px 14px", fontFamily: "'Syne', sans-serif", fontWeight: "800", fontSize: "11px", cursor: "pointer" }}
                  >
                    ACTIVAR
                  </button>
                </div>
              )}

              <MapView
                stores={storesForRecipe}
                selectedStore={selectedStore}
                onSelectStore={s => setSelectedStore(prev => prev?.id === s.id ? null : s)}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px" }}>
                {storesForRecipe.map(store => (
                  <div
                    key={store.id}
                    onClick={() => setSelectedStore(s => s?.id === store.id ? null : store)}
                    style={{
                      background: selectedStore?.id === store.id ? `${store.color}15` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${selectedStore?.id === store.id ? store.color + "50" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: "12px", padding: "12px 14px",
                      cursor: "pointer", transition: "all 0.2s ease",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>{store.emoji}</span>
                      <div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: "700", fontSize: "12px", color: "#e8e8e8" }}>{store.chain}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#555" }}>{store.dist}km</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: "700", fontSize: "14px", color: store.color }}>
                      ${store.total.toLocaleString("es-AR")}
                    </div>
                  </div>
                ))}
              </div>

              {selectedStore && (
                <div style={{
                  marginTop: "16px", background: `${selectedStore.color}0d`,
                  border: `1px solid ${selectedStore.color}30`,
                  borderRadius: "14px", padding: "18px 20px",
                  animation: "fadeUp 0.3s ease both",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                    <span style={{ fontSize: "24px" }}>{selectedStore.emoji}</span>
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: "800", fontSize: "16px", color: "#e8e8e8" }}>{selectedStore.name}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#666" }}>
                        {selectedStore.dist}km · {selectedStore.available ? "✓ Abierto" : "✗ Cerrado"}
                      </div>
                    </div>
                    <div style={{ marginLeft: "auto", fontFamily: "'DM Mono', monospace", fontWeight: "700", fontSize: "22px", color: selectedStore.color }}>
                      ${selectedStore.total.toLocaleString("es-AR")}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      selectedRecipe.ingredients.forEach(ing =>
                        cartDispatch({ type: "ADD", item: { ...ing, store: selectedStore.name, recipe: selectedRecipe.name } })
                      );
                    }}
                    style={{
                      width: "100%", background: selectedStore.color,
                      color: "#000", border: "none", borderRadius: "10px",
                      padding: "12px", fontFamily: "'Syne', sans-serif", fontWeight: "800",
                      fontSize: "13px", letterSpacing: "0.06em", cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={e => e.target.style.opacity = "0.9"}
                    onMouseLeave={e => e.target.style.opacity = "1"}
                  >
                    AGREGAR TODOS A LISTA DE COMPRAS
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FLOATING CART ── */}
        {cart.length > 0 && (
          <div style={{
            position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
            background: "#C8FF57", color: "#000",
            borderRadius: "50px", padding: "14px 24px",
            fontFamily: "'Syne', sans-serif", fontWeight: "800", fontSize: "13px",
            display: "flex", alignItems: "center", gap: "10px",
            boxShadow: "0 8px 32px rgba(200,255,87,0.35)",
            zIndex: 100, cursor: "pointer",
            animation: "fadeUp 0.3s ease both",
          }}>
            <span>🛒</span>
            <span>{cart.length} ingredientes en lista</span>
            <span style={{ background: "#000", color: "#C8FF57", borderRadius: "50px", padding: "2px 10px", fontSize: "12px" }}>
              ${cart.reduce((s, i) => {
                const k = i.name.toLowerCase();
                const p = INGREDIENT_PRICES_DB[k] || INGREDIENT_PRICES_DB["default"];
                return s + Math.round((i.grams / 100) * p.per100g);
              }, 0).toLocaleString("es-AR")}
            </span>
            <button onClick={() => cartDispatch({ type: "CLEAR" })}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", marginLeft: "4px" }}>×</button>
          </div>
        )}
      </div>
    </>
  );
}
