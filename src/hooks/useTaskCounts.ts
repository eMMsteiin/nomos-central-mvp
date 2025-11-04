import { useState, useEffect } from "react";

interface TaskCounts {
  entrada: number;
  hoje: number;
  "primeiros-passos": number;
}

const STORAGE_KEY = "nomos.tasks.today";

export const useTaskCounts = () => {
  const [counts, setCounts] = useState<TaskCounts>({
    entrada: 0,
    hoje: 0,
    "primeiros-passos": 0,
  });

  useEffect(() => {
    const updateCounts = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const tasks = JSON.parse(stored);
          const taskCount = Array.isArray(tasks) ? tasks.filter((t: any) => !t.completed).length : 0;
          
          setCounts({
            entrada: taskCount,
            hoje: taskCount,
            "primeiros-passos": 14, // Mock count
          });
        }
      } catch (error) {
        console.error("Error reading task counts:", error);
      }
    };

    updateCounts();
    
    // Listen for storage changes
    window.addEventListener("storage", updateCounts);
    
    // Custom event for same-tab updates
    const handleTaskUpdate = () => updateCounts();
    window.addEventListener("tasksUpdated", handleTaskUpdate);

    return () => {
      window.removeEventListener("storage", updateCounts);
      window.removeEventListener("tasksUpdated", handleTaskUpdate);
    };
  }, []);

  return counts;
};
