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
  markTaskComplete,
  selectNowTask,
} = require("../src/store/task-transitions.ts");
const { migratePersistedState } = require("../src/store/persistence.ts");
const {
  deleteCommitmentTransition,
  saveCommitmentTransition,
  scheduleTaskTransition,
  unscheduleTaskTransition,
  updateTaskEstimateTransition,
} = require("../src/store/planning-transitions.ts");
const {
  compareTimeRanges,
  describeDurationComparison,
  getCurrentAndNextRange,
  getLocalDateKey,
  getRangeDurationMinutes,
  getRemainingUnscheduledMinutes,
} = require("../src/utils/time.ts");
const {
  addLocalDays,
  getLocalWeekday,
  getMondayWeek,
  getRecurringCommitmentOccurrences,
  getRoutineOccurrences,
  recurrenceAppliesOnDate,
} = require("../src/utils/recurrence.ts");
const {
  addRoutineOccurrenceToTodayTransition,
  saveOccurrenceOverrideTransition,
  saveRecurringCommitmentTransition,
  saveRoutineTransition,
  setRoutineOccurrenceStatusTransition,
  skipOccurrenceTransition,
  syncRoutineTaskCompletion,
} = require("../src/store/recurrence-transitions.ts");

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
assert.deepEqual(migrated.dayPlans, []);

const restored = JSON.parse(JSON.stringify(state));
assert.equal(restored.projectSteps.length, 3);
assert.equal(
  restored.projectSteps.find((step) => step.id === "measure").status,
  "completed",
);

const planningDate = "2026-10-03";
const swim = {
  id: "swim",
  title: "Swim",
  createdAt: timestamp,
  status: "active",
  priority: "must",
  today: true,
  now: false,
};
const assignment = {
  id: "assignment",
  title: "MSAI assignment",
  createdAt: timestamp,
  status: "active",
  priority: "should",
  today: true,
  now: false,
};
const laterTask = {
  id: "later",
  title: "Later task",
  createdAt: timestamp,
  status: "inbox",
  priority: "could",
  today: false,
  now: false,
};
const doneTask = {
  id: "done",
  title: "Done task",
  createdAt: timestamp,
  completedAt,
  status: "completed",
  priority: "should",
  today: false,
  now: false,
};
let planningState = {
  tasks: [swim, assignment, laterTask, doneTask],
  dayPlans: [],
};

let planningResult = saveCommitmentTransition(
  planningState,
  {
    date: planningDate,
    title: "Invalid",
    startTime: "5:00 PM",
    endTime: "4:00 PM",
  },
  "invalid-range",
  timestamp,
);
assert.equal(planningResult.ok, false, "commitment end must follow start");

planningResult = saveCommitmentTransition(
  planningState,
  {
    date: planningDate,
    title: "Work",
    startTime: "6:00 AM",
    endTime: "4:30 PM",
  },
  "work",
  timestamp,
);
assert.equal(planningResult.ok, true);
planningState = planningResult;

planningResult = saveCommitmentTransition(
  planningState,
  {
    date: planningDate,
    title: "Commute home",
    startTime: "4:30 PM",
    endTime: "5:30 PM",
  },
  "commute",
  timestamp,
);
assert.equal(planningResult.ok, true, "touching ranges do not overlap");
planningState = planningResult;

planningResult = saveCommitmentTransition(
  planningState,
  {
    date: planningDate,
    title: "Meeting",
    startTime: "4:00 PM",
    endTime: "5:00 PM",
  },
  "meeting",
  timestamp,
);
assert.equal(planningResult.ok, false, "commitment overlap is rejected");
assert.match(planningResult.message, /Work/);

planningResult = scheduleTaskTransition(
  planningState,
  {
    date: planningDate,
    taskId: "swim",
    startTime: "6:15 PM",
    endTime: "7:00 PM",
    estimatedMinutes: 45,
  },
  "swim-block",
);
assert.equal(planningResult.ok, true);
planningState = planningResult;
assert.equal(
  planningState.tasks.find((task) => task.id === "swim").estimatedMinutes,
  45,
);

