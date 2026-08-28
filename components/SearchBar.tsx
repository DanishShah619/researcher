"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, FileText, User, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SearchResultItem {
  id: string;
  title: string;
  year?: number | null;
  type: "Paper" | "Author";
  count?: number;
}

interface SearchBarProps {
  placeholder?: string;
  onSelect?: (item: SearchResultItem) => void;
  autoNavigate?: boolean;
  className?: string;
}

export default function SearchBar({
  placeholder = "Search papers by title or authors by name...",
  onSelect,
  autoNavigate = true,
  className = "",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search fetch
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(
          `/apis/researchpapers/search?q=${encodeURIComponent(query)}&limit=8`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(handler);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = (item: SearchResultItem) => {
    if (onSelect) {
      onSelect(item);
    }
    setIsOpen(false);
    if (autoNavigate) {
      if (item.type === "Paper") {
        router.push(`/papers/${item.id}`);
      } else if (item.type === "Author") {
        router.push(`/authors/${item.id}`);
      }
    }
  };

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-10 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        {isLoading ? (
          <Loader2 className="absolute right-4 h-5 w-5 animate-spin text-slate-400" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3.5 rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in slide-in-from-top-2">
          {results.length === 0 && !isLoading ? (
            <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No matching papers or authors found.
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleItemClick(item)}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {item.type === "Paper" ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                        <FileText className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.type === "Paper"
                          ? `Paper ${item.year ? `(${item.year})` : ""}`
                          : "Author"}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
