/** topic node in flashcards index tree */
export type FlashcardsIndexTopic = {
  id: number;
  slug: string;
  title: string;
  deckCount: number;
  cardCount: number;
  children: FlashcardsIndexTopic[];
};

export type FlashcardsIndexSubject = {
  id: number;
  slug: string;
  title: string;
  coverImageUrl: string;
  deckCount: number;
  cardCount: number;
  topics: FlashcardsIndexTopic[];
};

export type FlashcardsIndex = {
  subjects: Record<string, FlashcardsIndexSubject>;
};

/** find topic node from slug */
export function findTopicInFlashcardsTree(
  topics: FlashcardsIndexTopic[],
  targetSlug: string
): FlashcardsIndexTopic | null {
  for (const t of topics) {
    if (t.slug === targetSlug) return t;
    const found = findTopicInFlashcardsTree(t.children, targetSlug);
    if (found) return found;
  }
  return null;
}

/** collect leaf topics (deckCount > 0, children.length === 0) in order */
export function collectLeafTopics(topics: FlashcardsIndexTopic[]): FlashcardsIndexTopic[] {
  const out: FlashcardsIndexTopic[] = [];
  function walk(list: FlashcardsIndexTopic[]) {
    for (const t of list) {
      if (t.children.length === 0 && t.deckCount > 0) out.push(t);
      else walk(t.children);
    }
  }
  walk(topics);
  return out;
}
