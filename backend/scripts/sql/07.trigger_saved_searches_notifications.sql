-- Trigger to automatically disable notifications for saved searches
-- when the user has enabled the 'new_property_match_saved_search' notification type

CREATE OR REPLACE TRIGGER trg_saved_searches_notification
BEFORE INSERT OR UPDATE ON saved_searches
FOR EACH ROW
WHEN (NEW.is_notification_enabled = 1)
DECLARE
    v_notification_preferences CLOB;
    v_has_notification_type NUMBER;
BEGIN
    -- Get the notification preferences from the user
    SELECT enabled_notification_types
    INTO v_notification_preferences
    FROM users
    WHERE id = :NEW.user_id;
    
    -- Check if 'new_property_match_saved_search' exists in the JSON array
    -- Using JSON_EXISTS to check if the notification type is present
    SELECT CASE 
        WHEN JSON_EXISTS(
            v_notification_preferences, 
            '$[*]?(@ == "new_property_match_saved_search")'
        ) THEN 1
        ELSE 0
    END
    INTO v_has_notification_type
    FROM DUAL;
    
    -- If the notification type is NOT in the preferences, disable notifications
    IF v_has_notification_type = 0 THEN
        :NEW.is_notification_enabled := 0;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error or handle as needed
        RAISE;
END;
/

-- Trigger to disable saved_searches notifications when user removes 
-- 'new_property_match_saved_search' from their enabled notification types

CREATE OR REPLACE TRIGGER trg_users_notification_prefs
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
DECLARE
    v_has_notification_type NUMBER;
BEGIN
    -- Check if 'new_property_match_saved_search' exists in the JSON array
    SELECT CASE 
        WHEN JSON_EXISTS(
            :NEW.enabled_notification_types, 
            '$[*]?(@ == "new_property_match_saved_search")'
        ) THEN 1
        ELSE 0
    END
    INTO v_has_notification_type
    FROM DUAL;
    
    -- If the notification type is NOT in the preferences, disable all saved searches notifications
    IF v_has_notification_type = 0 THEN
        UPDATE saved_searches 
        SET is_notification_enabled = 0 
        WHERE user_id = :NEW.id;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error or handle as needed
        RAISE;
END;
/

-- Trigger to delete notifications not sent yet when user removes 
-- 'new_property_match_saved_search' from their enabled notification types

CREATE OR REPLACE TRIGGER trg_users_delete_unsent_notifications
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
DECLARE
    v_has_notification_type NUMBER;
BEGIN
    -- Check if 'new_property_match_saved_search' exists in the JSON array
    SELECT CASE 
        WHEN JSON_EXISTS(
            :NEW.enabled_notification_types, 
            '$[*]?(@ == "new_property_match_saved_search")'
        ) THEN 1
        ELSE 0
    END
    INTO v_has_notification_type
    FROM DUAL;
    
    -- If the notification type is NOT in the preferences, delete unsent notifications
    IF v_has_notification_type = 0 THEN
        DELETE FROM notifications
        WHERE user_id = :NEW.id
          AND sent_at IS NULL
          AND type = 'new_property_match_saved_search';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error or handle as needed
        RAISE;
END;
/
