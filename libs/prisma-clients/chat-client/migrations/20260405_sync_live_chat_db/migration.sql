-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "fk_messages_conversation";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_fkey";

-- DropTable
DROP TABLE "conversations";

-- DropTable
DROP TABLE "messages";

