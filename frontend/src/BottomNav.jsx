import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, BarChart2, User } from "lucide-react"; // 👈 icone lucide
import "./App.css";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/", label: "HOME", icon: Home },
    { path: "/stats", label: "STATISTICHE", icon: BarChart2 },
    { path: "/settings", label: "PROFILO", icon: User },
  ];

  return (
    <div className="bottom-bar">
      {navItems.map(({ path, label, icon: Icon }) => (
        <button
          key={path}
          className={`btn-icon ${location.pathname === path ? "active" : ""}`}
          onClick={() => navigate(path)}
        >
          <Icon size={24} strokeWidth={2} />
          <span className="btn-label">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default BottomNav;
