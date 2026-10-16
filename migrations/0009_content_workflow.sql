CREATE TABLE content_items(
 id varchar(36) NOT NULL PRIMARY KEY, created_by varchar(36) NOT NULL, assigned_to varchar(36) NOT NULL,
 revision_sequence int unsigned NOT NULL DEFAULT 0, created_at datetime(3) NOT NULL,
 CONSTRAINT content_creator_fk FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT content_assigned_fk FOREIGN KEY(assigned_to) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 INDEX content_owner_idx(created_by,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE content_revisions(
 id varchar(36) NOT NULL PRIMARY KEY, post_id varchar(36) NOT NULL, sequence int unsigned NOT NULL,
 created_by varchar(36) NOT NULL, request_id varchar(36) NOT NULL, request_digest binary(32) NOT NULL,
 title varchar(160) NOT NULL, language enum('ENGLISH','URDU','ROMAN_URDU','MIXED') NOT NULL,
 source enum('MANUAL','HUMAN_EDITED','AI_GENERATED','AI_EDITED') NOT NULL, generation_id varchar(36) NULL,
 generation_provider varchar(40) NULL,generation_model varchar(160) NULL,generation_brand_revision int unsigned NULL,
 brand_revision int unsigned NOT NULL, validated boolean NOT NULL, created_at datetime(3) NOT NULL,
 CONSTRAINT content_revision_parent_fk FOREIGN KEY(post_id) REFERENCES content_items(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT content_revision_actor_fk FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT content_generation_fk FOREIGN KEY(generation_id) REFERENCES ai_generations(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT content_revision_bounds CHECK(sequence>0 AND brand_revision>0 AND CHAR_LENGTH(title) BETWEEN 1 AND 160 AND validated IN(0,1)),
 CONSTRAINT content_source CHECK((source IN('MANUAL','HUMAN_EDITED') AND generation_id IS NULL AND generation_provider IS NULL AND generation_model IS NULL AND generation_brand_revision IS NULL) OR (source IN('AI_GENERATED','AI_EDITED') AND generation_id IS NOT NULL AND generation_provider IS NOT NULL AND generation_model IS NOT NULL AND generation_brand_revision IS NOT NULL AND generation_brand_revision>0)),
 UNIQUE KEY content_revision_author(post_id,id,created_by), UNIQUE KEY content_sequence(post_id,sequence), UNIQUE KEY content_revision_parent(post_id,id), UNIQUE KEY content_save_once(created_by,request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE content_variants(
 revision_id varchar(36) NOT NULL, platform enum('FACEBOOK','INSTAGRAM','TIKTOK','YOUTUBE','LINKEDIN') NOT NULL,
 content_json json NOT NULL, PRIMARY KEY(revision_id,platform),
 CONSTRAINT content_variant_fk FOREIGN KEY(revision_id) REFERENCES content_revisions(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT content_variant_value CHECK(JSON_TYPE(content_json)='OBJECT' AND JSON_STORAGE_SIZE(content_json)<=32768)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE content_revision_authors(
 post_id varchar(36) NOT NULL,revision_id varchar(36) NOT NULL,user_id varchar(36) NOT NULL,authored_revision_id varchar(36) NOT NULL,PRIMARY KEY(revision_id,user_id),
 CONSTRAINT content_author_revision_fk FOREIGN KEY(post_id,revision_id) REFERENCES content_revisions(post_id,id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT content_author_origin_fk FOREIGN KEY(post_id,authored_revision_id,user_id) REFERENCES content_revisions(post_id,id,created_by) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE content_revision_facts(
 revision_id varchar(36) NOT NULL, category enum('PRICE','DISCOUNT','STOCK','WARRANTY','INSTALLMENT','SPECIFICATION','ADDRESS','CONTACT','DELIVERY','INSTALLATION','SUPERLATIVE','EXCLUSIVITY','PARTNERSHIP') NOT NULL,
 source enum('USER_INPUT','BRAND_FACT','BRAND_CONTACT','BRAND_LOCATION') NOT NULL, source_record_id varchar(36) NULL, resolved_value varchar(1600) NOT NULL,
 PRIMARY KEY(revision_id,category),CONSTRAINT content_fact_revision_fk FOREIGN KEY(revision_id) REFERENCES content_revisions(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT content_fact_identity CHECK((source='USER_INPUT' AND source_record_id IS NULL) OR (source<>'USER_INPUT' AND source_record_id IS NOT NULL)),
 CONSTRAINT content_fact_value CHECK(CHAR_LENGTH(resolved_value) BETWEEN 1 AND 1600)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE content_revision_media(
 revision_id varchar(36) NOT NULL,media_id varchar(36) NOT NULL,position int NOT NULL,
 PRIMARY KEY(revision_id,media_id), UNIQUE KEY content_media_order(revision_id,position),
 CONSTRAINT content_media_revision_fk FOREIGN KEY(revision_id) REFERENCES content_revisions(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT content_media_asset_fk FOREIGN KEY(media_id) REFERENCES media_assets(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT content_media_position CHECK(position BETWEEN 0 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE content_submissions(
 id varchar(36) NOT NULL PRIMARY KEY,post_id varchar(36) NOT NULL,revision_id varchar(36) NOT NULL,submitted_by varchar(36) NOT NULL,request_id varchar(36) NOT NULL,
 state enum('PENDING','APPROVED','CHANGES_REQUESTED','REJECTED') NOT NULL, submitted_at datetime(3) NOT NULL,validation_brand_revision int unsigned NOT NULL,
 active_post_id varchar(36) GENERATED ALWAYS AS (CASE WHEN state='PENDING' THEN post_id ELSE NULL END) STORED,
 CONSTRAINT content_submission_revision_fk FOREIGN KEY(post_id,revision_id) REFERENCES content_revisions(post_id,id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT content_submitter_fk FOREIGN KEY(submitted_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT content_submission_policy CHECK(validation_brand_revision>0),
 UNIQUE KEY content_one_submission_revision(revision_id), UNIQUE KEY content_active_review(active_post_id),UNIQUE KEY content_submission_binding(id,post_id,revision_id),UNIQUE KEY content_submit_once(submitted_by,request_id),
 INDEX content_review_queue(state,id), INDEX content_review_history(post_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE content_decisions(
 id varchar(36) NOT NULL PRIMARY KEY,submission_id varchar(36) NOT NULL,post_id varchar(36) NOT NULL,revision_id varchar(36) NOT NULL,
 decided_by varchar(36) NOT NULL,request_id varchar(36) NOT NULL,decision enum('APPROVED','CHANGES_REQUESTED','REJECTED') NOT NULL,
 note varchar(1000) NOT NULL,self_approval boolean NOT NULL,brand_revision int unsigned NOT NULL,created_at datetime(3) NOT NULL,
 CONSTRAINT content_decision_submission_fk FOREIGN KEY(submission_id,post_id,revision_id) REFERENCES content_submissions(id,post_id,revision_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT content_decider_fk FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT content_decision_bounds CHECK(CHAR_LENGTH(note)<=1000 AND self_approval IN(0,1) AND brand_revision>0 AND (decision='APPROVED' OR CHAR_LENGTH(TRIM(note))>0)),
 UNIQUE KEY content_one_decision(submission_id),UNIQUE KEY content_decide_once(decided_by,request_id), INDEX content_approved(post_id,decision,revision_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE content_media_protection(
 media_id varchar(36) NOT NULL PRIMARY KEY,protected_until datetime(3) NOT NULL,
 CONSTRAINT content_protection_media_fk FOREIGN KEY(media_id) REFERENCES media_assets(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 INDEX content_protection_expiry(protected_until,media_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
