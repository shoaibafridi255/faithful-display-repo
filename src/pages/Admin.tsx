import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Package, MessageCircle, BarChart3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProfileRow {
  id: string;
  full_name: string | null;
  company: string | null;
  location: string | null;
  created_at: string;
}

interface MaterialRow {
  id: string;
  title: string;
  category: string;
  status: string;
  user_id: string;
  created_at: string;
  location: string | null;
  price_type: string;
}

const Admin = () => {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, materials: 0, active: 0, conversations: 0 });
  const [users, setUsers] = useState<(ProfileRow & { role?: string })[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || role !== "admin")) {
      toast.error("Access denied — admin only");
      navigate("/");
    }
  }, [authLoading, user, role, navigate]);

  useEffect(() => {
    if (role !== "admin") return;
    const fetchData = async () => {
      setLoadingData(true);

      // Fetch profiles
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, company, location, created_at");
      // Fetch roles
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      const enrichedUsers = (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "unknown" }));
      setUsers(enrichedUsers);

      // Fetch materials
      const { data: mats } = await supabase.from("materials").select("id, title, category, status, user_id, created_at, location, price_type").order("created_at", { ascending: false });
      setMaterials(mats ?? []);

      // Fetch conversations count
      const { count: convCount } = await supabase.from("conversations").select("id", { count: "exact", head: true });

      setStats({
        users: enrichedUsers.length,
        materials: (mats ?? []).length,
        active: (mats ?? []).filter((m) => m.status === "active").length,
        conversations: convCount ?? 0,
      });

      setLoadingData(false);
    };
    fetchData();
  }, [role]);

  const handleDeleteMaterial = async (id: string) => {
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    setStats((s) => ({ ...s, materials: s.materials - 1 }));
    toast.success("Material deleted");
  };

  if (authLoading || role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground mb-8">Platform overview and management</p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Users", value: stats.users, icon: Users },
              { label: "Total Listings", value: stats.materials, icon: Package },
              { label: "Active Listings", value: stats.active, icon: BarChart3 },
              { label: "Conversations", value: stats.conversations, icon: MessageCircle },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="py-6 text-center">
                  <s.icon className="w-8 h-8 mx-auto text-primary mb-2" />
                  <p className="text-3xl font-bold text-foreground">{loadingData ? "…" : s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card>
                <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">Company</th>
                          <th className="py-2 px-3">Location</th>
                          <th className="py-2 px-3">Role</th>
                          <th className="py-2 px-3">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} className="border-b border-border/50">
                            <td className="py-2 px-3 text-foreground">{u.full_name || "—"}</td>
                            <td className="py-2 px-3">{u.company || "—"}</td>
                            <td className="py-2 px-3">{u.location || "—"}</td>
                            <td className="py-2 px-3"><Badge variant="secondary" className="capitalize">{u.role}</Badge></td>
                            <td className="py-2 px-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="materials">
              <Card>
                <CardHeader><CardTitle>All Materials</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="py-2 px-3">Title</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Price</th>
                          <th className="py-2 px-3">Location</th>
                          <th className="py-2 px-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materials.map((m) => (
                          <tr key={m.id} className="border-b border-border/50">
                            <td className="py-2 px-3 text-foreground">{m.title}</td>
                            <td className="py-2 px-3 capitalize">{m.category}</td>
                            <td className="py-2 px-3"><Badge variant={m.status === "active" ? "default" : "secondary"} className="capitalize">{m.status}</Badge></td>
                            <td className="py-2 px-3 capitalize">{m.price_type}</td>
                            <td className="py-2 px-3">{m.location || "—"}</td>
                            <td className="py-2 px-3">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete "{m.title}"?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteMaterial(m.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;