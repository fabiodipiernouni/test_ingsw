BEGIN
  FOR r IN (
    SELECT constraint_name
    FROM user_constraints
    WHERE table_name = 'USERS' AND constraint_type = 'R'
  ) LOOP
    EXECUTE IMMEDIATE 'ALTER TABLE USERS ENABLE CONSTRAINT ' || r.constraint_name;
  END LOOP;
END;