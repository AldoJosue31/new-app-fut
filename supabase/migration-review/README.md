# Migraciones locales pendientes de reconciliacion

Estos archivos estaban en `supabase/migrations`, pero no aparecen en
`supabase_migrations.schema_migrations` del proyecto remoto enlazado.

Se retiraron del directorio activo durante M1 para impedir que `db push`
intentara aplicarlos accidentalmente sobre produccion.

- Ocho tienen un equivalente remoto con el mismo nombre descriptivo y otro
  timestamp.
- `20260718060423_normalize_blank_team_contact_phones.sql` debe compararse con
  el equivalente remoto `normalize_blank_team_optional_fields`.
- `20260716215255_delegate_account_security_controls.sql` y
  `20260716220726_describe_delegate_invitation_states.sql` requieren comprobar
  si sus efectos ya existen en el esquema remoto o si son cambios pendientes.

No se debe mover ningun archivo de vuelta a `supabase/migrations` hasta contar
con un snapshot completo del esquema remoto, ejecutar un reset local limpio y
revisar el resultado. Obtener y verificar ese snapshot requiere Docker Desktop
para Supabase CLI en este entorno.
