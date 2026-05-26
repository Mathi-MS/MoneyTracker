import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListPersons, useCreatePerson, useUpdatePerson, useDeletePerson } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Trash2, Edit2, User } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

export default function Persons() {
  const [search, setSearch] = useState("");
  const { data: persons, isLoading } = useListPersons({ search: search || undefined });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: ""
  });

  const openNew = () => {
    setEditId(null);
    setFormData({ name: "", phone: "", email: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditId(p.id);
    setFormData({ name: p.name, phone: p.phone || "", email: p.email || "", notes: p.notes || "" });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      updatePerson.mutate({ id: editId, data: formData }, {
        onSuccess: () => {
          queryClient.invalidateQueries();
          toast({ title: "Person updated" });
          setDialogOpen(false);
        }
      });
    } else {
      createPerson.mutate({ data: formData }, {
        onSuccess: () => {
          queryClient.invalidateQueries();
          toast({ title: "Person added" });
          setDialogOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete person?")) return;
    deletePerson.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: "Person deleted" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-4 pb-20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Persons</h1>
            <p className="text-sm text-muted-foreground">People you lend to or borrow from.</p>
          </div>
          <Button onClick={openNew} size="icon" className="rounded-full w-10 h-10 shadow-md">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search persons..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border/50 rounded-xl h-12"
          />
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : persons?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No persons found.</div>
          ) : (
              persons?.map((p: any, i: number) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50 hover:bg-secondary/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary/80 flex items-center justify-center text-primary border border-border">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{p.name}</div>
                      {(p.phone || p.email) && (
                        <div className="text-xs text-muted-foreground">{p.phone || p.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(p)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Person" : "Add Person"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Name</label>
              <Input required value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="h-12 rounded-xl" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Phone</label>
              <Input value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} className="h-12 rounded-xl" placeholder="+1 234 567 890" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Email</label>
              <Input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} className="h-12 rounded-xl" placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Notes</label>
              <Textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} className="rounded-xl resize-none" rows={2} />
            </div>
            <Button type="submit" disabled={createPerson.isPending || updatePerson.isPending} className="w-full h-12 rounded-xl mt-4">
              {editId ? "Save Changes" : "Add Person"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}