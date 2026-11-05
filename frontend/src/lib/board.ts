export type Task = {
  id: string;
  title: string;
  details: string;
};

export type Column = {
  id: string;
  name: string;
  tasks: Task[];
};

export type Board = {
  columns: Column[];
};

export const initialBoard: Board = {
  columns: [
    {
      id: "ideas",
      name: "New arrangements",
      tasks: [
        { id: "task-1", title: "Initial family meeting", details: "Gather service preferences and confirm the primary family contact." },
        { id: "task-2", title: "Arrange transfer", details: "Confirm collection time and destination with the care team." },
      ],
    },
    {
      id: "planned",
      name: "Planned",
      tasks: [
        { id: "task-3", title: "Confirm service venue", details: "Reserve the chosen venue and verify access details." },
        { id: "task-4", title: "Prepare service outline", details: "Record readings, music, speakers, and family preferences." },
      ],
    },
    {
      id: "in-progress",
      name: "In progress",
      tasks: [
        { id: "task-5", title: "Coordinate floral arrangements", details: "Confirm selections and delivery details with the family." },
        { id: "task-6", title: "Prepare memorial materials", details: "Assemble the approved order of service and photographs." },
      ],
    },
    {
      id: "review",
      name: "Awaiting review",
      tasks: [
        { id: "task-7", title: "Review service details", details: "Check names, timings, and approved arrangements." },
      ],
    },
    {
      id: "done",
      name: "Complete",
      tasks: [
        { id: "task-8", title: "File service documentation", details: "Confirm required records are complete and securely filed." },
      ],
    },
  ],
};

export function moveTask(board: Board, taskId: string, destinationId: string, overTaskId?: string): Board {
  const source = board.columns.find((column) => column.tasks.some((task) => task.id === taskId));
  const destination = board.columns.find((column) => column.id === destinationId);
  if (!source || !destination) return board;

  const taskIndex = source.tasks.findIndex((item) => item.id === taskId);
  const task = source.tasks[taskIndex];
  if (!task) return board;

  if (source.id === destination.id) {
    const targetIndex = destination.tasks.findIndex((item) => item.id === overTaskId);
    if (targetIndex < 0 || targetIndex === taskIndex) return board;
    const tasks = [...source.tasks];
    tasks.splice(targetIndex, 0, tasks.splice(taskIndex, 1)[0]);
    return {
      columns: board.columns.map((column) => column.id === source.id ? { ...column, tasks } : column),
    };
  }

  const destinationTasks = [...destination.tasks];
  const targetIndex = destinationTasks.findIndex((item) => item.id === overTaskId);
  destinationTasks.splice(targetIndex < 0 ? destinationTasks.length : targetIndex, 0, task);

  return {
    columns: board.columns.map((column) => {
      if (column.id === source.id) return { ...column, tasks: column.tasks.filter((item) => item.id !== taskId) };
      if (column.id === destination.id) return { ...column, tasks: destinationTasks };
      return column;
    }),
  };
}

export function addTask(board: Board, columnId: string, task: Omit<Task, "id">): Board {
  return {
    columns: board.columns.map((column) => column.id === columnId
      ? { ...column, tasks: [...column.tasks, { ...task, id: crypto.randomUUID() }] }
      : column),
  };
}

export function deleteTask(board: Board, taskId: string): Board {
  return {
    columns: board.columns.map((column) => ({
      ...column,
      tasks: column.tasks.filter((task) => task.id !== taskId),
    })),
  };
}

export function renameColumn(board: Board, columnId: string, name: string): Board {
  const trimmedName = name.trim();
  if (!trimmedName) return board;
  return {
    columns: board.columns.map((column) => column.id === columnId ? { ...column, name: trimmedName } : column),
  };
}