ALTER TABLE blocks
  ADD COLUMN cbtx_version               INT,
  ADD COLUMN cbtx_height                INT,
  ADD COLUMN cbtx_merkle_root_quorums   TEXT,
  ADD COLUMN cbtx_best_cl_height_diff   BIGINT,
  ADD COLUMN cbtx_best_cl_signature     TEXT;