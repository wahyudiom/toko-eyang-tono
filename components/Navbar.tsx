"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, History, LogOut, Store } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

interface NavbarProps {
  namaUser: string;
  role: "owner" | "kasir" | "gudang";
}

const navItems = {
  owner: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/stock", label: "Stok Barang", icon: Package },
    { href: "/kasir", label: "Kasir", icon: ShoppingCart },
    { href: "/histori", label: "Histori", icon: History },
  ],
  gudang: [
    { href: "/stock", label: "Stok Barang", icon: Package },
    { href: "/histori", label: "Histori", icon: History },
  ],
  kasir: [
    { href: "/kasir", label: "Kasir", icon: ShoppingCart },
  ],
};

const roleLabel = {
  owner: "Owner",
  gudang: "Gudang",
  kasir: "Kasir",
};

export default function Navbar({ namaUser, role }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const items = navItems[role] || [];

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Store size={20} className="text-blue-600" />
            <span className="font-semibold text-gray-900 text-sm">
              Toko Kalimantan
            </span>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User + Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-gray-900">{namaUser}</p>
              <p className="text-xs text-gray-400">{roleLabel[role]}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 px-2 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm"
              title="Keluar"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
