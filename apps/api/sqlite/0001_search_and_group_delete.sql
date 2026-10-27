CREATE VIRTUAL TABLE saved_link_search USING fts5(link_id UNINDEXED, content, tokenize = 'porter unicode61');
--> statement-breakpoint
INSERT INTO saved_link_search(link_id, content) SELECT l.id, coalesce(l.title_override, r.title, '') || ' ' || coalesce(r.description, '') || ' ' || replace(substr(substr(r.canonical_url, instr(r.canonical_url, '://') + 3), 1, instr(substr(r.canonical_url, instr(r.canonical_url, '://') + 3) || '/', '/') - 1), '.', ' ') FROM saved_link l JOIN resource r ON r.id = l.resource_id;
--> statement-breakpoint
CREATE TRIGGER saved_link_search_insert AFTER INSERT ON saved_link BEGIN
  INSERT INTO saved_link_search(link_id, content) SELECT new.id, coalesce(new.title_override, r.title, '') || ' ' || coalesce(r.description, '') || ' ' || replace(substr(substr(r.canonical_url, instr(r.canonical_url, '://') + 3), 1, instr(substr(r.canonical_url, instr(r.canonical_url, '://') + 3) || '/', '/') - 1), '.', ' ') FROM resource r WHERE r.id = new.resource_id;
END;
--> statement-breakpoint
CREATE TRIGGER saved_link_search_delete AFTER DELETE ON saved_link BEGIN
  DELETE FROM saved_link_search WHERE link_id = old.id;
END;
--> statement-breakpoint
CREATE TRIGGER saved_link_search_update AFTER UPDATE OF title_override, resource_id ON saved_link BEGIN
  DELETE FROM saved_link_search WHERE link_id = old.id;
  INSERT INTO saved_link_search(link_id, content) SELECT new.id, coalesce(new.title_override, r.title, '') || ' ' || coalesce(r.description, '') || ' ' || replace(substr(substr(r.canonical_url, instr(r.canonical_url, '://') + 3), 1, instr(substr(r.canonical_url, instr(r.canonical_url, '://') + 3) || '/', '/') - 1), '.', ' ') FROM resource r WHERE r.id = new.resource_id;
END;
--> statement-breakpoint
CREATE TRIGGER resource_search_update AFTER UPDATE OF title, description, canonical_url ON resource BEGIN
  DELETE FROM saved_link_search WHERE link_id IN (SELECT id FROM saved_link WHERE resource_id = new.id);
  INSERT INTO saved_link_search(link_id, content) SELECT l.id, coalesce(l.title_override, new.title, '') || ' ' || coalesce(new.description, '') || ' ' || replace(substr(substr(new.canonical_url, instr(new.canonical_url, '://') + 3), 1, instr(substr(new.canonical_url, instr(new.canonical_url, '://') + 3) || '/', '/') - 1), '.', ' ') FROM saved_link l WHERE l.resource_id = new.id;
END;
--> statement-breakpoint
CREATE TRIGGER collection_group_ungroup BEFORE DELETE ON collection_group BEGIN
  UPDATE collection_item SET group_id = NULL WHERE collection_id = old.collection_id AND group_id = old.id;
END;
