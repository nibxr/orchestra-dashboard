import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Hash, User, Calendar, Briefcase } from 'lucide-react';
import { Avatar } from './Shared';

export const SearchModal = ({ isOpen, onClose, tasks, onSelectTask, userRole }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchLower = query.toLowerCase();
    const filtered = tasks.filter(task => {
      const titleMatch = task.title?.toLowerCase().includes(searchLower);
      const descriptionMatch = task.description?.toLowerCase().includes(searchLower);
      const clientMatch = task.clientName?.toLowerCase().includes(searchLower);
      const assigneeMatch = task.assigneeName?.toLowerCase().includes(searchLower);
      const statusMatch = task.status?.toLowerCase().includes(searchLower);
      const idMatch = task.orchestra_task_id?.toLowerCase().includes(searchLower);

      return titleMatch || descriptionMatch || clientMatch || assigneeMatch || statusMatch || idMatch;
    });

    setResults(filtered.slice(0, 10)); // Limit to 10 results
  }, [query, tasks]);

  const handleSelectTask = (task) => {
    onSelectTask(task);
    onClose();
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
      setQuery('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <Search size={20} className="text-neutral-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={userRole === 'customer' ? "Search your requests by title, status, or ID..." : "Search tasks by title, client, assignee, or ID..."}
            className="flex-1 bg-transparent text-neutral-900 dark:text-white text-base placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {query && results.length === 0 && (
            <div className="px-6 py-12 text-center text-neutral-500">
              <Search size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">No tasks found for "{query}"</p>
            </div>
          )}

          {!query && (
            <div className="px-6 py-12 text-center text-neutral-600">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm">Start typing to search tasks...</p>
              <p className="text-xs mt-2 text-neutral-700">
                Search by title, description, client, assignee, status, or ID
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleSelectTask(task)}
                  className="w-full px-6 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-left group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-neutral-900 dark:text-white font-medium text-sm group-hover:text-lime-400 transition-colors truncate">
                          {task.title}
                        </h3>
                        {task.orchestra_task_id && (
                          <span className="text-neutral-600 text-xs font-mono flex items-center gap-1 shrink-0">
                            <Hash size={10} />
                            {task.orchestra_task_id.slice(-4)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        {task.clientName && (
                          <div className="flex items-center gap-1">
                            <Briefcase size={12} />
                            <span>{task.clientName}</span>
                          </div>
                        )}
                        {task.assigneeName && (
                          <div className="flex items-center gap-1">
                            <User size={12} />
                            <span>{task.assigneeName}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-neutral-600 text-xs mt-1 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      <span className="inline-flex px-2 py-1 rounded text-xs bg-neutral-200 dark:bg-neutral-800 text-neutral-400 border border-neutral-300 dark:border-neutral-700">
                        {task.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#141414] flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-neutral-600">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded text-[10px] border border-neutral-300 dark:border-neutral-700">ESC</kbd>
              <span>to close</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded text-[10px] border border-neutral-300 dark:border-neutral-700">↵</kbd>
              <span>to open</span>
            </div>
          </div>
          <span className="text-xs text-neutral-600">
            {results.length > 0 && `${results.length} result${results.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>
    </div>
  );
};
