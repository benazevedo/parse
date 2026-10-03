const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const {
  addChildSteps,
  completeStepAndLinkedTask,
  completeTaskAndLinkedStep,
  designateNextAction,
  sendNextActionToToday,
  updateProjectStatus,
} = require("../src/store/project-transitions.ts");
const {
  addTaskToToday,
  selectNowTask,
} = require("../src/store/task-transitions.ts");
const { migratePersistedState } = require("../src/store/persistence.ts");

const timestamp = "2026-10-03T12:00:00.000Z";
const completedAt = "2026-10-03T13:00:00.000Z";
const project = {
  id: "project-nursery",
  title: "Finish nursery",
  desiredOutcome: "Nursery is completely ready before the baby arrives.",
  createdAt: timestamp,
  updatedAt: timestamp,
  status: "active",
};

let state = { tasks: [], projects: [project], projectSteps: [] };

let result = addChildSteps(
  state,
  project.id,
  undefined,
  ["Finish south wall"],
  ["south-wall"],
  timestamp,
);
assert.equal(result.ok, true);
state = result;

result = addChildSteps(
  state,
  project.id,
  "south-wall",
  ["Install remaining wainscoting"],
  ["wainscoting"],
  timestamp,
);
assert.equal(result.ok, true);
state = result;

result = addChildSteps(
  state,
  project.id,
  "wainscoting",
  ["Measure final section"],
  ["measure"],
  timestamp,
);
assert.equal(result.ok, true);
state = result;

result = designateNextAction(state, project.id, "south-wall", timestamp);
assert.equal(
  result.ok,
  false,
  "parent with unfinished children cannot be Next Action",
);

result = designateNextAction(state, project.id, "measure", timestamp);
assert.equal(result.ok, true, "leaf step may become Next Action");
state = result;
assert.equal(state.projects[0].nextActionId, "measure");

const forcedParentState = {
  ...state,
  projects: state.projects.map((item) => ({
    ...item,
    nextActionId: "south-wall",
  })),
};
result = sendNextActionToToday(
  forcedParentState,
  project.id,
  "must",
  "invalid-parent-task",
  timestamp,
);
assert.equal(
  result.ok,
  false,
  "parent with unfinished children cannot be sent to Today",
);

result = designateNextAction(state, "different-project", "measure", timestamp);
assert.equal(result.ok, false, "Next Action must belong to the project");

const twoLeafState = {
  tasks: [],
  projects: [{ ...project }],
  projectSteps: [
    {
      id: "leaf-one",
      projectId: project.id,
      title: "First leaf",
      createdAt: timestamp,
      status: "active",
      order: 0,
    },
    {
      id: "leaf-two",
      projectId: project.id,
      title: "Second leaf",
      createdAt: timestamp,
      status: "active",
      order: 1,
    },
  ],
};
let nextResult = designateNextAction(
  twoLeafState,
  project.id,
  "leaf-one",
  timestamp,
);
nextResult = designateNextAction(nextResult, project.id, "leaf-two", timestamp);
assert.equal(nextResult.ok, true);
assert.equal(
  nextResult.projects[0].nextActionId,
  "leaf-two",
  "a project stores exactly one Next Action",
);

result = sendNextActionToToday(
  state,
  project.id,
  "must",
  "task-measure",
  timestamp,
);
assert.equal(result.ok, true, "leaf Next Action may be sent to Today");
state = result;
assert.equal(state.tasks[0].sourceProjectStepId, "measure");
assert.equal(state.tasks[0].today, true);
assert.equal(state.tasks[0].priority, "must");

result = sendNextActionToToday(
  state,
  project.id,
  "must",
  "duplicate-task",
  timestamp,
);
assert.equal(result.ok, false, "duplicate active linked tasks are rejected");
assert.equal(state.tasks.length, 1);

