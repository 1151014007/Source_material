from uuid import uuid4

from sqlalchemy import Column, Integer, MetaData, Table, inspect, text


def test_private_test_tables_do_not_resolve_to_existing_public_tables(sessions):
    name = "shadow_" + uuid4().hex
    with sessions() as db:
        schema = db.scalar(text("SELECT current_schema()"))
        db.execute(text(f'CREATE TABLE public."{name}" (id INTEGER PRIMARY KEY)'))
        db.commit()
        try:
            table = Table(name, MetaData(), Column("id", Integer, primary_key=True))
            table.create(db.get_bind(), checkfirst=True)
            assert inspect(db.get_bind()).has_table(name, schema=schema)
        finally:
            db.execute(text(f'DROP TABLE public."{name}"'))
            db.commit()
