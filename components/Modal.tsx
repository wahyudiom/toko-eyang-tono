"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeClass} bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 flex-1">{children}</div>
      </div>
    </div>
  );
}
