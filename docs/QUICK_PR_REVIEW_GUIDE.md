# Quick PR Review Guide

**Question: How do I initiate review of this pull request?**

## Quick Answer

There are two ways to initiate a PR review:

### Option 1: Automated Review (Recommended)

```bash
# After making and committing your changes:
code_review(
  prTitle: "Brief title of your changes",
  prDescription: "What changed and why"
)
```

**Requirements:**
- Must have committed file changes
- Repository must have a base branch to compare against
- Works for code, configuration, and documentation changes

### Option 2: Manual Review (Alternative)

1. Push your changes: `git push origin your-branch`
2. Go to GitHub and create a Pull Request
3. Add reviewers from your team
4. Wait for feedback and approval

**When to use:**
- Automated tool is unavailable
- Repository has no base branch
- Prefer human review for complex changes

## Full Process

See [PR_REVIEW_PROCESS.md](./PR_REVIEW_PROCESS.md) for complete details including:
- Step-by-step workflow
- Example code
- Troubleshooting
- Best practices
- Security integration

## Common Issues

**"No changed files found to review"**
- Solution: Ensure you've committed changes and a base branch exists

**Tool not working in new repository**
- Solution: Use manual review via GitHub PR interface

## Security Note

After code review, always run:
```bash
codeql_checker()
```

This scans for security vulnerabilities in your code changes.

---

**For detailed guidance, see:** [docs/PR_REVIEW_PROCESS.md](./PR_REVIEW_PROCESS.md)
