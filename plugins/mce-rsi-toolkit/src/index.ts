import { Component } from "@prismshadow/penguin-core/plugin";
import type { Plugin } from "@prismshadow/penguin-core/plugin";

/**
 * Everything this plugin carries, declared for the plugin library. Data only: the class has no
 * body and the package no entry point; `build` writes this literal into `ifaces.json`.
 */
@Component({
  contributes: {
    "PluginLibraryModule.cards": [
      {
        id: "mce-rsi-toolkit.card",
        title: "MCE RSI Toolkit",
        titleZh: "MCE 自进化工具包",
        descriptionZh:
          "MCE RSI 工具包：同时进化上下文工程 Skill 与它产出的上下文，按验证得分选出上下文，再比较冻结的 baseline 与 final。",
        shortDescription: "MCE RSI Toolkit: evolve the context-engineering Skill itself.",
        shortDescriptionZh: "MCE RSI 工具包：进化上下文工程 Skill 本身。",
        category: "rsi",
        icon: "icon.svg",
        quickStart: {
          prompt:
            "Read mce-rsi-toolkit and run an MCE experiment on the selected Benchmarks with the requested model and budget.",
          promptZh: "读取 mce-rsi-toolkit，按指定模型和预算，在选定的 Benchmark 上完成 MCE 实验。",
          skills: ["mce-rsi-toolkit"],
        },
        references: [
          "https://arxiv.org/abs/2601.21557",
          "https://github.com/metaevo-ai/meta-context-engineering",
        ],
      },
    ],
    "PluginLibraryModule.skills": [
      {
        id: "mce-rsi-toolkit.skill.mce-rsi-toolkit",
        name: "mce-rsi-toolkit",
        path: "skills/mce-rsi-toolkit",
      },
    ],
  },
})
export class MceRsiToolkitPlugin {}

export default { modules: [MceRsiToolkitPlugin] } satisfies Plugin;
