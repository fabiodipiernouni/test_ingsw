ALTER TABLE PROPERTIES ADD GEOM_POINT SDO_GEOMETRY
/

create index UNINADEV.IDX_PROPERTY_GEOM_POINT
    on UNINADEV.PROPERTIES (GEOM_POINT)
    indextype is MDSYS.SPATIAL_INDEX
/

create or replace trigger TRG_PROPERTY_GEO_SYNC
    before insert or update
    on PROPERTIES
    for each row
    when (NEW.GEO_LOCATION IS NOT NULL)
BEGIN
  DECLARE
    lon NUMBER;
    lat NUMBER;
  BEGIN
    lon := TO_NUMBER(REPLACE(JSON_VALUE(:NEW.GEO_LOCATION, '$.coordinates[0]'), '.', ','));
    lat := TO_NUMBER(REPLACE(JSON_VALUE(:NEW.GEO_LOCATION, '$.coordinates[1]'), '.', ','));

    :NEW.GEOM_POINT := SDO_GEOMETRY(
      2001,
      4326,
      SDO_POINT_TYPE(lon, lat, NULL),
      NULL,
      NULL
    );
  EXCEPTION
    WHEN OTHERS THEN
      :NEW.GEOM_POINT := NULL;
  END;
END;
/