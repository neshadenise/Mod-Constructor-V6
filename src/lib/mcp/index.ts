import { defineMcp } from "@lovable.dev/mcp-js";

import listProjects from "./tools/list-projects";
import getProject from "./tools/get-project";
import listCareers from "./tools/list-careers";
import listTraits from "./tools/list-traits";
import listAspirations from "./tools/list-aspirations";
import listNotifications from "./tools/list-notifications";

import createProject from "./tools/create-project";
import addCareer from "./tools/add-career";
import addTrait from "./tools/add-trait";
import addAspiration from "./tools/add-aspiration";
import addNotification from "./tools/add-notification";
import setProjectStatus from "./tools/set-project-status";
import bumpVersion from "./tools/bump-version";

import exportBundle from "./tools/export-bundle";
import importBundle from "./tools/import-bundle";

import listTemplates from "./tools/list-templates";
import useTemplate from "./tools/use-template";
import listSnippets from "./tools/list-snippets";

export default defineMcp({
  name: "mod-constructor-v6",
  title: "Mod Constructor V6",
  version: "0.1.0",
  instructions: [
    "Author The Sims 4 mods conversationally.",
    "Every tool takes an optional `bundle` (a .mcbundle.json object) and returns the updated bundle.",
    "Typical flow: create_project → add_career/add_trait/add_aspiration/add_notification (or use_template) → export_bundle.",
    "Hand the exported .mcbundle.json back to the user; they import it into Mod Constructor V6 via File → Import.",
    "This server is stateless — always pass the latest bundle you received back into the next call.",
  ].join(" "),
  tools: [
    listProjects,
    getProject,
    listCareers,
    listTraits,
    listAspirations,
    listNotifications,
    createProject,
    addCareer,
    addTrait,
    addAspiration,
    addNotification,
    setProjectStatus,
    bumpVersion,
    exportBundle,
    importBundle,
    listTemplates,
    useTemplate,
    listSnippets,
  ],
});
