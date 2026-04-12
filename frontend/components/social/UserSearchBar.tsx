"use client";
import { useState, useEffect, useRef } from "react";
import { searchUsers } from "@/lib/api";
import { User } from "@/lib/types";
import { useBackendToken } from "@/hooks/use-api";
import { UserCard } from "./UserCard";
import { LoadingSpinner } from "../shared/LoadingSpinner";

export function UserSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const token = useBackendToken();

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await searchUsers(query, token);
        setResults(data.slice(0, 8));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative z-50 w-full max-w-sm" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search users..."
        className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
      />
      <svg className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>

      {open && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-4 flex justify-center"><LoadingSpinner /></div>
          ) : results.length > 0 ? (
            results.map((u) => <UserCard key={u.id} user={u} />)
          ) : (
             <div className="p-4 text-center text-sm text-zinc-500">No users found</div>
          )}
        </div>
      )}
    </div>
  );
}
