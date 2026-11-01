import { runChecks } from "../lib/checks/index.js";

export const checkById = (snapshot, id) =>
  runChecks(snapshot).find((check) => check.id === id);