planningResult = scheduleTaskTransition(
  planningState,
  {
    date: planningDate,
    taskId: "assignment",
    startTime: "7:15 PM",
    endTime: "8:15 PM",
    estimatedMinutes: 90,
  },
  "assignment-block",
);
assert.equal(planningResult.ok, true);
planningState = planningResult;
const dayPlan = planningState.dayPlans[0];
assert.deepEqual(
  [
    ...dayPlan.commitments.map((item) => ({ ...item, label: item.title })),
    ...dayPlan.timeBlocks.map((item) => ({
      ...item,
      label: planningState.tasks.find((task) => task.id === item.taskId).title,
    })),
  ]
    .sort(compareTimeRanges)
    .map((item) => item.label),
  ["Work", "Commute home", "Swim", "MSAI assignment"],
  "required workflow persists the intended chronological insertion order",
);
assert.equal(
  planningState.tasks.find((task) => task.id === "swim").today,
  true,
  "scheduled Swim remains a Today task",
);
assert.equal(
  planningState.tasks.find((task) => task.id === "assignment").today,
  true,
  "scheduled assignment remains a Today task",
);
const assignmentBlock = dayPlan.timeBlocks.find(
  (block) => block.taskId === "assignment",
);
const requiredWorkflowState = JSON.parse(JSON.stringify(planningState));

planningResult = saveCommitmentTransition(
  planningState,
  {
    date: planningDate,
    title: "Dinner",
    startTime: "6:30 PM",
    endTime: "6:45 PM",
  },
  "dinner",
  timestamp,
);
assert.equal(
  planningResult.ok,
  false,
  "a new commitment cannot overlap an active task block",
);
assert.equal(getRangeDurationMinutes(assignmentBlock), 60);
assert.equal(
  describeDurationComparison(60, 90),
  "60 min scheduled · 90 min estimated",
);

planningResult = scheduleTaskTransition(
  planningState,
  {
    date: planningDate,
    taskId: "assignment",
    startTime: "4:00 PM",
    endTime: "5:00 PM",
    estimatedMinutes: 90,
  },
  "ignored",
);
assert.equal(planningResult.ok, false, "commitment/task overlap is rejected");

planningResult = scheduleTaskTransition(
  planningState,
  {
    date: planningDate,
    taskId: "assignment",
    startTime: "6:30 PM",
    endTime: "7:30 PM",
    estimatedMinutes: 90,
  },
  "ignored",
);
assert.equal(planningResult.ok, false, "task/task overlap is rejected");

planningResult = scheduleTaskTransition(
  planningState,
  {
    date: planningDate,
    taskId: "swim",
    startTime: "6:00 PM",
    endTime: "7:00 PM",
    estimatedMinutes: 45,
  },
  "duplicate",
);
assert.equal(planningResult.ok, true, "an existing block is edited");
assert.equal(
  planningResult.dayPlans[0].timeBlocks.filter(
    (block) => block.taskId === "swim",
  ).length,
  1,
  "a task has at most one active block per day",
);
planningState = planningResult;

planningResult = scheduleTaskTransition(
  planningState,
  {
    date: planningDate,
    taskId: "later",
    startTime: "8:30 PM",
    endTime: "9:00 PM",
  },
  "later-block",
);
assert.equal(planningResult.ok, false, "non-Today task cannot be scheduled");
planningResult = scheduleTaskTransition(
  planningState,
  {
    date: planningDate,
    taskId: "done",
    startTime: "8:30 PM",
    endTime: "9:00 PM",
  },
  "done-block",
);
assert.equal(planningResult.ok, false, "completed task cannot be scheduled");
planningResult = scheduleTaskTransition(
  planningState,
  {
    date: planningDate,
    taskId: "assignment",
    startTime: "8:15 PM",
    endTime: "8:00 PM",
    estimatedMinutes: 90,
  },
  "ignored",
);
assert.equal(planningResult.ok, false, "task block end must follow start");

const tasksBeforeUnschedule = planningState.tasks;
planningResult = unscheduleTaskTransition(planningState, planningDate, "swim");
assert.equal(planningResult.ok, true);
assert.deepEqual(
  planningResult.tasks,
  tasksBeforeUnschedule,
  "unscheduling preserves the task",
);
planningState = planningResult;

const tasksBeforeDelete = planningState.tasks;
planningResult = deleteCommitmentTransition(
  planningState,
  planningDate,
  "commute",
);
assert.equal(planningResult.ok, true);
assert.deepEqual(
  planningResult.tasks,
  tasksBeforeDelete,
  "deleting a commitment preserves tasks",
);

