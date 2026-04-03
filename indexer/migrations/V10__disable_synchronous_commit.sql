DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I SET synchronous_commit = off', current_database());
END
$$;