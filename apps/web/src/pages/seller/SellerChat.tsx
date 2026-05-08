import { FC, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';

interface Conversation {
  id: number;
  buyer_id: number;
  seller_id: number;
  shop_id: number;
  last_message_preview: string | null;
  updated_at: string;
  unread_count_seller: number;
  buyer_name?: string;
  seller_name?: string;
  shop_name?: string;
}

interface Message {
  id: number;
  sender_id: number;
  sender_role: string;
  content: string;
  sent_at: string;
}

const SellerChat: FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentConvId, setCurrentConvId] = useState<number | null>(null);
  const [chatText, setChatText] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('c2c_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  useEffect(() => {
    const convIdStr = searchParams.get('convId');
    if (convIdStr) setCurrentConvId(parseInt(convIdStr));
  }, [searchParams]);

  // Polling Conversations
  useEffect(() => {
    if (!currentUser) return;
    const fetchConvs = async () => {
      try {
        const token = localStorage.getItem('c2c_token');
        const res = await fetch('/api/chat/conversations', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setConversations(await res.json());
      } catch (e) {}
    };
    fetchConvs();
    const interval = setInterval(fetchConvs, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Polling Messages
  useEffect(() => {
    if (!currentUser || !currentConvId) return;
    const fetchMsgs = async () => {
      try {
        const token = localStorage.getItem('c2c_token');
        const res = await fetch(`/api/chat/conversations/${currentConvId}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setMessages(await res.json());
      } catch (e) {}
    };
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 3000);
    return () => clearInterval(interval);
  }, [currentUser, currentConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || !currentConvId) return;
    const token = localStorage.getItem('c2c_token');
    const content = chatText;
    setChatText('');

    // Optimistic
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender_id: currentUser.id,
      sender_role: 'seller',
      content,
      sent_at: new Date().toISOString()
    }]);

    try {
      await fetch(`/api/chat/conversations/${currentConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content })
      });
    } catch (err) {}
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count_seller || 0), 0);

  return (
    <SellerLayout pageTitle="Tin nhắn">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb] overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
          <div className="flex h-full">

            {/* Sidebar */}
            <div className="w-[340px] border-r border-[#e4e9f0] flex flex-col">
              <div className="p-6 border-b border-[#e4e9f0]">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">Hộp thư</h2>
                  {totalUnread > 0 && (
                    <span className="bg-[#d32f2f] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{totalUnread} mới</span>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <span className="material-symbols-outlined text-4xl text-[#cfe5ff] mb-3 block">forum</span>
                    <p className="text-sm text-[#707882] font-semibold">Chưa có tin nhắn nào</p>
                    <p className="text-xs text-[#707882] mt-1">Khi khách hàng nhắn tin cho shop, tin nhắn sẽ xuất hiện ở đây.</p>
                  </div>
                ) : (
                  conversations.map(conv => {
                    const isActive = currentConvId === conv.id;
                    const unread = conv.unread_count_seller || 0;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => setSearchParams({ convId: String(conv.id) })}
                        className={`px-5 py-4 flex items-center gap-4 cursor-pointer transition-all border-b border-[#f5faff] ${isActive ? 'bg-[#e0efff] border-l-4 border-l-[#00629d]' : 'hover:bg-[#f9fafc]'}`}
                      >
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#e0efff] to-[#cfe5ff] text-[#00629d] flex items-center justify-center font-bold text-sm flex-shrink-0 relative">
                          <span className="material-symbols-outlined text-xl">face</span>
                          {unread > 0 && (
                            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#d32f2f] text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                              {unread}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className={`text-sm truncate ${unread > 0 ? 'font-black text-[#0f1d25]' : 'font-bold text-[#404751]'}`}>
                              {conv.buyer_name || `Người mua #${conv.buyer_id}`}
                            </h4>
                            <span className="text-[10px] text-[#707882] font-medium flex-shrink-0 ml-2">
                              {new Date(conv.updated_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className={`text-xs truncate ${unread > 0 ? 'text-[#0f1d25] font-bold' : 'text-[#707882]'}`}>
                            {conv.last_message_preview || "Bắt đầu trò chuyện..."}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {!currentConvId ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-[#f9fafc]">
                  <div className="w-28 h-28 bg-[#e0efff] rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-5xl text-[#00629d]">support_agent</span>
                  </div>
                  <p className="font-black text-xl text-[#0f1d25] mb-2 font-['Plus_Jakarta_Sans']">Chăm sóc khách hàng</p>
                  <p className="text-sm text-[#707882] max-w-xs text-center">Chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu trả lời khách hàng</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="px-8 py-4 border-b border-[#e4e9f0] flex items-center justify-between bg-white">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e0efff] to-[#cfe5ff] text-[#00629d] flex items-center justify-center">
                        <span className="material-symbols-outlined">face</span>
                      </div>
                      <div>
                        <h3 className="font-black text-[#0f1d25]">{conversations.find(c => c.id === currentConvId)?.buyer_name || `Người mua #${conversations.find(c => c.id === currentConvId)?.buyer_id}`}</h3>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-[#2e7d32] rounded-full"></div>
                          <p className="text-[10px] text-[#2e7d32] font-bold uppercase tracking-widest">Đang hoạt động</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button className="w-9 h-9 rounded-lg text-[#707882] hover:bg-[#f0f3f8] hover:text-[#0f1d25] transition-colors flex items-center justify-center" title="Thông tin"><span className="material-symbols-outlined text-xl">info</span></button>
                      <button className="w-9 h-9 rounded-lg text-[#707882] hover:bg-[#f0f3f8] hover:text-[#0f1d25] transition-colors flex items-center justify-center" title="Thêm"><span className="material-symbols-outlined text-xl">more_vert</span></button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-8 bg-[#f9fafc] space-y-5">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-50">
                        <span className="material-symbols-outlined text-3xl text-[#cfe5ff] mb-3">waving_hand</span>
                        <p className="text-sm font-semibold text-[#707882]">Chào mừng khách hàng mới!</p>
                        <p className="text-xs text-[#707882]">Hãy gửi lời chào thân thiện nhé</p>
                      </div>
                    ) : (
                      messages.map(msg => {
                        const isMine = msg.sender_id === currentUser?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[65%]`}>
                              <div className={`px-4 py-2.5 text-[14px] leading-relaxed shadow-sm ${
                                isMine
                                  ? 'bg-[#00629d] text-white rounded-2xl rounded-br-sm'
                                  : 'bg-white text-[#0f1d25] border border-[#e4e9f0] rounded-2xl rounded-bl-sm'
                              }`}>
                                {msg.content}
                              </div>
                              <span className="text-[10px] text-[#707882] mt-1 px-1 font-medium">
                                {new Date(msg.sent_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-5 bg-white border-t border-[#e4e9f0]">
                    <form onSubmit={handleSendMessage} className="flex gap-3">
                      <button type="button" className="w-12 h-12 rounded-xl text-[#707882] hover:bg-[#f0f3f8] hover:text-[#00629d] transition-colors flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined">attach_file</span>
                      </button>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={chatText}
                          onChange={e => setChatText(e.target.value)}
                          placeholder="Nhập phản hồi cho khách hàng..."
                          className="w-full h-12 bg-[#f0f3f8] border-none rounded-xl px-5 pr-12 text-[#0f1d25] text-sm font-medium focus:ring-2 focus:ring-[#00629d]/20 outline-none"
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707882] hover:text-[#00629d]">
                          <span className="material-symbols-outlined text-xl">sentiment_satisfied</span>
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={!chatText.trim()}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${chatText.trim() ? 'bg-[#00629d] text-white hover:bg-[#004e7c] shadow-sm' : 'bg-[#e4e9f0] text-[#707882] cursor-not-allowed'}`}
                      >
                        <span className="material-symbols-outlined">send</span>
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </SellerLayout>
  );
};

export default SellerChat;
