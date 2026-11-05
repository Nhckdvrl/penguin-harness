// @vitest-environment jsdom
/**
 * The Use dialog's Optimize tab (features/benchmark/use-benchmark-modal.tsx) under the toolkits the
 * plugin library lists: Default, a toolkit that optimizes against one Benchmark (OPRO) and one that
 * learns on a Train/Test pair (SkillOpt).
 *
 * - Given any toolkit other than Default, of either kind, the tab asks for no runs per case, says
 *   the method runs as its Skill defines it, and the conversation it opens carries the same
 *   method-neutral tail with only that toolkit's Skill preselected and no count of the tab's own.
 * - Given a budget the user wants, it reaches the toolkit through Focus, ahead of the tail.
 * - Given Default, the tab keeps runs per case, the round limit and the target score.
 * - Given runs per case left out of range on Default, a toolkit that takes none still opens.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { RouterProvider, createMemoryRouter } from "react-router";
import type {
  AgentSummary,
  BenchmarkSummary,
  ModelsResponse,
  PluginItem,
} from "@prismshadow/penguin-server/api";
import { UseBenchmarkModal } from "../src/features/benchmark/use-benchmark-modal";
import { DEFAULT_TOOLKIT_PLUGIN, OPTIMIZATION_SKILL } from "../src/features/benchmark/rsi-methods";
import { draftKey, loadDraft } from "../src/features/chat/draft-cache";
import { S } from "../src/lib/strings";
import { AuthProvider } from "../src/state/auth";
import { LocaleProvider } from "../src/state/locale";
import { ProjectProvider } from "../src/state/project";
import { ADMIN_ME } from "./helpers/admin-settings";
import { button, click, field, hasButton, mount, type, unmountAll, waitFor } from "./helpers/dom";
import { apiError, json, stubFetch } from "./helpers/fetch";
import { SignedIn } from "./helpers/signed-in";

const PROJECT_ID = "proj";
const AGENT_ID = "ticket-agent";
const TEST_PACKAGE = "penguinharness-benchmark-gdpevo-essential-service-ticket-resolution-test";
const DRAFT_KEY = draftKey(ADMIN_ME.user.userId, PROJECT_ID);

const toolkit = (name: string, over: Partial<PluginItem> = {}): PluginItem => ({
  name,
  title: name,
  description: "",
  version: "0.2.18",
  package: `@penguinharness/${name}`,
  source: "builtin",
  skills: [
    {
      name: name === DEFAULT_TOOLKIT_PLUGIN ? OPTIMIZATION_SKILL : name,
      description: "",
      version: "",
    },
  ],
  hooks: [],
  mcpServers: [],
  ...over,
});

const LIBRARY = {
  groups: [
    {
      id: "rsi",
      title: "Agent Self-Evolution",
      plugins: [
        toolkit(DEFAULT_TOOLKIT_PLUGIN),
        toolkit("opro-rsi-toolkit"),
        toolkit("skillopt-rsi-toolkit"),
      ],
    },
  ],
};

const BENCHMARK: BenchmarkSummary = {
  id: TEST_PACKAGE,
  title: "GDPEVO Essential-Service Ticket Resolution-Test",
  status: "published",
  caseCount: 5,
  evaluations: [],
  agentIds: [],
};

const AGENTS = [
  { agentId: AGENT_ID, name: "Ticket agent", createdAt: "2026-01-01T00:00:00Z" },
] as unknown as AgentSummary[];

const MODELS = {
  providers: {},
  models: [{ provider: "custom", modelId: "m-1", contextWindow: 200_000 }],
  defaultModel: { provider: "custom", modelId: "m-1" },
} as unknown as ModelsResponse;

/** This server: the user, one Project, its one agent with every toolkit's Skill, and the library. */
function serve() {
  return stubFetch(async ({ path }) => {
    if (path === "/api/me") return json(ADMIN_ME);
    if (path === "/api/me/prefs") return json({ prefs: {} });
    if (path === "/api/projects") {
      return json({
        projects: [
          {
            projectId: PROJECT_ID,
            name: "Project",
            role: "owner",
            ownerUserId: "admin",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
      });
    }
    if (path === `/api/projects/${PROJECT_ID}/agents`) return json({ agents: AGENTS });
    if (path === `/api/projects/${PROJECT_ID}/agents/${AGENT_ID}/skills`) {
      return json({
        skills: LIBRARY.groups[0]!.plugins.flatMap((p) => p.skills.map((s) => ({ name: s.name }))),
      });
    }
    if (path === "/api/plugins") return json(LIBRARY);
    return apiError(404, "not_found");
  });
}

/** The dialog on its Optimize tab, under the providers its conversation hand-off needs. */
async function openOptimize() {
  serve();
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: h(
          SignedIn,
          null,
          h(
            ProjectProvider,
            null,
            h(UseBenchmarkModal, {
              open: true,
              onClose: () => {},
              projectId: PROJECT_ID,
              benchmark: BENCHMARK,
              agents: AGENTS,
              models: MODELS,
              initialTab: "optimize",
            }),
          ),
        ),
      },
      { path: "/chat/:sessionId", element: h("p", null, "Conversation") },
    ],
    { initialEntries: ["/"] },
  );
  await mount(h(LocaleProvider, null, h(AuthProvider, null, h(RouterProvider, { router }))));
  // The Method select is live once the library is read.
  await waitFor(() => hasButton(DEFAULT_TOOLKIT_PLUGIN), 40);
  return router;
}

