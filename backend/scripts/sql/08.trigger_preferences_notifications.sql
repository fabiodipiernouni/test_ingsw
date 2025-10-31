
-- Trigger to prevent creating notifications for users who have removed 
-- notification types from their enabled notification types

CREATE OR REPLACE TRIGGER trg_prevent_disabled_notifications
BEFORE INSERT OR UPDATE ON notifications
FOR EACH ROW
DECLARE
    v_has_notification_type NUMBER;
    v_notification_preferences USERS.enabled_notification_types%TYPE;
BEGIN
    -- Get the notification preferences from the user
    SELECT enabled_notification_types
    INTO v_notification_preferences
    FROM users
    WHERE users.id = :NEW.user_id;

    -- Check if NEW.type exists in the JSON array

    SELECT COUNT(*) INTO v_has_notification_type
    FROM JSON_TABLE(
        v_notification_preferences,
        '$[*]' COLUMNS (val VARCHAR2(4000) PATH '$')
    ) jt
    WHERE jt.val = :NEW.type;
    
    -- If the notification type is NOT in the preferences, prevent insertion
    IF v_has_notification_type = 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'User has disabled ' || :NEW.type || ' notification type.');
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error or handle as needed
        RAISE;
END;
/