const estimateResult = updateTaskEstimateTransition(
  planningState.tasks,
  "assignment",
  0,
);
assert.equal(estimateResult.ok, false, "duration must be a positive integer");

assert.equal(
  getRemainingUnscheduledMinutes([
    { startTime: "06:00", endTime: "16:30" },
    { startTime: "16:30", endTime: "17:30" },
    { startTime: "18:15", endTime: "19:00" },
    { startTime: "19:15", endTime: "20:15" },
  ]),
  285,
  "remaining time is derived inside the 5 AM–11 PM planning window",
);
const derivedBlocks = getCurrentAndNextRange(
  [
    { title: "Later", startTime: "19:15", endTime: "20:15" },
    { title: "Current", startTime: "18:15", endTime: "19:00" },
  ],
  18 * 60 + 30,
);
assert.equal(derivedBlocks.current.title, "Current");
assert.equal(derivedBlocks.next.title, "Later");
assert.equal(
  getLocalDateKey(new Date(2026, 9, 3, 23, 59)),
  "2026-10-03",
  "date keys use local calendar fields rather than UTC conversion",
);

const persistedPlanning = migratePersistedState(
  JSON.parse(JSON.stringify(planningState)),
);
assert.equal(persistedPlanning.dayPlans.length, 1);
assert.equal(
  persistedPlanning.dayPlans[0].timeBlocks.some(
    (block) => block.taskId === "assignment",
  ),
  true,
  "day plans survive persistence round trips",
);

taskResult = selectNowTask(requiredWorkflowState.tasks, "swim");
assert.equal(taskResult.ok, true);
const completedSwim = markTaskComplete(taskResult.tasks, "swim", completedAt);
assert.equal(completedSwim.ok, true);
assert.equal(
  completedSwim.tasks.find((task) => task.id === "swim").now,
  false,
  "completion clears Now",
);
assert.equal(
  completedSwim.tasks.find((task) => task.id === "swim").today,
  false,
  "completion removes the task from active Today",
);
assert.equal(
  requiredWorkflowState.dayPlans[0].timeBlocks.some(
    (block) => block.taskId === "swim",
  ),
  true,
  "completion preserves the historical block",
);
const restartedWorkflow = migratePersistedState({
  tasks: completedSwim.tasks,
  projects: [],
  projectSteps: [],
  dayPlans: requiredWorkflowState.dayPlans,
});
assert.equal(
  restartedWorkflow.tasks.find((task) => task.id === "swim").status,
  "completed",
);
assert.equal(
  restartedWorkflow.dayPlans[0].timeBlocks.some(
    (block) => block.taskId === "assignment",
  ),
  true,
  "restart retains the remaining active assignment block",
);
assert.equal(
  restartedWorkflow.tasks.filter(
    (task) => task.now && task.status !== "completed",
  ).length,
  0,
  "restart has no invalid active Now task",
);

assert.deepEqual(migrated.recurrenceRules, []);
assert.deepEqual(migrated.recurringCommitments, []);
assert.deepEqual(migrated.recurrenceOverrides, []);
assert.deepEqual(migrated.routines, []);
assert.deepEqual(migrated.routineStates, []);

const recurrenceStart = "2026-10-05";
const recurrenceTimestamp = "2026-10-03T18:00:00.000Z";
let recurrenceState = {
  tasks: [],
  dayPlans: [],
  recurrenceRules: [],
  recurringCommitments: [],
  recurrenceOverrides: [],
  routines: [],
  routineStates: [],
};

let recurrenceResult = saveRecurringCommitmentTransition(
  recurrenceState,
  {
    title: "Work",
    startTime: "6:00 AM",
    endTime: "4:30 PM",
    frequency: "selected_weekdays",
    selectedWeekdays: ["mon", "tue", "wed", "thu"],
    startDate: recurrenceStart,
    enabled: true,
  },
  "recurring-work",
  "rule-work",
  recurrenceTimestamp,
  "2026-10-03",
);
assert.equal(recurrenceResult.ok, true);
recurrenceState = recurrenceResult;

