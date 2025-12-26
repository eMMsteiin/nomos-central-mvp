import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SubTask } from '@/types/task';

interface SubtaskListProps {
  subtasks: SubTask[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onReorder: (subtasks: SubTask[]) => void;
}

export function SubtaskList({
  subtasks,
  onAdd,
  onToggle,
  onUpdateText,
  onDelete,
  onReorder,
}: SubtaskListProps) {
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = () => {
    if (!newSubtaskText.trim()) return;
    onAdd(newSubtaskText.trim());
    setNewSubtaskText('');
    setIsAdding(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewSubtaskText('');
    }
  };

  const handleStartEdit = (subtask: SubTask) => {
    setEditingId(subtask.id);
    setEditText(subtask.text);
  };

  const handleSaveEdit = (id: string) => {
    if (editText.trim()) {
      onUpdateText(id, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  };

  const handleEditKeyPress = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditText('');
    }
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const progress = subtasks.length > 0 
    ? Math.round((completedCount / subtasks.length) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-foreground">Subtarefas</h3>
          {subtasks.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {completedCount}/{subtasks.length}
            </span>
          )}
        </div>
        
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {subtasks.map((subtask) => (
            <motion.div
              key={subtask.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="group flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
              
              <Checkbox
                checked={subtask.completed}
                onCheckedChange={() => onToggle(subtask.id)}
              />
              
              {editingId === subtask.id ? (
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => handleSaveEdit(subtask.id)}
                  onKeyDown={(e) => handleEditKeyPress(e, subtask.id)}
                  className="flex-1 h-8 text-sm"
                  autoFocus
                />
              ) : (
                <span
                  onClick={() => handleStartEdit(subtask)}
                  className={`flex-1 text-sm cursor-pointer ${
                    subtask.completed 
                      ? 'line-through text-muted-foreground' 
                      : 'text-foreground'
                  }`}
                >
                  {subtask.text}
                </span>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(subtask.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add new subtask input */}
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 py-2 px-2"
          >
            <div className="w-4" />
            <Checkbox disabled className="opacity-50" />
            <Input
              value={newSubtaskText}
              onChange={(e) => setNewSubtaskText(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={() => {
                if (!newSubtaskText.trim()) {
                  setIsAdding(false);
                }
              }}
              placeholder="Nova subtarefa..."
              className="flex-1 h-8 text-sm"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAdd}
              disabled={!newSubtaskText.trim()}
            >
              Salvar
            </Button>
          </motion.div>
        )}
      </div>

      {/* Empty state */}
      {subtasks.length === 0 && !isAdding && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <p>Nenhuma subtarefa ainda.</p>
          <p className="text-xs mt-1">Divida sua tarefa em etapas menores!</p>
        </div>
      )}
    </div>
  );
}
