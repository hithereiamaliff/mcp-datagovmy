/**
 * Helper functions for consistent tool naming
 */

/**
 * Adds the "datagovmy_" prefix to a tool name
 * @param toolName The original tool name
 * @returns The prefixed tool name
 */
export function prefixToolName(toolName: string): string {
  // Don't add prefix if it already exists
  if (toolName.startsWith('datagovmy_')) {
    return toolName;
  }
  return `datagovmy_${toolName}`;
}