let taskResult = selectNowTask(state.tasks, "task-measure");
assert.equal(taskResult.ok, true);
state = { ...state, tasks: taskResult.tasks };
assert.equal(state.tasks.filter((task) => task.now).length, 1);

result = completeTaskAndLinkedStep(state, "task-measure", completedAt);
assert.equal(result.ok, true);
state = result;
assert.equal(state.tasks[0].status, "completed");
assert.equal(state.tasks[0].now, false);
assert.equal(
  state.projectSteps.find((step) => step.id === "measure").status,
  "completed",
);
assert.equal(state.projects[0].nextActionId, undefined);
assert.equal(state.projects[0].status, "active");
assert.equal(
  state.projectSteps.find((step) => step.id === "south-wall").status,
  "active",
);
assert.equal(
  state.projectSteps.find((step) => step.id === "wainscoting").status,
  "active",
);

result = designateNextAction(state, project.id, "measure", completedAt);
assert.equal(result.ok, false, "completed step cannot become Next Action");

const hierarchyBeforeStatusChange = JSON.stringify(state.projectSteps);
result = updateProjectStatus(state, project.id, "parked", completedAt);
assert.equal(result.ok, true);
state = result;
assert.equal(JSON.stringify(state.projectSteps), hierarchyBeforeStatusChange);
result = updateProjectStatus(state, project.id, "someday", completedAt);
assert.equal(result.ok, true);
state = result;
assert.equal(JSON.stringify(state.projectSteps), hierarchyBeforeStatusChange);

const linkedActiveTask = {
  id: "linked-active",
  title: "Install remaining wainscoting",
  createdAt: timestamp,
  status: "active",
  priority: "should",
  today: true,
  now: true,
  sourceProjectId: project.id,
  sourceProjectStepId: "wainscoting",
};
state = {
  ...state,
  projects: state.projects.map((item) =>
    item.id === project.id
      ? { ...item, status: "active", nextActionId: "wainscoting" }
      : item,
  ),
  tasks: [...state.tasks, linkedActiveTask],
};
result = completeStepAndLinkedTask(
  state,
  project.id,
  "wainscoting",
  completedAt,
);
assert.equal(result.ok, true, "completing a step synchronizes its linked task");
state = result;
assert.equal(
  state.tasks.find((task) => task.id === "linked-active").status,
  "completed",
);
assert.equal(state.projects[0].nextActionId, undefined);

const standaloneTasks = ["one", "two", "three", "four"].map((id) => ({
  id,
  title: id,
  createdAt: timestamp,
  status: "inbox",
  priority: "should",
  today: false,
  now: false,
}));
let todayTasks = standaloneTasks;
for (const id of ["one", "two", "three"]) {
  taskResult = addTaskToToday(todayTasks, id, "must");
  assert.equal(taskResult.ok, true);
  todayTasks = taskResult.tasks;
}
taskResult = addTaskToToday(todayTasks, "four", "must");
assert.equal(taskResult.ok, false, "fourth Must remains rejected");

taskResult = selectNowTask(todayTasks, "one");
assert.equal(taskResult.ok, true);
taskResult = selectNowTask(taskResult.tasks, "two");
assert.equal(taskResult.ok, true);
assert.equal(
  taskResult.tasks.filter((task) => task.now).length,
  1,
  "one-Now invariant remains intact",
);

const migrated = migratePersistedState({ tasks: standaloneTasks });
assert.equal(migrated.tasks.length, 4, "Milestone 001 tasks survive migration");
assert.deepEqual(migrated.projects, []);
assert.deepEqual(migrated.projectSteps, []);

const restored = JSON.parse(JSON.stringify(state));
assert.equal(restored.projectSteps.length, 3);
assert.equal(
  restored.projectSteps.find((step) => step.id === "measure").status,
  "completed",
);

console.log(
  "PASS project hierarchy, leaf/Next Action rules, Today linkage, completion sync, duplicate protection, status retention, Milestone 001 invariants, and persistence migration",
);
