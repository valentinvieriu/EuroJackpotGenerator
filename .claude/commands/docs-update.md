RUN:
git ls-files

READ:
@ai_docs/PRD.md
@ai_docs/COMMON_GUIDE.md
@ai_docs/ARCHITECTURE.md
@ai_docs/DESIGN_SYSTEM.md
@README.md

**Task**: Ultrathink and perform a comprehensive documentation consistency audit and synchronisation.

**Document Roles & Boundaries**:

- **README.md**: Human-targeted general project knowledge. Should be accessible, welcoming, and explain "what this project does" without overwhelming technical details. Include basic setup commands (`npm install`, `npm run dev`) to meet developer expectations, but link to detailed guides rather than duplicating content.
- **PRD.md**: Human+LLM product requirements. Focus on WHAT we're building and WHY, with minimal technical implementation details.
- **COMMON_GUIDE.md**: Universal LLM introduction (not Claude-specific). Comprehensive overview with pointers for further exploration, including project setup, debugging, and coding standards. Think "CLAUDE.md but for all LLMs".
- **ARCHITECTURE.md**: LLM technical guide. Medium-level architecture with clear recommendations and best practices. Use pseudo code only - never maintain real code samples.
- **DESIGN_SYSTEM.md**: Token-first design system documentation. Defines the casino theme, Tailwind v4 token mapping, colour systems, accessibility standards, and component patterns. Enforces consistent UI implementation through semantic tokens and utilities.

**Content Governance Rules**:

- Technical implementation details → ARCHITECTURE.md ONLY
- Product requirements & specifications → PRD.md ONLY
- Design tokens, UI patterns & component standards → DESIGN_SYSTEM.md ONLY
- Real code samples → FORBIDDEN (pseudo code acceptable)
- Cross-references should prevent duplication, not create circular dependencies
- Each document must serve its specific audience without overlap

**Markdown Formatting Standards**:

- **List Formatting**:
  - Numbered lists: Use `1.` for ALL items (auto-increments, easier reordering, cleaner git diffs)
  - Bullet lists: Use `-` consistently (not `*` or `+`)
  - Nested lists: 2-space indentation for sub-items

- **Heading Hierarchy**:
  - Use ATX-style headers (`#` not `===`)
  - Don't skip heading levels (H1 → H2 → H3, not H1 → H3)
  - Maximum 4 levels deep for readability

- **Code Formatting**:
  - Always specify language: ` ```bash `, ` ```typescript `, ` ```pseudocode `
  - Inline code for single terms: ` `useState` `
  - Code blocks for multi-line examples

- **Link Management**:
  - Descriptive link text (not "click here" or raw URLs)
  - Relative paths for internal documents: `./ARCHITECTURE.md`
  - Reference-style links for repeated URLs when appropriate

- **Text Emphasis**:
  - Bold: `**text**` for important concepts and section headers
  - Italic: `_text_` for emphasis or first use of terms
  - Code: `` `text` `` for technical terms, file paths, and commands

- **Document Structure**:
  - Use horizontal rules (`---`) to separate major sections
  - Consistent spacing: blank line before/after headers, lists, code blocks
  - 80-character line length target (soft limit for readability)

**Instructions**:

1. **Cross-Reference Analysis**: Compare all five documents for inconsistencies in:
   - API endpoint specifications (HTTP methods, parameters, limits)
   - Technology stack descriptions and versions
   - Architectural principles and patterns (especially 3-layer state management)
   - Design system tokens, colour schemes, and component patterns
   - UI/UX accessibility standards and implementation guidelines
   - Numeric limits and constraints (ticket counts, simulation ranges)
   - Testing strategies and requirements
   - Feature descriptions and capabilities

2. **Identify Drift Points**: Look for:
   - Information present in one document but missing in others
   - Conflicting specifications or descriptions
   - Outdated information that doesn't reflect current implementation
   - Missing cross-references between related documents
   - **Role Boundary Violations**: Technical details in README.md, product specs in ARCHITECTURE.md, design tokens outside DESIGN_SYSTEM.md
   - **Audience Misalignment**: LLM-specific content in human docs, overly technical language in general docs
   - **Maintenance Burden**: Real code samples that require updates, duplicated content across files
   - **Design System Violations**: Hardcoded styles, inconsistent token usage, accessibility gaps

3. **Synchronisation Plan**: Create a plan to:
   - Fix all inconsistencies whilst respecting each document's purpose
   - Add missing information where appropriate
   - Ensure proper cross-referencing for detailed information
   - Maintain document hierarchy (PRD → ARCHITECTURE + DESIGN_SYSTEM → COMMON_GUIDE → README)
   - Align design system tokens with architectural principles and product requirements

4. **Implementation**: Execute the synchronisation plan, ensuring:
   - Technical accuracy across all documents
   - Consistent terminology and naming conventions
   - Proper markdown formatting and structure
   - All changes align with the codebase's current state
   - **Document Role Compliance**: Each document stays within its intended audience and scope
   - **Content Boundary Enforcement**: No technical implementation in PRD.md, no product specs in ARCHITECTURE.md, design tokens only in DESIGN_SYSTEM.md
   - **Universal LLM Appeal**: COMMON_GUIDE.md works for any LLM, not just Claude-specific
   - **Design System Consistency**: All UI references align with token-first approach and accessibility standards

**Additional Validation Requirements**:

5. **Documentation Maintenance Strategy**:
   - Remove any real code samples (replace with pseudo code or examples)
   - Eliminate version-specific references that become outdated
   - Use conceptual descriptions instead of implementation details
   - Prefer stable architectural patterns over specific library usage

6. **Content Overlap Prevention**:
   - If information exists in multiple documents, choose the most appropriate home and reference from others
   - README.md should link to detailed docs rather than duplicate content
   - PRD.md should focus on WHAT/WHY, ARCHITECTURE.md on HOW (conceptually), DESIGN_SYSTEM.md on UI/UX standards
   - COMMON_GUIDE.md should provide overview + pointers, not detailed explanations
   - Design tokens and UI patterns belong exclusively in DESIGN_SYSTEM.md

7. **Audience Tone Alignment**:
   - README.md: Welcoming, accessible language explaining project value to newcomers with immediate setup commands for developers
   - PRD.md: Professional requirement language for stakeholders and LLMs
   - COMMON_GUIDE.md: Instructional tone for LLMs with clear, actionable guidance
   - ARCHITECTURE.md: Technical precision with architectural reasoning and trade-offs
   - DESIGN_SYSTEM.md: Authoritative design documentation with enforceable standards and practical examples

8. **Update Trigger Prevention**:
   - Avoid specific API URLs, version numbers, or dependency lists
   - Use relative paths and conceptual references
   - Focus on stable patterns rather than implementation specifics
   - Ensure documentation changes only when architecture/requirements fundamentally change

9. **Strategic Cross-Referencing**:
   - README.md → detailed docs for technical information
   - PRD.md → ARCHITECTURE.md for implementation approaches, DESIGN_SYSTEM.md for UI requirements
   - COMMON_GUIDE.md → specific docs for deep dives
   - ARCHITECTURE.md → PRD.md for business context, DESIGN_SYSTEM.md for UI implementation standards
   - DESIGN_SYSTEM.md → ARCHITECTURE.md for component architecture, PRD.md for brand requirements
   - Never create circular references or assumption chains

**Success Criteria**: All documentation forms a cohesive, accurate set where each document serves its specific purpose and intended audience without conflicting information or role boundary violations.
