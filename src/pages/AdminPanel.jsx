import React, { useState } from "react";
import { Users, Package, ShoppingBag, Megaphone } from "lucide-react";
import UserManagement from "../components/UserManagement";
import ClothingManagement from "../components/ClothingManagement";
import OrderManagement from "../components/OrderManagement";
import StoreManagement from "../components/StoreManagement";
import "../styles/AdminPanel.css";

const TABS = [
  { key: "users",    label: "Users",      icon: <Users size={16} /> },
  { key: "clothing", label: "Products",   icon: <Package size={16} /> },
  { key: "orders",   label: "All Orders", icon: <ShoppingBag size={16} /> },
  { key: "store",    label: "Store",      icon: <Megaphone size={16} /> },
];

const AdminPanel = () => {
  const [active, setActive] = useState("users");

  return (
    <div className="ap-page">
      <div className="ap-wrap">

        <div className="ap-header">
          <div className="ap-header-left">
            <img src="/urban-bangla-logo.png" alt="URBAN বাংলা logo" className="ap-logo" />
            <div>
              <h1 className="ap-title">Admin Panel</h1>
              <p className="ap-sub">URBAN বাংলা Dashboard</p>
            </div>
          </div>
          <div className="ap-live-pill">
            <span className="ap-live-dot" />
            Live
          </div>
        </div>

        <div className="ap-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`ap-tab ${active === t.key ? "active" : ""}`}
              onClick={() => setActive(t.key)}
            >
              <span className="ap-tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="ap-body">
          {active === "users"    && <UserManagement />}
          {active === "clothing" && <ClothingManagement />}
          {active === "orders"   && <OrderManagement />}
          {active === "store"    && <StoreManagement />}
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;
