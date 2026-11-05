import { describe, expect, it } from "vitest";
import {
  addTask,
  deleteTask,
  initialBoard,
  moveTask,
  renameColumn,
} from "./board";

describe("board operations", () => {
  it("starts with five populated columns", () => {
    expect(initialBoard.columns).toHaveLength(5);
    expect(initialBoard.columns.every((column) => column.tasks.length > 0)).toBe(true);
  });

  it("moves a task between columns without mutating the original board", () => {
    const updated = moveTask(initialBoard, "task-1", "planned");

    expect(updated.columns[0].tasks.some((task) => task.id === "task-1")).toBe(false);
    expect(updated.columns[1].tasks.at(-1)?.id).toBe("task-1");
    expect(initialBoard.columns[0].tasks.some((task) => task.id === "task-1")).toBe(true);
  });

  it("leaves the board unchanged for invalid or same-column moves", () => {
    expect(moveTask(initialBoard, "missing-task", "planned")).toBe(initialBoard);
    expect(moveTask(initialBoard, "task-1", "ideas", "task-1")).toBe(initialBoard);
    expect(moveTask(initialBoard, "task-1", "missing-column")).toBe(initialBoard);
  });

  it("reorders a card within its column", () => {
    const updated = moveTask(initialBoard, "task-1", "ideas", "task-2");

    expect(updated.columns[0].tasks.map((task) => task.id)).toEqual(["task-2", "task-1"]);
    expect(initialBoard.columns[0].tasks.map((task) => task.id)).toEqual(["task-1", "task-2"]);
  });

  it("inserts a moved card before the card it is dropped over", () => {
    const updated = moveTask(initialBoard, "task-1", "planned", "task-4");

    expect(updated.columns[0].tasks.map((task) => task.id)).toEqual(["task-2"]);
    expect(updated.columns[1].tasks.map((task) => task.id)).toEqual(["task-3", "task-1", "task-4"]);
  });

  it("adds a card to the requested column", () => {
    const updated = addTask(initialBoard, "review", { title: "Ship notes", details: "Summarize the release." });
    const newTask = updated.columns[3].tasks.at(-1);

    expect(newTask).toMatchObject({ title: "Ship notes", details: "Summarize the release." });
    expect(newTask?.id).toBeTruthy();
    expect(initialBoard.columns[3].tasks).toHaveLength(1);
  });

  it("deletes a card by id", () => {
    const updated = deleteTask(initialBoard, "task-4");

    expect(updated.columns[1].tasks.some((task) => task.id === "task-4")).toBe(false);
    expect(initialBoard.columns[1].tasks).toHaveLength(2);
  });

  it("renames a column and ignores blank names", () => {
    const updated = renameColumn(initialBoard, "ideas", "  Discovery  ");

    expect(updated.columns[0].name).toBe("Discovery");
    expect(renameColumn(initialBoard, "ideas", "  ")).toBe(initialBoard);
  });
});