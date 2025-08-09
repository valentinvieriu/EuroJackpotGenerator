Perform a comprehensive deployment readiness check:

1. Run `npm run lint` and fix any linting issues
1. Run `npm test` to ensure all tests pass
1. Run `npm run format` to ensure code is properly formatted and `npm run format` if needed to fix it
1. Check that all environment variables are documented
1. Verify package.json dependencies are up to date
1. Confirm no sensitive data in source code
1. Check that the server starts without errors (`npm start`)
