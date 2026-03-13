'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

export interface Task {
  id: string;
  label: string;
  done: number;
  total: number;
  status: 'running' | 'done' | 'error' | 'stopped';
  startedAt: number;
  error?: string;
}

interface TaskManagerCtx {
  tasks: Task[];
  addTask: (id: string, label: string, total: number) => void;
  updateTask: (id: string, done: number, label?: string) => void;
  finishTask: (id: string, status?: 'done' | 'error' | 'stopped', error?: string) => void;
  removeTask: (id: string) => void;
}

const Ctx = createContext<TaskManagerCtx>({
  tasks: [],
  addTask: () => {},
  updateTask: () => {},
  finishTask: () => {},
  removeTask: () => {},
});

export function useTaskManager() {
  return useContext(Ctx);
}

export function TaskManagerProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = tasks;

  const addTask = useCallback((id: string, label: string, total: number) => {
    setTasks(prev => {
      const existing = prev.find(t => t.id === id);
      if (existing) {
        return prev.map(t => t.id === id ? { ...t, label, total, done: 0, status: 'running' as const, startedAt: Date.now() } : t);
      }
      return [...prev, { id, label, done: 0, total, status: 'running' as const, startedAt: Date.now() }];
    });
  }, []);

  const updateTask = useCallback((id: string, done: number, label?: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done, ...(label ? { label } : {}) } : t));
  }, []);

  const finishTask = useCallback((id: string, status: 'done' | 'error' | 'stopped' = 'done', error?: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, error, done: status === 'done' ? t.total : t.done } : t));
    setTimeout(() => {
      setTasks(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ tasks, addTask, updateTask, finishTask, removeTask }}>
      {children}
    </Ctx.Provider>
  );
}