recurrenceResult = saveRecurringCommitmentTransition(
  recurrenceState,
  {
    title: "Commute home",
    startTime: "4:30 PM",
    endTime: "5:30 PM",
    frequency: "selected_weekdays",
    selectedWeekdays: ["mon", "tue", "wed", "thu"],
    startDate: recurrenceStart,
    enabled: true,
  },
  "recurring-commute",
  "rule-commute",
  recurrenceTimestamp,
  "2026-10-03",
);
assert.equal(recurrenceResult.ok, true, "touching recurring ranges are valid");
recurrenceState = recurrenceResult;

const firstWeek = Array.from({ length: 7 }, (_, index) =>
  addLocalDays(recurrenceStart, index),
);
const firstWeekOccurrences = firstWeek.map((date) => ({
  date,
  items: getRecurringCommitmentOccurrences(
    date,
    recurrenceState.recurrenceRules,
    recurrenceState.recurringCommitments,
    recurrenceState.recurrenceOverrides,
  ),
}));
assert.deepEqual(
  firstWeekOccurrences.map(({ items }) => items.length),
  [2, 2, 2, 2, 0, 0, 0],
  "Work and Commute derive only Monday through Thursday",
);
assert.equal(
  firstWeekOccurrences[0].items[0].id,
  getRecurringCommitmentOccurrences(
    recurrenceStart,
    recurrenceState.recurrenceRules,
    recurrenceState.recurringCommitments,
    recurrenceState.recurrenceOverrides,
  )[0].id,
  "derived occurrence IDs are stable",
);

recurrenceResult = saveOccurrenceOverrideTransition(
  recurrenceState,
  "recurring-work",
  "2026-10-12",
  {
    title: "Work",
    startTime: "7:00 AM",
    endTime: "3:00 PM",
  },
  "override-work-monday",
  recurrenceTimestamp,
);
assert.equal(recurrenceResult.ok, true);
recurrenceState = recurrenceResult;
assert.deepEqual(
  getRecurringCommitmentOccurrences(
    "2026-10-12",
    recurrenceState.recurrenceRules,
    recurrenceState.recurringCommitments,
    recurrenceState.recurrenceOverrides,
  )
    .filter((item) => item.recurringCommitmentId === "recurring-work")
    .map((item) => [item.startTime, item.endTime]),
  [["07:00", "15:00"]],
  "a Monday override changes only that Work occurrence",
);
assert.deepEqual(
  getRecurringCommitmentOccurrences(
    "2026-10-05",
    recurrenceState.recurrenceRules,
    recurrenceState.recurringCommitments,
    recurrenceState.recurrenceOverrides,
  )
    .filter((item) => item.recurringCommitmentId === "recurring-work")
    .map((item) => [item.startTime, item.endTime]),
  [["06:00", "16:30"]],
  "another Monday keeps the series time",
);

recurrenceResult = skipOccurrenceTransition(
  recurrenceState,
  "recurring-work",
  "2026-10-13",
  "skip-work-tuesday",
  recurrenceTimestamp,
);
assert.equal(recurrenceResult.ok, true);
recurrenceState = recurrenceResult;
assert.equal(
  getRecurringCommitmentOccurrences(
    "2026-10-13",
    recurrenceState.recurrenceRules,
    recurrenceState.recurringCommitments,
    recurrenceState.recurrenceOverrides,
  ).some((item) => item.recurringCommitmentId === "recurring-work"),
  false,
  "a skipped Tuesday suppresses only that occurrence",
);
assert.equal(
  getRecurringCommitmentOccurrences(
    "2026-10-20",
    recurrenceState.recurrenceRules,
    recurrenceState.recurringCommitments,
    recurrenceState.recurrenceOverrides,
  ).some((item) => item.recurringCommitmentId === "recurring-work"),
  true,
  "a later Tuesday still derives",
);

