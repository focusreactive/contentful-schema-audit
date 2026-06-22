import type { DimensionDefinition } from "./types.js";
import type { NormalizedModel } from "../model/index.js";
import { SINGLETON_CONFIG_RE } from "./helpers.js";

const NAV_TYPE_RE = /nav|menu/i;
const REDIRECT_TYPE_RE = /redirect/i;

function anyTypeMatches(model: NormalizedModel, re: RegExp): boolean {
  return model.contentTypes.some((t) => re.test(t.id) || re.test(t.name));
}

export const globalConfigDimension: DimensionDefinition = {
  id: "globalConfig",
  title: "Global Configuration",
  tier: "situational",
  requiredSignals: ["contentType.fields", "field.type"],
  evaluate: (model: NormalizedModel) => [
    {
      id: "globalConfig.settingsType",
      title: "Centralized settings type exists",
      severity: "minor",
      status: anyTypeMatches(model, SINGLETON_CONFIG_RE) ? "pass" : "fail",
      evidence: {
        summary:
          anyTypeMatches(model, SINGLETON_CONFIG_RE) ?
            "A site-settings/config type is present"
          : "No centralized settings/config type found",
      },
      fixHint: "Add a singleton settings type for global config instead of hardcoding values.",
    },
    {
      id: "globalConfig.navModeled",
      title: "Navigation is modeled as content",
      severity: "minor",
      status: anyTypeMatches(model, NAV_TYPE_RE) ? "pass" : "fail",
      evidence: {
        summary: anyTypeMatches(model, NAV_TYPE_RE) ? "Navigation/menu is modeled" : "No navigation/menu type found",
      },
      fixHint: "Model navigation as content so editors can manage menus without code changes.",
    },
    {
      id: "globalConfig.redirects",
      title: "Redirects are modeled as entries",
      severity: "minor",
      status: anyTypeMatches(model, REDIRECT_TYPE_RE) ? "pass" : "fail",
      evidence: {
        summary:
          anyTypeMatches(model, REDIRECT_TYPE_RE) ? "A redirect type is present" : (
            "No redirect content type found (platform redirects are not visible from the CMS)"
          ),
      },
      fixHint: "Model redirects as entries so editors can manage them in the CMS.",
    },
  ],
};
