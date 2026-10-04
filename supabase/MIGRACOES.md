# Migrações do banco (Supabase)

Produção: projeto **Echo** (`fcgizoopltqrldixvyve`). As migrações são aplicadas à mão, sempre junto com a
versão do app que depende delas (veja o aviso ⚠️ no topo de cada arquivo). Testes: `node supabase/tests/migrations.test.mjs`.

## O que está aplicado em produção (01/10/2026)

| Registro em produção | Arquivo neste repositório |
|---|---|
| `migration_04_subscriptions` | `migration_04_subscriptions.sql` |
| `migration_07_group_dms_blocked_users` | **sem arquivo** (grupos, DMs em grupo e bloqueios) |
| `migration_08_protect_subscription_fields` | `migration_07_protect_subscription_fields.sql` (número diferente) |
| `migration_09_rls_hardening_and_indexes` | **sem arquivo** (RLS e índices) |
| `migration_10_cleanup_trigger_and_last_policy` | **sem arquivo** |
| `space_invites_system` | `migration_08_space_invites.sql` |
| `lock_space_access` | `migration_09_lock_space_access.sql` |
| `transfer_space_ownership` + `migration_10_transfer_space_ownership_utf8` | `migration_10_transfer_space_ownership.sql` |
| `migration_11_discord_roles` + `migration_11_discord_roles_security_fixes` | `migration_11_discord_roles.sql` (o arquivo tem correções de segurança testadas; não foi possível confirmar que é idêntico ao que está em produção) |
| `migration_12_fix_group_chat_rls` | `migration_12_fix_group_chat_rls.sql` |
| `migration_13_privacidade_tempo_real` | `migration_13_privacidade_tempo_real.sql` (aplicada em 01/10/2026; desfazer com `rollback_13_privacidade_tempo_real.sql`) |
| `migration_14_topicos` | `migration_14_topicos.sql` (aplicada em 04/10/2026; respostas em tópico; desfazer com `rollback_14_topicos.sql`) |

As migrações 01–03, 05 e 06 e os arquivos avulsos (`schema.sql`, `update_rls.sql`, `fix_chat_and_rls.sql`,
`server_roles_and_settings.sql`) não aparecem no registro de migrações de produção (provavelmente foram aplicados pelo editor SQL, sem registro).

## Como fechar o descompasso de vez

Três registros de produção não têm arquivo aqui. O jeito seguro de trazê-los (sem copiar SQL à mão) é puxar o
esquema real com a CLI do Supabase, uma vez:

```
npx supabase login
npx supabase link --project-ref fcgizoopltqrldixvyve
npx supabase db pull
```

Isso gera `supabase/migrations/<data>_remote_schema.sql` com o esquema exato de produção. A partir daí, cada
mudança nova vira um arquivo em `supabase/migrations/` (`npx supabase migration new <nome>`) e o registro de
produção passa a bater com o repositório.
