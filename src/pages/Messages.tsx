import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface Conversation {
  id: string;
  material_id: string;
  seeker_id: string;
  lister_id: string;
  created_at: string;
  material_title?: string;
  other_name?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const Messages = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const activeConvId = params.get("c");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;
    const fetchConvs = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!data) return;

      // Enrich with material title and other party name
      const enriched = await Promise.all(
        data.map(async (c) => {
          const { data: mat } = await supabase.from("materials").select("title").eq("id", c.material_id).maybeSingle();
          const otherId = c.seeker_id === user.id ? c.lister_id : c.seeker_id;
          const { data: prof } = await supabase.from("profiles").select("full_name, company").eq("id", otherId).maybeSingle();
          return {
            ...c,
            material_title: mat?.title ?? "Unknown Material",
            other_name: prof?.company || prof?.full_name || "User",
          };
        })
      );
      setConversations(enriched);
    };
    fetchConvs();
  }, [user]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    const fetchMsgs = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvId)
        .order("created_at", { ascending: true });
      setMessages(data ?? []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };
    fetchMsgs();

    // Realtime subscription
    const channel = supabase
      .channel(`messages-${activeConvId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConvId]);

  const handleSend = async () => {
    if (!user || !activeConvId || !newMsg.trim()) return;
    setSending(true);
    await supabase.from("messages").insert({ conversation_id: activeConvId, sender_id: user.id, content: newMsg.trim() });
    setNewMsg("");
    setSending(false);
  };

  if (authLoading) return null;

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Messages</h1>
        <div className="grid md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-200px)]">
          {/* Conversation list */}
          <div className="border border-border rounded-xl overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/messages?c=${c.id}`)}
                  className={`w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors ${c.id === activeConvId ? "bg-muted" : ""}`}
                >
                  <p className="font-semibold text-foreground text-sm truncate">{c.other_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.material_title}</p>
                </button>
              ))
            )}
          </div>

          {/* Chat area */}
          <div className="border border-border rounded-xl flex flex-col">
            {activeConvId && activeConv ? (
              <>
                <div className="p-4 border-b border-border">
                  <p className="font-semibold text-foreground">{activeConv.other_name}</p>
                  <p className="text-xs text-muted-foreground">Re: {activeConv.material_title}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`max-w-[75%] ${m.sender_id === user?.id ? "ml-auto" : ""}`}
                    >
                      <div className={`rounded-2xl px-4 py-2 text-sm ${m.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                        {m.content}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 px-1">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </motion.div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="p-4 border-t border-border flex gap-2">
                  <Input
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    placeholder="Type a message…"
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  />
                  <Button variant="eco" onClick={handleSend} disabled={sending || !newMsg.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a conversation to start chatting
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Messages;