recurrenceResult = saveRecurringCommitmentTransition(
  recurrenceState,
  {
    title: "Work",
    startTime: "6:30 AM",
    endTime: "4:00 PM",
    frequency: "selected_weekdays",
    selectedWeekdays: ["mon", "tue", "wed", "thu"],
    startDate: recurrenceStart,
    enabled: true,
  },
  "recurring-work",
  "ignored-rule-id",
  recurrenceTimestamp,
  "2026-10-03",
);
assert.equal(recurrenceResult.ok, true);
recurrenceState = recurrenceResult;
assert.equal(
  getRecurringCommitmentOccurrences(
    "2026-10-14",
    recurrenceState.recurrenceRules,
    recurrenceState.recurringCommitments,
    recurrenceState.recurrenceOverrides,
  ).find((item) => item.recurringCommitmentId === "recurring-work").startTime,
  "06:30",
  "series edits affect future derived occurrences",
);
assert.equal(
  getRecurringCommitmentOccurrences(
    "2026-10-12",
    recurrenceState.recurrenceRules,
    recurrenceState.recurringCommitments,
    recurrenceState.recurrenceOverrides,
  ).find((item) => item.recurringCommitmentId === "recurring-work").startTime,
  "07:00",
  "a series edit preserves a date override",
);

planningResult = saveCommitmentTransition(
  recurrenceState,
  {
    date: "2026-10-14",
    title: "One-off meeting",
    startTime: "3:30 PM",
    endTime: "4:15 PM",
  },
  "one-off-conflict",
  recurrenceTimestamp,
);
assert.equal(
  planningResult.ok,
  false,
  "one-off commitments conflict with recurring occurrences",
);
assert.match(planningResult.message, /Work/);

const boundedRule = {
  id: "bounded",
  frequency: "daily",
  startDate: "2026-10-10",
  endDate: "2026-10-12",
  enabled: true,
  createdAt: recurrenceTimestamp,
};
assert.equal(recurrenceAppliesOnDate(boundedRule, "2026-10-09"), false);
assert.equal(recurrenceAppliesOnDate(boundedRule, "2026-10-10"), true);
assert.equal(recurrenceAppliesOnDate(boundedRule, "2026-10-12"), true);
assert.equal(recurrenceAppliesOnDate(boundedRule, "2026-10-13"), false);
assert.equal(
  recurrenceAppliesOnDate(
    {
      ...boundedRule,
      enabled: false,
      disabledFromDate: "2026-10-11",
    },
    "2026-10-11",
  ),
  false,
  "a disabled rule produces no occurrence from its effective date",
);

assert.equal(getLocalWeekday("2026-10-04"), "sun");
assert.equal(getLocalWeekday("2026-10-05"), "mon");
assert.deepEqual(getMondayWeek("2026-10-04"), [
  "2026-09-28",
  "2026-09-29",
  "2026-09-30",
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
]);
assert.equal(addLocalDays("2026-10-31", 1), "2026-11-01");
assert.equal(
  addLocalDays("2026-03-07", 1),
  "2026-03-08",
  "local date arithmetic remains stable across the DST boundary",
);

let routineFlow = recurrenceState;
recurrenceResult = saveRoutineTransition(
  routineFlow,
  {
    title: "Pray",
    estimatedMinutes: 10,
    frequency: "daily",
    startDate: "2026-10-03",
    enabled: true,
    domain: "faith",
  },
  "routine-pray",
  "rule-pray",
  recurrenceTimestamp,
  "2026-10-03",
);
assert.equal(recurrenceResult.ok, true);
routineFlow = recurrenceResult;
assert.equal(
  getRoutineOccurrences(
    "2026-10-03",
    routineFlow.recurrenceRules,
    routineFlow.routines,
    routineFlow.routineStates,
  )[0].status,
  "pending",
);

recurrenceResult = addRoutineOccurrenceToTodayTransition(
  routineFlow,
  "routine-pray",
  "2026-10-03",
  "should",
  "task-pray-2026-10-03",
  recurrenceTimestamp,
);
assert.equal(recurrenceResult.ok, true);
routineFlow = recurrenceResult;
const prayTask = routineFlow.tasks.find(
  (task) => task.id === "task-pray-2026-10-03",
);
assert.equal(prayTask.today, true);
assert.equal(prayTask.priority, "should");
assert.equal(prayTask.estimatedMinutes, 10);
assert.equal(prayTask.sourceRoutineId, "routine-pray");

const duplicateRoutineTask = addRoutineOccurrenceToTodayTransition(
  routineFlow,
  "routine-pray",
  "2026-10-03",
  "should",
  "duplicate-pray-task",
  recurrenceTimestamp,
);
assert.equal(
  duplicateRoutineTask.tasks.filter(
    (task) =>
      task.sourceRoutineId === "routine-pray" &&
      task.sourceRoutineDate === "2026-10-03" &&
      task.status !== "completed",
  ).length,
  1,
  "a routine date never creates a duplicate active task",
);

