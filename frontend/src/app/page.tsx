"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, Grip, Plus, Trash2, X } from "lucide-react";
import {
  addTask,
  deleteTask,
  initialBoard,
  moveTask,
  renameColumn,
  type Board,
  type Column,
  type Task,
} from "@/lib/board";

const PLANNED_COLUMN_ID = "planned";
const IN_PROGRESS_COLUMN_ID = "in-progress";
const PLANNED_DELAY_MS = 10_000;

export default function Home() {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTaskWidth, setActiveTaskWidth] = useState<number | null>(null);
  const [pendingAdvances, setPendingAdvances] = useState<Set<string>>(new Set());
  const advanceTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => () => {
    advanceTimers.current.forEach((timer) => clearTimeout(timer));
  }, []);

  function clearAdvance(taskId: string) {
    const timer = advanceTimers.current.get(taskId);
    if (timer !== undefined) {
      clearTimeout(timer);
      advanceTimers.current.delete(taskId);
    }
    setPendingAdvances((current) => {
      if (!current.has(taskId)) return current;
      const next = new Set(current);
      next.delete(taskId);
      return next;
    });
  }

  function scheduleAdvance(taskId: string) {
    clearAdvance(taskId);
    setPendingAdvances((current) => new Set(current).add(taskId));
    const timer = setTimeout(() => {
      advanceTimers.current.delete(taskId);
      setBoard((current) => {
        const stillPlanned = current.columns
          .find((column) => column.id === PLANNED_COLUMN_ID)
          ?.tasks.some((task) => task.id === taskId);
        return stillPlanned ? moveTask(current, taskId, IN_PROGRESS_COLUMN_ID) : current;
      });
      setPendingAdvances((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }, PLANNED_DELAY_MS);
    advanceTimers.current.set(taskId, timer);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
    setActiveTaskWidth(event.active.rect.current.initial?.width ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);
    setActiveTaskWidth(null);
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);
    const source = board.columns.find((column) => column.tasks.some((task) => task.id === taskId));
    const destination = board.columns.find((column) => column.id === overId)
      ?? board.columns.find((column) => column.tasks.some((task) => task.id === overId));
    if (!source || !destination) return;

    const overTaskId = destination.tasks.some((task) => task.id === overId) ? overId : undefined;
    setBoard((current) => moveTask(current, taskId, destination.id, overTaskId));

    if (destination.id === PLANNED_COLUMN_ID && source.id !== PLANNED_COLUMN_ID) {
      scheduleAdvance(taskId);
    } else if (destination.id !== PLANNED_COLUMN_ID) {
      clearAdvance(taskId);
    }
  }

  function handleDelete(taskId: string) {
    clearAdvance(taskId);
    setBoard((current) => deleteTask(current, taskId));
  }

  function handleAdd(columnId: string, title: string, details: string) {
    setBoard((current) => addTask(current, columnId, { title, details }));
    setAddingTo(null);
  }

  const activeTask = board.columns.flatMap((column) => column.tasks).find((task) => task.id === activeTaskId);

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href="#board" aria-label="Northstar home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>northstar<span className="brand-period">.</span></span>
        </a>
        <div className="topbar-divider" />
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Operations</strong>
        </nav>
      </header>

      <section className="board-shell" id="board" aria-labelledby="board-title">
        <div className="board-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-dot" /> SERVICE BOARD</div>
            <h1 id="board-title">Mortuary operations</h1>
          </div>
          <div className="board-summary" aria-label={`${board.columns.length} stages`}>
            <span className="summary-number">{board.columns.length}</span>
            <span className="summary-label">stages</span>
            <span className="summary-divider" />
            <span className="summary-number">{board.columns.reduce((total, column) => total + column.tasks.length, 0)}</span>
            <span className="summary-label">cards</span>
          </div>
        </div>

        <DndContext
          id="mortuary-operations-board"
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => { setActiveTaskId(null); setActiveTaskWidth(null); }}
        >
          <div className="board" aria-label="Kanban board">
            {board.columns.map((column, index) => (
              <BoardColumn
                key={column.id}
                column={column}
                index={index}
                adding={addingTo === column.id}
                onStartAdd={() => setAddingTo(column.id)}
                onCancelAdd={() => setAddingTo(null)}
                onAdd={(title, details) => handleAdd(column.id, title, details)}
                onRename={(name) => setBoard((current) => renameColumn(current, column.id, name))}
                pendingTaskIds={pendingAdvances}
                onDelete={handleDelete}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeTask && (
              <TaskPreview task={activeTask} pending={pendingAdvances.has(activeTask.id)} width={activeTaskWidth} />
            )}
          </DragOverlay>
        </DndContext>
      </section>
    </main>
  );
}

