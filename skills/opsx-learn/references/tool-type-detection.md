# Tool Type Detection

## Detection Matrix

| Report Content | Tool Type | Action |
|----------------|-----------|--------|
| New skill files in artifacts/ | New skill | Create proposal for new skill |
| Existing skill improvement | Skill update | Create proposal for skill update |
| New prompt files in artifacts/ | New prompt | Create proposal for new prompt |
| Both skill and prompt | Combo | Create proposal for both |
| Knowledge gaps in assessment | Reference/docs | Create proposal for reference materials |
| Generic workflow improvement | Prompt | Create proposal for new prompt |

## Detection Signals

### From Report Metadata
- `tags` field → skill/prompt name
- `capability-path` → skill identifier
- `type` field → report category

### From Artifacts
- `skills/` directory → skill
- `prompts/` directory → prompt
- Both → combo
- `references/` → reference materials

### From Assessment
- Knowledge gaps → reference materials needed
- Tool improvements → skill/prompt updates
- Documentation gaps → new documentation
