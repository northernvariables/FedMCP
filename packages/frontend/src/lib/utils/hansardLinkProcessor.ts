/**
 * Processes Hansard statement content to convert reference text into clickable links
 */

/**
 * Converts the written questions reference text into a clickable link
 *
 * @param content - The statement content text
 * @returns Content with reference text converted to HTML links
 */
export function processHansardLinks(content: string): string {
  if (!content) return content;

  // English pattern: [For text of questions and responses, see Written Questions website]
  const englishPattern = /\[For text of questions and responses, see Written Questions website\]/gi;

  // French pattern (if it exists): [Pour le texte des questions et des réponses, voir le site Web des questions écrites]
  const frenchPattern = /\[Pour le texte des questions et des réponses, voir le site Web des questions écrites\]/gi;

  let processed = content;

  // Replace English version
  processed = processed.replace(
    englishPattern,
    '<a href="https://www.ourcommons.ca/written-questions/overview" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium inline-flex items-center gap-1">' +
    'For text of questions and responses, see Written Questions website' +
    '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>' +
    '</a>'
  );

  // Replace French version
  processed = processed.replace(
    frenchPattern,
    '<a href="https://www.ourcommons.ca/written-questions/overview" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium inline-flex items-center gap-1">' +
    'Pour le texte des questions et des réponses, voir le site Web des questions écrites' +
    '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>' +
    '</a>'
  );

  return processed;
}