planningResult = scheduleTaskTransition(
  routineFlow,
  {
    date: "2026-10-03",
    taskId: prayTask.id,
    startTime: "6:00 PM",
    endTime: "6:10 PM",
    estimatedMinutes: 10,
  },
  "block-pray",
);
assert.equal(
  planningResult.ok,
  true,
  "the routine task uses normal scheduling",
);
routineFlow = {
  ...routineFlow,
  tasks: planningResult.tasks,
  dayPlans: planningResult.dayPlans,
};
taskResult = selectNowTask(routineFlow.tasks, prayTask.id);
assert.equal(taskResult.ok, true, "the routine task uses the one-Now path");
routineFlow = { ...routineFlow, tasks: taskResult.tasks };
assert.equal(
  routineFlow.tasks.find((task) => task.id === prayTask.id).now,
  true,
  "the routine-linked Pray task becomes Now before completion",
);
const completedPrayTask = markTaskComplete(
  routineFlow.tasks,
  prayTask.id,
  completedAt,
);
assert.equal(completedPrayTask.ok, true);
routineFlow = {
  ...routineFlow,
  tasks: completedPrayTask.tasks,
  routineStates: syncRoutineTaskCompletion(
    routineFlow.routineStates,
    prayTask,
    completedAt,
  ),
};
assert.equal(
  getRoutineOccurrences(
    "2026-10-03",
    routineFlow.recurrenceRules,
    routineFlow.routines,
    routineFlow.routineStates,
  )[0].status,
  "completed",
  "completing a routine-linked Task completes that date's occurrence",
);
assert.equal(
  getRoutineOccurrences(
    "2026-10-04",
    routineFlow.recurrenceRules,
    routineFlow.routines,
    routineFlow.routineStates,
  )[0].status,
  "pending",
  "tomorrow's routine occurrence remains pending",
);
assert.equal(
  routineFlow.routines.find((routine) => routine.id === "routine-pray").enabled,
  true,
  "completing an occurrence leaves its Routine template enabled",
);

recurrenceResult = setRoutineOccurrenceStatusTransition(
  routineFlow,
  "routine-pray",
  "2026-10-04",
  "completed",
  completedAt,
);
assert.equal(recurrenceResult.ok, true);
routineFlow = recurrenceResult;
assert.equal(
  getRoutineOccurrences(
    "2026-10-05",
    routineFlow.recurrenceRules,
    routineFlow.routines,
    routineFlow.routineStates,
  )[0].status,
  "pending",
  "direct routine completion is date-specific",
);

const restartedRhythm = migratePersistedState(
  JSON.parse(JSON.stringify(routineFlow)),
);
assert.equal(restartedRhythm.recurringCommitments.length, 2);
assert.equal(restartedRhythm.recurrenceOverrides.length, 2);
assert.equal(restartedRhythm.routines.length, 1);
assert.equal(
  restartedRhythm.routineStates.find(
    (item) => item.routineId === "routine-pray" && item.date === "2026-10-03",
  ).status,
  "completed",
);
assert.equal(
  getRecurringCommitmentOccurrences(
    "2026-10-12",
    restartedRhythm.recurrenceRules,
    restartedRhythm.recurringCommitments,
    restartedRhythm.recurrenceOverrides,
  ).find((item) => item.recurringCommitmentId === "recurring-work").startTime,
  "07:00",
  "restart retains the single-date override",
);
assert.equal(
  getRecurringCommitmentOccurrences(
    "2026-10-13",
    restartedRhythm.recurrenceRules,
    restartedRhythm.recurringCommitments,
    restartedRhythm.recurrenceOverrides,
  ).some((item) => item.recurringCommitmentId === "recurring-work"),
  false,
  "restart retains the skipped occurrence",
);
assert.equal(
  getRoutineOccurrences(
    "2026-10-06",
    restartedRhythm.recurrenceRules,
    restartedRhythm.routines,
    restartedRhythm.routineStates,
  )[0].status,
  "pending",
  "future routine occurrences still derive after restart",
);

console.log(
  "PASS project/task invariants, M3 planning, recurring commitments, overrides, routines, local-date recurrence, and v1-v3 persistence migration",
);
