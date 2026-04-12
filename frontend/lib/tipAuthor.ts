/**
 * Triggers the Web3 tipping flow.
 * Structured so that wallet and transaction logic can be dropped in later
 * without component changes.
 */
export async function tipAuthor(authorId: string): Promise<void> {
  console.log(`[Tipping] Preparing to tip author ${authorId}`);
  alert(`Web3 tipping coming soon for @${authorId}`);
}
