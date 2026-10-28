export const OWNER_ID = "11111111-1111-4111-8111-111111111111";
export const RESOURCE_ID = "22222222-2222-4222-8222-222222222222";
export const LINK_ID = "33333333-3333-4333-8333-333333333333";
export const COLLECTION_ID = "44444444-4444-4444-8444-444444444444";
export const GROUP_ID = "55555555-5555-4555-8555-555555555555";
export const AT = "2026-10-24T12:34:56.123456+00:00";

export function postgresFixture() {
  return {
    format: "linkables-postgres-snapshot", version: 1, exportedAt: AT,
    users: [{ id: OWNER_ID, email: "owner@example.test", name: "Owner", created_at: AT }],
    tables: {
      resource: [{ id: RESOURCE_ID, canonical_url: "https://example.test/article", final_url: null, rel_canonical_url: null, title: "Research", description: "Notes", author: "Author", favicon_url: null, thumbnail_url: null, content_type: "text/html", kind: "page", fetch_status: "fetched", fetch_error: null, fetched_at: AT, created_at: AT }],
      saved_link: [{ id: LINK_ID, user_id: OWNER_ID, resource_id: RESOURCE_ID, original_url: "https://example.test/article?source=personal", title_override: "My research", note: "Keep this example", pinned: true, saved_at: AT, saved_from: "extension" }],
      collection: [{ id: COLLECTION_ID, user_id: OWNER_ID, name: "Project", pinned: true, created_at: AT, last_used_at: AT, share_token: "existing-share-token", share_ungrouped: false, share_private: true }],
      collection_group: [{ id: GROUP_ID, collection_id: COLLECTION_ID, name: "Sources", position: 0, shared: false, created_at: AT }],
      collection_item: [{ collection_id: COLLECTION_ID, saved_link_id: LINK_ID, group_id: GROUP_ID, created_at: AT }],
      resource_reader: [{ resource_id: RESOURCE_ID, status: "ok", article: { title: "Research", byline: null, siteName: null, minutes: 1, truncated: false, blocks: [{ type: "paragraph", content: [{ text: "Readable source content" }] }] }, reason: null, fetched_at: AT }],
      job: [{ id: "7", resource_id: RESOURCE_ID, run_after: AT, locked_until: AT, attempts: 2, last_error: null, created_at: AT }],
      access_request: [],
      share_allowed_email: [{ collection_id: COLLECTION_ID, email: "reader@example.test", created_at: AT }],
      share_code: [{ ephemeral: true }], share_viewer_session: [{ ephemeral: true }],
    },
  };
}
