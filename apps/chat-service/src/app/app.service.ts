import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversations(userId: number) {
    // Find all conversations where user is buyer OR user is seller.
    const convs = await this.prisma.conversations.findMany({
      where: {
        OR: [
          { buyer_id: userId },
          { seller_id: userId }
        ]
      },
      orderBy: { updated_at: 'desc' }
    });
    return convs;
  }

  async createOrGetConversation(buyerId: number, shopId: number, sellerId: number) {
    // Check if exists
    let conv = await this.prisma.conversations.findFirst({
      where: { buyer_id: buyerId, shop_id: shopId }
    });

    if (!conv) {
      conv = await this.prisma.conversations.create({
        data: {
          buyer_id: buyerId,
          seller_id: sellerId,
          shop_id: shopId,
          status: 'active',
          unread_count_buyer: 0,
          unread_count_seller: 0
        }
      });
    }

    return conv;
  }

  async getMessages(conversationId: number, userId: number) {
    // First Validate user is part of the conversation
    const conv = await this.prisma.conversations.findUnique({
      where: { id: conversationId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.buyer_id !== userId && conv.seller_id !== userId) {
      throw new BadRequestException('Not authorized to view this chat');
    }

    // Reset unread counts
    if (conv.buyer_id === userId) {
      await this.prisma.conversations.update({
        where: { id: conversationId },
        data: { unread_count_buyer: 0 }
      });
    } else {
      await this.prisma.conversations.update({
        where: { id: conversationId },
        data: { unread_count_seller: 0 }
      });
    }

    return this.prisma.messages.findMany({
      where: { conversation_id: conversationId },
      orderBy: { sent_at: 'asc' }
    });
  }

  async sendMessage(conversationId: number, senderId: number, content: string) {
    const conv = await this.prisma.conversations.findUnique({
      where: { id: conversationId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.buyer_id !== senderId && conv.seller_id !== senderId) {
      throw new BadRequestException('Not authorized');
    }

    const senderRole = conv.buyer_id === senderId ? 'buyer' : 'seller';
    
    // Increment unread count for the other party
    const updateData: any = {
      last_message_preview: content.substring(0, 50),
      updated_at: new Date()
    };
    if (senderRole === 'buyer') {
      updateData.unread_count_seller = { increment: 1 };
    } else {
      updateData.unread_count_buyer = { increment: 1 };
    }

    await this.prisma.conversations.update({
      where: { id: conversationId },
      data: updateData
    });

    return this.prisma.messages.create({
      data: {
        conversation_id: conversationId,
        sender_id: senderId,
        sender_role: senderRole,
        content,
        message_type: 'text'
      }
    });
  }
}