/** Picks a Method by its label. */
async function pickMethod(label: string) {
  await click(button(DEFAULT_TOOLKIT_PLUGIN));
  const option = [...document.querySelectorAll('[role="option"]')].find(
    (o) => o.textContent?.trim() === label,
  );
  if (option === undefined) throw new Error(`no method ${label}`);
  await click(option);
}

const hasField = (label: string) => {
  try {
    field(label);
    return true;
  } catch {
    return false;
  }
};

afterEach(async () => {
  await unmountAll();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe("the Optimize tab", () => {
  for (const method of ["opro-rsi-toolkit", "skillopt-rsi-toolkit"]) {
    it(`hands ${method} the method-neutral tail and asks for no runs`, async () => {
      const router = await openOptimize();
      await pickMethod(method);

      expect(hasField(S.benchmark.runsField)).toBe(false);
      expect(hasField(S.benchmark.roundLimitField)).toBe(false);
      expect(hasField(S.benchmark.targetScoreField)).toBe(false);
      expect(document.body.textContent).toContain(S.benchmark.methodBudgetHint);

      await click(button(S.aiCreate.editInChat));
      await waitFor(() => router.state.location.pathname.startsWith("/chat/"), 40);

      const draft = loadDraft(DRAFT_KEY);
      expect(draft.agentId).toBe(AGENT_ID);
      expect(draft.skills).toEqual([method]);
      expect(draft.text).toBe(
        S.benchmark.rsiOptimizeTail({
          skill: method,
          targetAgentId: AGENT_ID,
          benchmarkId: TEST_PACKAGE,
        }),
      );
    });
  }

  it("passes a budget the user asks for through Focus", async () => {
    const router = await openOptimize();
    await pickMethod("skillopt-rsi-toolkit");

    await type(field(S.benchmark.focusField), "Test each frozen State 5 times.");
    await click(button(S.aiCreate.editInChat));
    await waitFor(() => router.state.location.pathname.startsWith("/chat/"), 40);

    const draft = loadDraft(DRAFT_KEY);
    expect(draft.text?.startsWith("Test each frozen State 5 times.")).toBe(true);
    expect(draft.text).toContain("`skillopt-rsi-toolkit`");
  });

  it("keeps runs per case, the round limit and the target score for Default", async () => {
    await openOptimize();

    expect(field(S.benchmark.runsField).value).toBe("1");
    expect(hasField(S.benchmark.roundLimitField)).toBe(true);
    expect(hasField(S.benchmark.targetScoreField)).toBe(true);
    expect(document.body.textContent).not.toContain(S.benchmark.methodBudgetHint);
  });

  it("opens a toolkit's conversation even with Default's runs per case out of range", async () => {
    await openOptimize();
    await type(field(S.benchmark.runsField), "0");
    expect(button(S.aiCreate.editInChat).disabled).toBe(true);

    await pickMethod("opro-rsi-toolkit");

    expect(button(S.aiCreate.editInChat).disabled).toBe(false);
  });
});
