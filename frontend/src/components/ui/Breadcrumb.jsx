import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumb({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
      <Link
        to="/"
        className="hover:text-teal-700 transition flex items-center gap-1 text-slate-400 hover:text-slate-700"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {isLast || !item.to ? (
              <span className={`font-semibold ${isLast ? 'text-slate-800' : 'text-slate-500'}`}>
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className="hover:text-teal-700 transition font-medium text-slate-500">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
