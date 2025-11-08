# Pull Request Review Process

## How to Initiate a Code Review

This document explains how to request code reviews for pull requests in the voyager-rn repository.

## Overview

The repository uses an automated code review tool that analyzes your changes and provides actionable feedback before finalizing your PR.

## Steps to Initiate a Review

### 1. Make Your Changes
- Implement your feature, fix, or documentation updates
- Commit your changes using git or the `report_progress` tool
- Ensure your changes are meaningful and complete

### 2. Run the code_review Tool

Before finalizing your PR, call the `code_review` tool with:

```
code_review(
  prTitle: "Brief description of your changes",
  prDescription: "Detailed explanation including:
    - What changed
    - Why it changed
    - How to test it
    - Any relevant context"
)
```

**Important Notes:**
- The tool requires actual file changes to review (it won't work on empty commits)
- Even documentation-only changes should be reviewed
- The review should happen BEFORE running security checks

### 3. Review the Feedback

The code_review tool will return comments about your changes:
- Read each comment carefully
- Determine which comments are valid
- Decide which feedback to address

**Note:** The tool is not perfect - use your judgment when evaluating feedback.

### 4. Address Relevant Feedback

- Fix issues identified by the review
- Make code improvements based on suggestions
- Update documentation if needed

### 5. Re-run Review (if needed)

If you made **significant changes** after the initial review:
- Call `code_review` again with updated description
- This ensures new changes are also validated

### 6. Run Security Checks

After code review is complete and feedback addressed:
- Run `codeql_checker` to scan for security vulnerabilities
- This must happen AFTER code_review is done
- Fix any security issues discovered
- Re-run codeql_checker to verify fixes

## Example Workflow

```bash
# 1. Make changes to your code
# ... edit files ...

# 2. Commit or report progress
# Use report_progress or git commit

# 3. Request code review
code_review(
  prTitle: "Add user profile validation",
  prDescription: "Added validation for user profile fields including:
    - Email format validation
    - Required field checks
    - Character limit enforcement
    
    Tested with unit tests in src/__tests__/profile.test.ts"
)

# 4. Review feedback and make fixes
# ... address comments ...

# 5. Re-run review if significant changes made
code_review(
  prTitle: "Add user profile validation",
  prDescription: "Updated based on review feedback:
    - Improved error messages
    - Added edge case handling
    - Fixed TypeScript type issues"
)

# 6. Run security checks
codeql_checker()

# 7. Finalize and merge
```

## When to Use Code Review

✅ **Always use before finalizing:**
- Feature implementations
- Bug fixes
- Refactoring work
- Documentation updates
- Configuration changes

❌ **Not needed for:**
- Initial repository setup (no files changed yet)
- Merge commits
- Version bumps only

## Common Issues

### "No changed files found to review"
**Solution:** The code_review tool requires actual file changes. Make sure you've committed or staged changes before calling it.

### "Review found many issues"
**Solution:** This is normal! Address the relevant ones, skip false positives, and use your engineering judgment.

### "Should I review again?"
**Solution:** Re-run review if you made significant changes. Minor fixes don't require another review.

## Best Practices

1. **Run review early** - Don't wait until the end to get feedback
2. **Write clear descriptions** - Help reviewers understand your intent
3. **Address feedback promptly** - Don't let review comments pile up
4. **Test your changes** - Ensure they work before requesting review
5. **Keep changes focused** - Smaller PRs are easier to review
6. **Follow up with security** - Always run codeql_checker after code_review

## Additional Resources

- See `.github/workflows/` for CI/CD integration
- Check `docs/SCRIPTS_GUIDE.md` for testing commands
- Review `copilot-instructions.md` for development guidelines

## Questions?

If you're unsure about the review process:
1. Check this documentation
2. Look at previous PRs for examples
3. Ask in team chat or PR comments
4. Consult the repository maintainers
