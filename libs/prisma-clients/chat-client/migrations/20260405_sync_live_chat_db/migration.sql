-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "fk_messages_conversation";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_conversation_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "conversations" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "messages" CASCADE;

