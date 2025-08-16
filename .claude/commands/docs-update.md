RUN:
git ls-files

READ:
@ai_docs/PRD.md
@ai_docs/COMMON_GUIDE.md
@ai_docs/ARCHITECTURE.md
@README.md

**Task**: Perform a comprehensive documentation consistency audit and synchronisation.

**Instructions**:

1. **Cross-Reference Analysis**: Compare all four documents for inconsistencies in:
   - API endpoint specifications (HTTP methods, parameters, limits)
   - Technology stack descriptions and versions
   - Architectural principles and patterns (especially 3-layer state management)
   - Numeric limits and constraints (ticket counts, simulation ranges)
   - Testing strategies and requirements
   - Feature descriptions and capabilities

2. **Identify Drift Points**: Look for:
   - Information present in one document but missing in others
   - Conflicting specifications or descriptions
   - Outdated information that doesn't reflect current implementation
   - Missing cross-references between related documents

3. **Synchronisation Plan**: Create a plan to:
   - Fix all inconsistencies whilst respecting each document's purpose
   - Add missing information where appropriate
   - Ensure proper cross-referencing for detailed information
   - Maintain document hierarchy (PRD → ARCHITECTURE → COMMON_GUIDE → README)

4. **Implementation**: Execute the synchronisation plan, ensuring:
   - Technical accuracy across all documents
   - Consistent terminology and naming conventions
   - Proper markdown formatting and structure
   - All changes align with the codebase's current state

**Success Criteria**: All documentation forms a cohesive, accurate set where each document serves its purpose without conflicting information.
