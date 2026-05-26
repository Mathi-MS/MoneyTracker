import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Trash2, Edit2, Hexagon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

export default function Categories() {
  const [search, setSearch] = useState("");
  const { data: categories, isLoading } = useListCategories({ search: search || undefined });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "spend",
    icon: "🛒",
    color: "#3b82f6"
  });

  const openNew = () => {
    setEditId(null);
    setFormData({ name: "", type: "spend", icon: "🛒", color: "#3b82f6" });
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setFormData({ name: c.name, type: c.type, icon: c.icon, color: c.color });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      updateCategory.mutate({ id: editId, data: formData as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries();
          toast({ title: "Category updated" });
          setDialogOpen(false);
        }
      });
    } else {
      createCategory.mutate({ data: formData as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries();
          toast({ title: "Category created" });
          setDialogOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete category?")) return;
    deleteCategory.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: "Category deleted" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-4 pb-20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
            <p className="text-sm text-muted-foreground">Manage transaction groups.</p>
          </div>
          <Button onClick={openNew} size="icon" className="rounded-full w-10 h-10 shadow-md">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search categories..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border/50 rounded-xl h-12"
          />
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
          ) : categories?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No categories found.</div>
          ) : (
            categories?.map((c: any, i: any) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50 hover:bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: `${c.color}20`, color: c.color }}>
                      {c.icon}
                    </div>
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{c.type}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(c)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}>
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
            <DialogTitle>{editId ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Name</label>
              <Input required value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="h-12 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Type</label>
                <Select value={formData.type} onValueChange={v => setFormData(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spend">Spend</SelectItem>
                    <SelectItem value="earn">Earn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Color</label>
                <div className="flex items-center gap-2">
                  <Input type="color" value={formData.color} onChange={e => setFormData(f => ({ ...f, color: e.target.value }))} className="h-12 w-12 p-1 rounded-xl cursor-pointer" />
                  <Input required value={formData.icon} onChange={e => setFormData(f => ({ ...f, icon: e.target.value }))} className="h-12 flex-1 rounded-xl text-center" placeholder="Icon" maxLength={2} />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending} className="w-full h-12 rounded-xl mt-4">
              {editId ? "Save Changes" : "Create Category"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}