type BoardColumnProps = {
  column: Column;
  index: number;
  adding: boolean;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onAdd: (title: string, details: string) => void;
  onRename: (name: string) => void;
  pendingTaskIds: ReadonlySet<string>;
  onDelete: (taskId: string) => void;
};

function BoardColumn({
  column,
  index,
  adding,
  onStartAdd,
  onCancelAdd,
  onAdd,
  onRename,
  pendingTaskIds,
  onDelete,
}: BoardColumnProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const cancelledEdit = useRef(false);
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  function saveName() {
    if (cancelledEdit.current) {
      cancelledEdit.current = false;
      setEditing(false);
      return;
    }
    const trimmed = name.trim();
    if (trimmed) onRename(trimmed);
    else setName(column.name);
    setEditing(false);
  }

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") saveName();
    if (event.key === "Escape") {
      cancelledEdit.current = true;
      setName(column.name);
      setEditing(false);
    }
  }

  return (
    <section className={`column column-${index + 1}${isOver ? " column-over" : ""}`} ref={setNodeRef} aria-label={`${column.name}, ${column.tasks.length} cards`}>
      <div className="column-heading">
        <span className="column-indicator" aria-hidden="true" />
        {editing ? (
          <input
            className="column-name-input"
            aria-label="Column name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={saveName}
            onKeyDown={handleNameKeyDown}
            autoFocus
            maxLength={32}
          />
        ) : (
          <button className="column-name" onClick={() => { cancelledEdit.current = false; setName(column.name); setEditing(true); }} title="Rename column">
            {column.name}
          </button>
        )}
        <span className="task-count">{column.tasks.length}</span>
      </div>
      <div className="task-list">
        <SortableContext items={column.tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              pending={pendingTaskIds.has(task.id)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </SortableContext>
        {adding && <AddTaskForm onAdd={onAdd} onCancel={onCancelAdd} />}
      </div>
      {!adding && (
        <button className="add-task-button" onClick={onStartAdd}>
          <Plus size={16} strokeWidth={2} /> <span>Add a card</span>
        </button>
      )}
    </section>
  );
}

function TaskCard({ task, pending, onDelete }: { task: Task; pending: boolean; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article className={`task-card${isDragging ? " task-placeholder" : ""}`} ref={setNodeRef} style={style}>
      <div className="task-card-top">
        <button className="drag-handle" type="button" aria-label={`Move ${task.title}`} title="Drag to move" {...attributes} {...listeners}>
          <Grip className="task-grip" size={15} aria-hidden="true" />
        </button>
        <button
          className="delete-task"
          type="button"
          aria-label={`Delete ${task.title}`}
          title="Delete card"
          onClick={(event) => { event.stopPropagation(); onDelete(); }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <h3>{task.title}</h3>
      <p>{task.details}</p>
      {pending && <span className="task-pending">Moving to In Progress in 10 seconds</span>}
    </article>
  );
}

function TaskPreview({ task, pending, width }: { task: Task; pending: boolean; width: number | null }) {
  return (
    <article className="task-card task-card-overlay" style={{ width: width ?? undefined }} aria-hidden="true">
      <div className="task-card-top"><Grip className="task-grip" size={15} /></div>
      <h3>{task.title}</h3>
      <p>{task.details}</p>
      {pending && <span className="task-pending">Moving to In Progress in 10 seconds</span>}
    </article>
  );
}

function AddTaskForm({ onAdd, onCancel }: { onAdd: (title: string, details: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (trimmedTitle) onAdd(trimmedTitle, details.trim());
  }

  return (
    <form className="add-task-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="new-task-title">Card title</label>
      <input id="new-task-title" placeholder="Card title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus maxLength={80} required />
      <label className="sr-only" htmlFor="new-task-details">Card details</label>
      <textarea id="new-task-details" placeholder="Add a detail…" value={details} onChange={(event) => setDetails(event.target.value)} rows={2} maxLength={240} />
      <div className="form-actions">
        <button className="save-task" type="submit" aria-label="Save card"><Check size={16} /> Add card</button>
        <button className="cancel-task" type="button" aria-label="Cancel adding card" onClick={onCancel}><X size={16} /></button>
      </div>
    </form>
  );
}