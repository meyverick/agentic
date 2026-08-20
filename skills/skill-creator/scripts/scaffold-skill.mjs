#!/usr/bin/env node
/**
 * scaffold-skill.mjs — Create skill directory structure with SKILL.md skeleton
 * Usage: node scaffold-skill.mjs <skill-name> [output-dir]
 * Output: JSON with created path
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const skillName = process.argv[2];
const outputDir = process.argv[3] || '.';

if (!skillName) {
  console.error(JSON.stringify({
    error: 'Usage: node scaffold-skill.mjs <skill-name> [output-dir]'
  }));
  process.exit(1);
}

// Validate skill name format
if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(skillName)) {
  console.error(JSON.stringify({
    error: 'Invalid skill name. Must be lowercase letters, numbers, hyphens only. No leading/trailing hyphens.',
    name: skillName
  }));
  process.exit(1);
}

if (skillName.length > 64) {
  console.error(JSON.stringify({
    error: 'Skill name too long. Maximum 64 characters.',
    name: skillName,
    length: skillName.length
  }));
  process.exit(1);
}

if (skillName.includes('--')) {
  console.error(JSON.stringify({
    error: 'Skill name contains consecutive hyphens.',
    name: skillName
  }));
  process.exit(1);
}

// Create directory structure
const skillDir = join(outputDir, skillName);
mkdirSync(join(skillDir, 'scripts'), { recursive: true });
mkdirSync(join(skillDir, 'references'), { recursive: true });
mkdirSync(join(skillDir, 'assets', 'templates'), { recursive: true });

// Create SKILL.md skeleton
const skillMd = `---
name: ${skillName}
description: TODO: Describe what this skill does and when to use it. Be specific.
---

# ${skillName}

## When to Use

TODO: Describe when this skill should be activated.

## Usage

TODO: Describe how to use this skill.

## Gotchas

TODO: List environment-specific facts, common failures, non-obvious behaviors.
`;

writeFileSync(join(skillDir, 'SKILL.md'), skillMd);

// Output JSON
console.log(JSON.stringify({
  status: 'created',
  path: skillDir,
  files: [
    join(skillDir, 'SKILL.md'),
    join(skillDir, 'scripts/'),
    join(skillDir, 'references/'),
    join(skillDir, 'assets/templates/')
  ]
}));
