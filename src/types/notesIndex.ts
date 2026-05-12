/** tree node from index */
export type NotesIndexTopic = {
  slug: string;
  title: string;
  path?: string[];
  children: NotesIndexTopic[];
};

export type NotesIndexSubject = {
  title: string;
  coverImageUrl: string;
  slug: string;
  topics: NotesIndexTopic[];
};

/** tree per subject, no repetition. */
export type NotesIndex = {
  subjects: Record<string, NotesIndexSubject>;
};

/** find a topic node by slug in the tree. returns node with path/children. */
export function findTopicInNotesTree(
  topics: NotesIndexTopic[],
  targetSlug: string
): NotesIndexTopic | null {
  for (const t of topics) {
    if (t.slug === targetSlug) return t;
    const found = findTopicInNotesTree(t.children, targetSlug);
    if (found) return found;
  }
  return null;
}
